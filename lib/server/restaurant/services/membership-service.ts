import "server-only";
import { restaurantMembershipInput } from "@/lib/validation/restaurant";
import { assertOwnerMutation, DomainError } from "@/lib/domain/policies";
import { transaction, audit } from "@/lib/server/transaction";
import { assertRestaurantAccess } from "../access";

export async function updateRestaurantMembership(
  actorId: string,
  raw: unknown,
) {
  const input = restaurantMembershipInput.parse(raw);
  await transaction(async (tx) => {
    const { user } = await assertRestaurantAccess(
      tx,
      actorId,
      input.restaurantId,
      "teamWrite",
    );
    const member = await tx.restaurantMembership.findFirst({
      where: { id: input.membershipId, restaurantId: input.restaurantId },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        updatedAt: true,
        user: { select: { status: true, emailVerified: true } },
      },
    });
    if (!member) throw new DomainError("Team member not found.");
    assertOwnerMutation(member.role);
    if (
      input.status === "ACTIVE" &&
      (member.user.status !== "ACTIVE" || !member.user.emailVerified)
    )
      throw new DomainError(
        "This account must be active and verified before access can be enabled.",
      );
    const result = await tx.restaurantMembership.updateMany({
      where: {
        id: member.id,
        restaurantId: input.restaurantId,
        updatedAt: new Date(input.expectedUpdatedAt),
      },
      data: {
        role: input.role,
        status: input.status,
        updatedAt: new Date(
          Math.max(Date.now(), member.updatedAt.getTime() + 1),
        ),
      },
    });
    if (!result.count)
      throw new DomainError("This membership changed. Reload before saving.");
    await audit(
      tx,
      user,
      input.status === "DISABLED"
        ? "Restaurant membership disabled"
        : "Restaurant membership updated",
      `Membership ${member.id}: ${member.role}/${member.status} → ${input.role}/${input.status}.`,
      input.restaurantId,
      member.userId,
    );
  });
}
