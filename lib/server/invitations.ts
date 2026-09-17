import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "./db";
import { transaction, assertAdmin, audit } from "./transaction";
import { sendEmail } from "./email";
import { accountEmailUrl, EmailDeliveryError } from "./email-config";
import { invitationEmail } from "./email-templates";
import { assertInvitation, DomainError } from "@/lib/domain/policies";
import { invitationInput } from "@/lib/validation/admin";
import { limitSubmission } from "./rate-limit";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function newInvitationToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) };
}
export type DeliveryFailureReporter = (failure: EmailDeliveryError) => void;
export async function deliverInvitation(invitationId: string, token: string, onFailure?: DeliveryFailureReporter) {
  try {
    const invite = await db.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: { restaurant: { select: { name: true, status: true } } } });
    // A rotated/revoked/consumed link must not be submitted by a stale caller.
    if (invite.tokenHash !== tokenHash(token) || invite.status !== "PENDING" || invite.expiresAt <= new Date() || ["ARCHIVED", "SUSPENDED"].includes(invite.restaurant.status)) return false;
    const url = accountEmailUrl("/accept-invitation");
    url.searchParams.set("token", token);
    await sendEmail(invite.email, invitationEmail({ restaurantName: invite.restaurant.name, email: invite.email, owner: invite.role === "OWNER", expiresAt: invite.expiresAt, url: url.toString() }), `invite-${invite.id}-${invite.tokenHash}`);
    // Legacy SENT means provider acceptance, not confirmed inbox delivery.
    await db.invitation.updateMany({ where: { id: invitationId, tokenHash: tokenHash(token), status: "PENDING" }, data: { deliveryStatus: "SENT" } });
    return true;
  } catch (error) {
    const failure = error instanceof EmailDeliveryError ? error : new EmailDeliveryError("uncertain");
    console.error("Invitation email submission failed:", failure.code);
    await db.invitation.updateMany({ where: { id: invitationId, tokenHash: tokenHash(token), status: "PENDING" }, data: { deliveryStatus: "FAILED" } })
      .catch(() => { console.error("Invitation submission status could not be saved; the committed invitation remains recoverable."); });
    onFailure?.(failure);
    return false;
  }
}
export async function inviteMember(actorId: string, raw: unknown, onFailure?: DeliveryFailureReporter) {
  const input = invitationInput.parse(raw);
  await limitSubmission("invite", actorId, 20, 300);
  const secret = newInvitationToken();
  const invitation = await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const restaurant = await tx.restaurant.findUniqueOrThrow({ where: { id: input.restaurantId } });
    if (["ARCHIVED", "SUSPENDED"].includes(restaurant.status)) throw new DomainError("Restore or reactivate this restaurant before inviting members.");
    if (input.role === "OWNER" && (restaurant.status !== "PENDING" || await tx.restaurantMembership.count({ where: { restaurantId: restaurant.id, role: "OWNER" } }))) throw new DomainError("Use ownership transfer for a restaurant that already has an owner.");
    if (await tx.restaurantMembership.count({ where: { restaurantId: restaurant.id, user: { email: input.email } } })) throw new DomainError("This user already has a membership. Manage their existing access instead.");
    await tx.invitation.updateMany({ where: { restaurantId: restaurant.id, status: "PENDING", ...(input.role === "OWNER" ? { role: "OWNER" } : { email: input.email }) }, data: { status: "REVOKED" } });
    const created = await tx.invitation.create({ data: { ...input, name: input.email, tokenHash: secret.tokenHash, expiresAt: secret.expiresAt, lastSentAt: new Date() } });
    await audit(tx, actor, "Member invited", `${input.role} invitation created.`, restaurant.id);
    return created;
  });
  return deliverInvitation(invitation.id, secret.token, onFailure);
}
export async function resendInvitation(actorId: string, invitationId: string, onFailure?: DeliveryFailureReporter) {
  await limitSubmission("invite", actorId, 20, 300);
  const secret = newInvitationToken();
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const invite = await tx.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: { restaurant: true } });
    if (invite.status !== "PENDING" || ["ARCHIVED", "SUSPENDED"].includes(invite.restaurant.status)) throw new DomainError("This invitation cannot be resent.");
    if (await tx.restaurantMembership.count({ where: { restaurantId: invite.restaurantId, OR: [{ user: { email: invite.email } }, ...(invite.role === "OWNER" ? [{ role: "OWNER" as const }] : [])] } })) throw new DomainError("This invitation is no longer eligible. Review existing restaurant memberships.");
    if (invite.lastSentAt && Date.now() - invite.lastSentAt.getTime() < 60000) throw new DomainError("Wait one minute before resending.");
    await tx.invitation.update({ where: { id: invite.id }, data: { tokenHash: secret.tokenHash, expiresAt: secret.expiresAt, deliveryStatus: "PENDING", lastSentAt: new Date() } });
    await audit(tx, actor, "Invitation reissued", "The previous invitation link is no longer valid.", invite.restaurantId);
  });
  return deliverInvitation(invitationId, secret.token, onFailure);
}
export async function revokeInvitation(actorId: string, invitationId: string) {
  await transaction(async (tx) => {
    const actor = await assertAdmin(tx, actorId);
    const invite = await tx.invitation.findUniqueOrThrow({ where: { id: invitationId } });
    if (invite.status !== "PENDING") throw new DomainError("Only pending invitations can be revoked.");
    await tx.invitation.update({ where: { id: invite.id }, data: { status: "REVOKED" } });
    await audit(tx, actor, "Invitation revoked", "Access was not granted.", invite.restaurantId);
  });
}
// Identity is supplied only by the authenticated server action, never by form input.
export async function acceptInvitation(raw: unknown, signedIn: { id: string } | null) {
  const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), name: z.string().trim().max(100).optional(), password: z.string().max(128).optional() }).parse(raw);
  await limitSubmission("accept-global", "all", 200, 60);
  const existingInvite = await db.invitation.findUnique({ where: { tokenHash: tokenHash(input.token) } });
  assertInvitation(existingInvite);
  await limitSubmission("accept", existingInvite!.id, 5, 300);
  const existing = await db.user.findUnique({ where: { email: existingInvite!.email }, select: { id: true } });
  if (existing && signedIn?.id !== existing.id) throw new DomainError("Sign in with the invited email address before accepting this invitation.");
  if (!existing && signedIn) throw new DomainError("Sign out before creating the invited account.");
  const account = existing ? undefined : z.object({ password: z.string().min(12).max(128), name: z.string().trim().min(2).max(100) }).parse(input);
  const password = account ? await hashPassword(account.password) : undefined;
  const displayName = account?.name;
  await transaction(async (tx) => {
    const invite = await tx.invitation.findUniqueOrThrow({ where: { tokenHash: tokenHash(input.token) }, include: { restaurant: true } });
    assertInvitation(invite);
    if (invite.restaurant.status === "ARCHIVED" || invite.restaurant.status === "SUSPENDED") throw new DomainError("This restaurant is currently unavailable.");
    let user = await tx.user.findUnique({ where: { email: invite.email } });
    if (user) {
      if (user.id !== signedIn?.id || user.status !== "ACTIVE" || !user.emailVerified) throw new DomainError("Sign in with the invited email address to continue.");
    } else {
      if (!password || !displayName) throw new DomainError("Please complete your account details.");
      const userId = randomUUID();
      user = await tx.user.create({ data: { id: userId, email: invite.email, name: displayName, emailVerified: true,
        accounts: { create: { id: randomUUID(), providerId: "credential", accountId: userId, password } } } });
    }
    if (invite.role === "OWNER" && await tx.restaurantMembership.count({ where: { restaurantId: invite.restaurantId, role: "OWNER" } })) throw new DomainError("An owner has already been assigned. Ask for a new invitation.");
    if (await tx.restaurantMembership.count({ where: { restaurantId: invite.restaurantId, userId: user.id } })) throw new DomainError("You already have access. Ask an administrator to review your membership.");
    await tx.restaurantMembership.create({ data: { restaurantId: invite.restaurantId, userId: user.id, role: invite.role } });
    await tx.invitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    await audit(tx, user, "Invitation accepted", `${invite.role} membership established.`, invite.restaurantId, user.id);
  });
  return Boolean(signedIn);
}
