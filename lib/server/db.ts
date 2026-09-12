import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { posDb?: PrismaClient };
export const db = globalDb.posDb ?? new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  }, { schema: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).searchParams.get("schema") ?? "public" : "public" }),
});
if (process.env.NODE_ENV !== "production") globalDb.posDb = db;
