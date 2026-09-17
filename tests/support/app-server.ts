import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { createIsolatedDatabase } from "./database";

async function unusedPort() {
  const server = createServer();
  await new Promise<void>((resolveReady, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveReady); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
  return address.port;
}

export async function startIsolatedApp() {
  const fixture = await createIsolatedDatabase();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: fixture.url }, { schema: fixture.schema }) });
  let child: ReturnType<typeof spawn> | undefined;
  let exit: Promise<void> | undefined;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      child?.kill();
      await exit;
    } finally {
      await db.$disconnect();
      await fixture.cleanup();
    }
  };
  try {
    const port = await unusedPort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["--import", pathToFileURL(resolve("tests/support/mail-capture.mjs")).href, resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "--hostname", "127.0.0.1"], {
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
      env: { ...process.env, DATABASE_URL: fixture.url, APP_URL: origin, BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), RESEND_API_KEY: "disposable-test-key", RESEND_FROM_EMAIL: "QA <sender@example.test>", ADMIN_EMAIL: "admin@example.test", RESEND_TEST_EMAIL: "manual-test-only@example.test", EMAIL_FROM: "", POS_TEST_MAIL_CAPTURE: "1", NODE_ENV: "production" },
    });
    exit = new Promise<void>(resolveExit => { child!.once("exit", () => resolveExit()); child!.once("error", () => resolveExit()); });
    let output = "";
    const mailbox = await new Promise<string>((resolveReady, reject) => {
      const timeout = setTimeout(() => reject(new Error("QA server did not become ready. Run npm run build first.")), 30_000);
      const finish = (error?: Error) => { clearTimeout(timeout); if (error) reject(error); };
      child!.once("error", error => finish(error));
      child!.once("exit", () => finish(new Error("QA server exited before startup. Run npm run build and check local port availability.")));
      child!.stderr!.on("data", chunk => { output = (output + String(chunk)).slice(-16_000); });
      child!.stdout!.on("data", chunk => {
        output = (output + String(chunk)).slice(-16_000);
        const match = output.match(/POS_TEST_MAILBOX=(http:\/\/127\.0\.0\.1:\d+)/);
        if (match && output.includes("Ready in")) { finish(); resolveReady(match[1]); }
      });
    });
    return { origin, mailbox, db, close };
  } catch (error) {
    await close();
    throw error;
  }
}
