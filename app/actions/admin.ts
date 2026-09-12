"use server";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/server/authorization";
import { actionResult } from "@/lib/server/action-result";
import * as service from "@/lib/server/admin-service";
import * as invitations from "@/lib/server/invitations";
import { id } from "@/lib/validation/admin";

async function mutate(form: FormData, work: (actorId: string, input: Record<string, FormDataEntryValue>) => Promise<void>) {
  const actor = await requireAdmin();
  return actionResult(async () => {
    await work(actor.id, Object.fromEntries(form));
    revalidatePath("/admin", "layout");
    revalidatePath("/workspace");
    return { success: true, message: "Changes saved." };
  });
}
export async function createRestaurant(_: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return actionResult(async () => {
    const result = await service.createRestaurant(actor.id, Object.fromEntries(form));
    revalidatePath("/admin", "layout");
    return { success: true, message: result.delivered ? "Restaurant created and owner invitation sent." : "Restaurant created. Email delivery failed; configure Resend and retry the invitation from restaurant details.", redirectTo: `/admin/restaurants/${result.id}` };
  });
}
export async function updateRestaurant(_: ActionState, form: FormData) { return mutate(form, service.updateRestaurant); }
export async function changeRestaurantStatus(_: ActionState, form: FormData) { return mutate(form, service.changeRestaurantStatus); }
export async function transferOwnership(_: ActionState, form: FormData) { return mutate(form, service.transferOwnership); }
export async function updateMembership(_: ActionState, form: FormData) { return mutate(form, service.updateMembership); }
export async function updateUser(_: ActionState, form: FormData) { return mutate(form, service.updateUser); }
export async function changeUserStatus(_: ActionState, form: FormData) { return mutate(form, service.changeUserStatus); }
export async function revokeUserSessions(_: ActionState, form: FormData) { return mutate(form, (actorId, input) => service.revokeUserSessions(actorId, id.parse(input.userId))); }
export async function saveSettings(_: ActionState, form: FormData) { return mutate(form, service.saveSettings); }
export async function reviewAccessRequest(_: ActionState, form: FormData) { return mutate(form, service.reviewAccessRequest); }
export async function revokeInvitation(_: ActionState, form: FormData) { return mutate(form, (actorId, input) => invitations.revokeInvitation(actorId, id.parse(input.invitationId))); }
export async function inviteMember(_: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return actionResult(async () => {
    const delivered = await invitations.inviteMember(actor.id, Object.fromEntries(form));
    revalidatePath("/admin", "layout");
    return { success: true, message: delivered ? "Invitation sent." : "Invitation saved, but email delivery failed. Configure Resend and use Retry delivery." };
  });
}
export async function resendInvitation(_: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return actionResult(async () => {
    const delivered = await invitations.resendInvitation(actor.id, id.parse(form.get("invitationId")));
    revalidatePath("/admin", "layout");
    return { success: delivered, message: delivered ? "New invitation sent. The previous link is invalid." : "Delivery failed. Check Resend configuration before retrying." };
  });
}
