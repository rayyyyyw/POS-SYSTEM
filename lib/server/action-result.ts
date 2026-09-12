import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/domain/policies";
import type { ActionState } from "@/lib/action-state";
export async function actionResult(work: () => Promise<ActionState>): Promise<ActionState> {
  try { return await work(); }
  catch (error) {
    if (error instanceof z.ZodError) return { message: "Please check the highlighted fields.", errors: z.flattenError(error).fieldErrors as Record<string, string[]> };
    if (error instanceof DomainError) return { message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { message: "A matching record already exists. Check the slug or email, then reload before retrying." };
      if (error.code === "P2025") return { message: "This record no longer exists or has changed. Reload and try again." };
      if (error.code === "P2034") return { message: "Another change occurred at the same time. Reload and try again." };
    }
    // Never expose SQL, connection strings, stack traces, or account tokens.
    console.error("Operation failed", { type: error instanceof Error ? error.name : "UnknownError" });
    return { message: "The operation could not be completed. Please try again shortly." };
  }
}
