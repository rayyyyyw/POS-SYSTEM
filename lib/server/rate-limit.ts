import "server-only";
import { createHash } from "node:crypto";
import { transaction } from "./transaction";
import { DomainError } from "@/lib/domain/policies";
export async function limitSubmission(scope: string, identifier: string, max: number, seconds: number) {
  const key = createHash("sha256").update(`${scope}:${identifier}`).digest("hex");
  await transaction(async (tx) => {
    const now = new Date();
    const previous = await tx.submissionLimit.findUnique({ where: { key } });
    if (previous && previous.expiresAt > now && previous.count >= max) throw new DomainError("Too many attempts. Please wait before trying again.");
    await tx.submissionLimit.upsert({ where: { key }, create: { key, count: 1, expiresAt: new Date(now.getTime() + seconds * 1000) }, update:
      previous && previous.expiresAt > now ? { count: { increment: 1 } } : { count: 1, expiresAt: new Date(now.getTime() + seconds * 1000) } });
  });
}
