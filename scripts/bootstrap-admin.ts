import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { z } from "zod";

dotenv.config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdout.isTTY) });
  let input;
  try {
    const name = await prompt.question("Administrator full name: ");
    const email = await prompt.question("Administrator email: ");
    process.stdout.write("Password (12–128 characters; input hidden): ");
    muted = true;
    const password = await prompt.question("");
    muted = false;
    process.stdout.write("\n");
    input = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(12).max(128) }).parse({ name, email, password });
  } finally { muted = false; prompt.close(); }
  const databaseUrl = new URL(process.env.DATABASE_URL);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl.toString() }, { schema: databaseUrl.searchParams.get("schema") ?? "public" }) });
  try {
    const password = await hashPassword(input.password);
    await db.$transaction(async tx => {
      // Serializes concurrent first-admin setup without changing existing accounts.
      const lock = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(19092026) AS locked
      `;
      if (lock[0]?.locked !== true) {
        throw new Error("Administrator setup is already running. Try again shortly.");
      }
      if (await tx.user.count({ where: { platformRole: "ADMIN" } })) throw new Error("An administrator already exists. Bootstrap will not create or overwrite another.");
      const id = randomUUID();
      await tx.user.create({ data: { id, name: input.name, email: input.email, platformRole: "ADMIN", emailVerified: true,
        accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password } } } });
      await tx.auditEvent.create({ data: { actorId: id, actor: input.name, userId: id, title: "Platform administrator established", detail: "First administrator created through local operator bootstrap." } });
    });
    console.log("Administrator created. You can now sign in at /login.");
  } finally { await db.$disconnect(); }
}
main().catch(error => {
  const message =
    error instanceof z.ZodError
      ? "Invalid input. Use a valid email and a password between 12 and 128 characters."
      : error instanceof Error &&
          (error.message.startsWith("An administrator") ||
            error.message.startsWith("Administrator setup"))
        ? error.message
        : error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ? "That email is already registered. Use a different email or recover the existing account."
          : error instanceof Prisma.PrismaClientInitializationError
            ? "Could not connect to PostgreSQL. Check DATABASE_URL and confirm the database server is running."
            : "Bootstrap failed during account creation. Run npm run db:status, then try again.";
  console.error(message);
  process.exitCode = 1;
});
