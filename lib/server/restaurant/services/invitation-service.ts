import "server-only";
import {
  restaurantInvitationInput,
  restaurantInvitationTarget,
} from "@/lib/validation/restaurant";
import { DomainError } from "@/lib/domain/policies";
import { transaction, audit } from "@/lib/server/transaction";
import { limitSubmission } from "@/lib/server/rate-limit";
import {
  deliverInvitation,
  newInvitationToken,
} from "@/lib/server/invitations";
import { assertRestaurantAccess } from "../access";

export async function inviteRestaurantMember(actorId: string, raw: unknown) {
  const input = restaurantInvitationInput.parse(raw);
  await authorizeDelivery(actorId, input.restaurantId);
  const secret = newInvitationToken();
  const invite = await transaction(async (tx) => {
    const { user } = await assertRestaurantAccess(
      tx,
      actorId,
      input.restaurantId,
      "teamWrite",
    );
    if (
      await tx.restaurantMembership.count({
        where: {
          restaurantId: input.restaurantId,
          user: { email: input.email },
        },
      })
    )
      throw new DomainError(
        "This person already has a membership. Manage their existing access instead.",
      );
    if (
      await tx.invitation.count({
        where: {
          restaurantId: input.restaurantId,
          email: input.email,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
      })
    )
      throw new DomainError(
        "A pending invitation already exists. Use resend or revoke it first.",
      );
    await tx.invitation.updateMany({
      where: {
        restaurantId: input.restaurantId,
        email: input.email,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });
    const created = await tx.invitation.create({
      data: {
        ...input,
        tokenHash: secret.tokenHash,
        expiresAt: secret.expiresAt,
        lastSentAt: new Date(),
      },
    });
    await audit(
      tx,
      user,
      "Restaurant member invited",
      `Invitation ${created.id}: ${input.role} access requested.`,
      input.restaurantId,
    );
    return created;
  });
  return deliverInvitation(invite.id, secret.token);
}

async function authorizeDelivery(actorId: string, restaurantId: string) {
  await transaction((tx) =>
    assertRestaurantAccess(tx, actorId, restaurantId, "teamWrite"),
  );
  await limitSubmission("restaurant-invite", actorId, 20, 300);
}

export async function resendRestaurantInvitation(
  actorId: string,
  raw: unknown,
) {
  const input = restaurantInvitationTarget.parse(raw);
  await authorizeDelivery(actorId, input.restaurantId);
  const secret = newInvitationToken();
  await transaction(async (tx) => {
    const { user } = await assertRestaurantAccess(
      tx,
      actorId,
      input.restaurantId,
      "teamWrite",
    );
    const invite = await tx.invitation.findFirst({
      where: { id: input.invitationId, restaurantId: input.restaurantId },
    });
    if (!invite || invite.status !== "PENDING" || invite.role === "OWNER")
      throw new DomainError("This invitation cannot be resent.");
    if (
      await tx.restaurantMembership.count({
        where: {
          restaurantId: input.restaurantId,
          user: { email: invite.email },
        },
      })
    )
      throw new DomainError("This person already has a membership.");
    if (invite.lastSentAt && Date.now() - invite.lastSentAt.getTime() < 60000)
      throw new DomainError("Wait one minute before resending.");
    await tx.invitation.update({
      where: { id: invite.id, restaurantId: input.restaurantId },
      data: {
        tokenHash: secret.tokenHash,
        expiresAt: secret.expiresAt,
        lastSentAt: new Date(),
        deliveryStatus: "PENDING",
      },
    });
    await audit(
      tx,
      user,
      "Restaurant invitation reissued",
      `Invitation ${invite.id}: previous link invalidated.`,
      input.restaurantId,
    );
  });
  return deliverInvitation(input.invitationId, secret.token);
}

export async function revokeRestaurantInvitation(
  actorId: string,
  raw: unknown,
) {
  const input = restaurantInvitationTarget.parse(raw);
  await transaction(async (tx) => {
    const { user } = await assertRestaurantAccess(
      tx,
      actorId,
      input.restaurantId,
      "teamWrite",
    );
    const changed = await tx.invitation.updateMany({
      where: {
        id: input.invitationId,
        restaurantId: input.restaurantId,
        status: "PENDING",
        role: { in: ["MANAGER", "CASHIER"] },
      },
      data: { status: "REVOKED" },
    });
    if (!changed.count)
      throw new DomainError("This invitation cannot be revoked.");
    await audit(
      tx,
      user,
      "Restaurant invitation revoked",
      `Invitation ${input.invitationId}: access was not granted.`,
      input.restaurantId,
    );
  });
}
