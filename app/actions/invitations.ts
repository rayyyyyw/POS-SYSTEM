"use server";
import type { ActionState } from "@/lib/action-state";
import { actionResult } from "@/lib/server/action-result";
import { acceptInvitation as accept } from "@/lib/server/invitations";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/server/authorization";
export async function acceptInvitation(_: ActionState, form: FormData) {
  return actionResult(async () => {
    const signedIn = await accept(Object.fromEntries(form), await currentUser());
    revalidatePath("/admin", "layout");
    revalidatePath("/workspace");
    return { success: true, message: signedIn ? "Invitation accepted. Your restaurant membership is ready." : "Your account and membership are ready. Sign in with your email and password.", redirectTo: signedIn ? "/workspace" : "/login" };
  });
}
