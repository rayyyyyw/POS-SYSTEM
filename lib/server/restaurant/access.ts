import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/domain/policies";
import {
  canAccessRestaurant,
  type RestaurantPermission,
} from "@/lib/domain/restaurant/policies";

// actorId is supplied by the server session, never from form input. Recheck
// identity and membership inside the same transaction as protected data access.
export async function assertRestaurantAccess(
  tx: Prisma.TransactionClient,
  actorId: string,
  restaurantId: string,
  permission?: RestaurantPermission,
) {
  const actor = await tx.user.findUnique({
    where: { id: actorId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      emailVerified: true,
    },
  });
  const membership = await tx.restaurantMembership.findUnique({
    where: { restaurantId_userId: { restaurantId, userId: actorId } },
    select: {
      role: true,
      status: true,
      restaurant: {
        select: { id: true, name: true, status: true, version: true },
      },
    },
  });
  if (
    !actor ||
    actor.status !== "ACTIVE" ||
    !actor.emailVerified ||
    !membership ||
    membership.status !== "ACTIVE"
  ) {
    throw new DomainError("Restaurant access denied.");
  }
  if (
    permission &&
    !canAccessRestaurant(
      membership.role,
      membership.restaurant.status,
      permission,
    )
  ) {
    throw new DomainError(
      "This action is not available for your restaurant access.",
    );
  }
  return {
    user: { id: actor.id, name: actor.name, email: actor.email },
    role: membership.role,
    restaurant: membership.restaurant,
  };
}
