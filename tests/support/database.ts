import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

export async function createIsolatedDatabase(): Promise<{
  url: string;
  schema: string;
  cleanup(): Promise<void>;
}> {
  config({ path: [".env.local", ".env"], quiet: true });
  assert.ok(process.env.DATABASE_URL, "Configure a development DATABASE_URL before running database tests.");
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "Database tests require a PostgreSQL connection URL.");
  const schema = `pos_test_${randomBytes(12).toString("hex")}`;
  const validateSchema = () => assert.match(schema, /^pos_test_[a-f0-9]{24}$/);
  validateSchema();
  url.searchParams.set("schema", schema);
  // Prisma uses schema for qualified queries; pg uses options for raw queries.
  // Omitting public prevents tests from falling back to application tables.
  url.searchParams.set("options", `-c search_path=${schema}`);
  const setup = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  let created = false;
  let closed = false;
  const cleanup = async () => {
    if (closed) return;
    try {
      if (created) {
        validateSchema();
        await setup.query("ROLLBACK");
        await setup.query(`DROP SCHEMA "${schema}" CASCADE`);
        created = false;
      }
    } finally {
      closed = true;
      await setup.end();
    }
  };

  try {
    const migrations = await Promise.all([
      "20260911054521_init",
      "20260912090000_platform_foundation",
    ].map(async (migration) => {
      const sql = await readFile(resolve("prisma", "migrations", migration, "migration.sql"), "utf8");
      assert.doesNotMatch(sql, /(?:"?public"?|"?pg_catalog"?)\s*\./i, "Test migrations must not target shared schemas.");
      assert.doesNotMatch(sql, /\b(?:SET\s+(?:LOCAL\s+)?search_path|CREATE\s+SCHEMA|ALTER\s+DATABASE|DROP\s+SCHEMA)\b/i, "Test migrations must remain in the isolated schema.");
      return sql;
    }));
    await setup.connect();
    await setup.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    const current = await setup.query<{ schema_name: string }>("SELECT current_schema() AS schema_name");
    assert.equal(current.rows[0]?.schema_name, schema);
    for (const sql of migrations) await setup.query(sql);
    return { url: url.toString(), schema, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
