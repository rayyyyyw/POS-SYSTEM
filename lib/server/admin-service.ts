import "server-only";
import { z } from "zod";
import { createRestaurantInput, updateRestaurantInput, lifecycleInput, settingsInput, id, name } from "@/lib/validation/admin";
import { assertTransition, assertOwnerMutation, DomainError } from "@/lib/domain/policies";
import { transaction, assertAdmin, audit } from "./transaction";
import { deliverInvitation, newInvitationToken } from "./invitations";

export async function createRestaurant(actorId: string, raw: unknown) {
  const input = createRestaurantInput.parse(raw);
  const secret = newInvitationToken();
  const created = await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const { ownerName, ownerEmail, requestId, ...business } = input;
    const restaurant = await tx.restaurant.create({ data: business });
    const invite = await tx.invitation.create({ data: { restaurantId: restaurant.id, email: ownerEmail, name: ownerName, role: "OWNER", tokenHash: secret.tokenHash, expiresAt: secret.expiresAt, lastSentAt: new Date() } });
    if (requestId) await tx.accessRequest.update({ where: { id: requestId, status: { not: "CLOSED" } }, data: { status: "CLOSED" } });
    await audit(tx, actor, "Restaurant created", "Pending restaurant created with an initial owner invitation.", restaurant.id);
    return { id: restaurant.id, invitationId: invite.id };
  });
  const delivered = await deliverInvitation(created.invitationId, secret.token);
  return { ...created, delivered };
}
export async function updateRestaurant(actorId: string, raw: unknown) {
  const { id: restaurantId, version, ...data } = updateRestaurantInput.parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const result = await tx.restaurant.updateMany({ where: { id: restaurantId, version }, data: { ...data, version: { increment: 1 } } });
    if (!result.count) throw new DomainError("This restaurant changed since you opened it. Reload before saving.");
    await audit(tx, actor, "Restaurant updated", "Business information updated.", restaurantId);
  });
}
export async function changeRestaurantStatus(actorId: string, raw: unknown) {
  const input = lifecycleInput.parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const restaurant = await tx.restaurant.findUniqueOrThrow({ where: { id: input.id } });
    if (restaurant.version !== input.version) throw new DomainError("This restaurant has changed. Reload before continuing.");
    assertTransition(restaurant.status, input.status);
    if (input.status === "ACTIVE" && !await tx.restaurantMembership.count({ where: { restaurantId: restaurant.id, role: "OWNER", status: "ACTIVE", user: { status: "ACTIVE", emailVerified: true } } })) throw new DomainError("An active, verified owner must accept their invitation before activation.");
    await tx.restaurant.update({ where: { id: restaurant.id }, data: { status: input.status, version: { increment: 1 } } });
    if (input.status === "ARCHIVED") await tx.invitation.updateMany({ where: { restaurantId: restaurant.id, status: "PENDING" }, data: { status: "REVOKED" } });
    await audit(tx, actor, `Restaurant ${input.status.toLowerCase()}`, input.reason, restaurant.id);
  });
}
export async function transferOwnership(actorId: string, raw: unknown) {
  const input = z.object({ restaurantId: id, userId: id }).parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const restaurant = await tx.restaurant.findUniqueOrThrow({ where: { id: input.restaurantId } });
    if (restaurant.status === "ARCHIVED") throw new DomainError("Restore the restaurant before transferring ownership.");
    const target = await tx.restaurantMembership.findUniqueOrThrow({ where: { restaurantId_userId: input }, include: { user: true } });
    if (target.status !== "ACTIVE" || target.user.status !== "ACTIVE" || !target.user.emailVerified) throw new DomainError("Choose an active, verified restaurant member.");
    if (target.role === "OWNER") throw new DomainError("This member already owns the restaurant.");
    await tx.restaurantMembership.updateMany({ where: { restaurantId: input.restaurantId, role: "OWNER" }, data: { role: "MANAGER" } });
    await tx.restaurantMembership.update({ where: { id: target.id }, data: { role: "OWNER" } });
    await tx.invitation.updateMany({ where: { restaurantId: input.restaurantId, role: "OWNER", status: "PENDING" }, data: { status: "REVOKED" } });
    await tx.restaurant.update({ where: { id: input.restaurantId }, data: { version: { increment: 1 } } });
    await audit(tx, actor, "Ownership transferred", "An existing verified member became the owner; the previous owner became a manager.", input.restaurantId, input.userId);
  });
}
export async function updateMembership(actorId: string, raw: unknown) {
  const input = z.object({ membershipId: id, role: z.enum(["MANAGER", "CASHIER"]), status: z.enum(["ACTIVE", "DISABLED"]) }).parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const membership = await tx.restaurantMembership.findUniqueOrThrow({ where: { id: input.membershipId } });
    assertOwnerMutation(membership.role);
    await tx.restaurantMembership.update({ where: { id: membership.id }, data: { role: input.role, status: input.status } });
    await audit(tx, actor, "Membership updated", `${input.role} membership set to ${input.status.toLowerCase()}.`, membership.restaurantId, membership.userId);
  });
}
export async function updateUser(actorId: string, raw: unknown) {
  const input = z.object({ userId: id, name }).parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    await tx.user.update({ where: { id: input.userId }, data: { name: input.name } });
    await audit(tx, actor, "Profile updated", "Display name updated. Login identity was not changed.", undefined, input.userId);
  });
}
export async function changeUserStatus(actorId: string, raw: unknown) {
  const input = z.object({ userId: id, status: z.enum(["ACTIVE", "DISABLED"]) }).parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    if (input.status === "DISABLED") {
      if (user.id === actor.id) throw new DomainError("You cannot disable your own administrator account.");
      if (user.platformRole === "ADMIN" && await tx.user.count({ where: { platformRole: "ADMIN", status: "ACTIVE" } }) <= 1) throw new DomainError("The last active administrator cannot be disabled.");
      if (await tx.restaurantMembership.count({ where: { userId: user.id, role: "OWNER", restaurant: { status: "ACTIVE" } } })) throw new DomainError("Transfer ownership or suspend the active restaurants before disabling this owner.");
      await tx.session.deleteMany({ where: { userId: user.id } });
    }
    await tx.user.update({ where: { id: user.id }, data: { status: input.status } });
    await audit(tx, actor, "Account status changed", `Global account access set to ${input.status.toLowerCase()}.`, undefined, user.id);
  });
}
export async function revokeUserSessions(actorId: string, userId: string) {
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    await tx.user.findUniqueOrThrow({ where: { id: id.parse(userId) } });
    await tx.session.deleteMany({ where: { userId } });
    await audit(tx, actor, "Sessions revoked", "All current sessions were revoked.", undefined, userId);
  });
}
export async function saveSettings(actorId: string, raw: unknown) {
  const { version, ...input } = settingsInput.parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const current = await tx.platformSettings.findUnique({ where: { id: "platform" } });
    if (current) {
      if (current.version !== version) throw new DomainError("Settings changed. Reload before saving.");
      await tx.platformSettings.update({ where: { id: "platform" }, data: { ...input, version: { increment: 1 } } });
    } else {
      if (version !== 0) throw new DomainError("Reload settings before saving.");
      await tx.platformSettings.create({ data: { id: "platform", ...input, version: 1 } });
    }
    await audit(tx, actor, "Platform settings updated", "Display settings and support contact updated.");
  });
}
export async function reviewAccessRequest(actorId: string, raw: unknown) {
  const input = z.object({ id, status: z.enum(["NEW", "REVIEWED", "CLOSED"]) }).parse(raw);
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    await tx.accessRequest.update({ where: { id: input.id }, data: { status: input.status } });
    await audit(tx, actor, "Early access reviewed", `Request marked ${input.status.toLowerCase()}.`);
  });
}
