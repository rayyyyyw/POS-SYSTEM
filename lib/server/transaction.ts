import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { DomainError } from "@/lib/domain/policies";
export async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: "Serializable", timeout: 10000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new DomainError("Another change is in progress. Please try again.");
}
export async function assertAdmin(tx: Prisma.TransactionClient, actorId: string) {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, name: true, status: true, platformRole: true } });
  if (!actor || actor.status !== "ACTIVE" || actor.platformRole !== "ADMIN") throw new DomainError("Administrator access is required.");
  return actor;
}
export async function audit(tx: Prisma.TransactionClient, actor: { id: string; name: string }, title: string, detail: string, restaurantId?: string, userId?: string) {
  await tx.auditEvent.create({ data: { actorId: actor.id, actor: actor.name, title, detail, restaurantId, userId } });
}
