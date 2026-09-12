// Disposable browser QA server. Never seeds the application's normal schema.
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { createIsolatedDatabase } from "./support/database";

async function main() {
  const fixture = await createIsolatedDatabase();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: fixture.url }, { schema: fixture.schema }) });
  let child: ReturnType<typeof spawn> | undefined;
  try {
    const password = "Disposable-QA-only-2026";
    const hash = await hashPassword(password);
    for (const [email, name, platformRole] of [["qa-admin@example.test", "QA Administrator", "ADMIN"], ["qa-owner@example.test", "QA Owner", "NONE"]] as const) {
      const id = randomUUID();
      await db.user.create({ data: { id, name, email, platformRole, emailVerified: true,
        accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hash } } } });
    }
    const owner = await db.user.findUniqueOrThrow({ where: { email: "qa-owner@example.test" } });
    await db.restaurant.create({ data: { name: "Browser Test Kitchen", slug: "browser-test-kitchen", city: "Test City", status: "ACTIVE", memberships: { create: { userId: owner.id, role: "OWNER" } } } });
    console.log("Disposable QA only: http://127.0.0.1:3100\nAdmin: qa-admin@example.test\nOwner: qa-owner@example.test\nPassword for these temporary fixtures: " + password);
    child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "-p", "3100", "--hostname", "127.0.0.1"], {
      stdio: "inherit", windowsHide: true,
      env: { ...process.env, DATABASE_URL: fixture.url, BETTER_AUTH_URL: "http://127.0.0.1:3100", BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), RESEND_API_KEY: "", EMAIL_FROM: "", NODE_ENV: "production" },
    });
    const stop = () => { child?.kill(); };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    // A textual stop command supports clean shutdown from non-interactive runners.
    process.stdin.on("data", chunk => { if (String(chunk).trim() === "stop") stop(); });
    await new Promise<void>((resolveExit, reject) => {
      child!.once("error", reject);
      child!.once("exit", code => { if (code && code !== 1) process.exitCode = code; resolveExit(); });
    });
    process.stdin.pause();
  } finally {
    child?.kill();
    await db.$disconnect();
    await fixture.cleanup();
    console.log("Disposable QA schema removed.");
  }
}
main().catch(() => { console.error("Browser fixture failed; check development database access and whether port 3100 is free."); process.exitCode = 1; });
