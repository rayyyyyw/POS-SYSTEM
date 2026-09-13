"use server";
import type { ActionState } from "@/lib/action-state";
import { actionResult } from "@/lib/server/action-result";
import { accessInput } from "@/lib/validation/admin";
import { db } from "@/lib/server/db";
import { limitSubmission } from "@/lib/server/rate-limit";
export async function requestAccess(_: ActionState, form: FormData) {
  return actionResult(async () => {
    const { consent, website, ...data } = accessInput.parse(Object.fromEntries(form));
    void consent; void website;
    // A fixed global cap also bounds abuse where clients rotate email/IP identifiers.
    await limitSubmission("early-access", "global", 100, 3600);
    await limitSubmission("early-access", data.email, 3, 3600);
    // Existing requests remain intact: public submissions cannot overwrite admin-reviewed data.
    // INSERT ... ON CONFLICT DO NOTHING also handles simultaneous first requests.
    await db.accessRequest.createMany({ data: [data], skipDuplicates: true });
    return { success: true, message: "Your request is recorded. We'll contact you when onboarding is available." };
  });
}
