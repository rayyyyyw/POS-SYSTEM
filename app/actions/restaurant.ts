"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/server/authorization";
import { actionResult } from "@/lib/server/action-result";
import { id } from "@/lib/validation/admin";
import { saveRestaurantSettings } from "@/lib/server/restaurant/services/settings-service";
import { updateRestaurantMembership } from "@/lib/server/restaurant/services/membership-service";
import {
  inviteRestaurantMember,
  resendRestaurantInvitation,
  revokeRestaurantInvitation,
} from "@/lib/server/restaurant/services/invitation-service";

async function mutate(
  form: FormData,
  work: (actorId: string, input: unknown) => Promise<void | boolean>,
  message: string,
) {
  const user = await requireUser();
  return actionResult(async () => {
    const restaurantId = id.parse(form.get("restaurantId"));
    const delivered = await work(user.id, Object.fromEntries(form));
    revalidatePath(`/workspace/${restaurantId}`, "layout");
    revalidatePath("/workspace");
    revalidatePath(`/admin/restaurants/${restaurantId}`);
    revalidatePath(`/admin/restaurants/${restaurantId}/activity`);
    revalidatePath("/admin/restaurants");
    return {
      success: true,
      message:
        delivered === false
          ? "Invitation saved, but email submission could not be confirmed. Ask the platform administrator to check Resend configuration and logs, then retry after one minute."
          : message,
    };
  });
}
export async function saveSettings(_: ActionState, form: FormData) {
  return mutate(form, saveRestaurantSettings, "Restaurant settings saved.");
}
export async function updateMembership(_: ActionState, form: FormData) {
  return mutate(form, updateRestaurantMembership, "Team access updated.");
}
export async function inviteMember(_: ActionState, form: FormData) {
  return mutate(form, inviteRestaurantMember, "Invitation email submitted.");
}
export async function resendInvitation(_: ActionState, form: FormData) {
  return mutate(
    form,
    resendRestaurantInvitation,
    "New invitation email submitted. The previous link is invalid.",
  );
}
export async function revokeInvitation(_: ActionState, form: FormData) {
  return mutate(form, revokeRestaurantInvitation, "Invitation revoked.");
}
