import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { buildOnboarding } from "@/lib/domain/restaurant/policies";

// Internal aggregation: callers must authorize the tenant or platform admin
// within this transaction before invoking it. No identity or settings DTO leaks.
export async function readRestaurantHealth(
  tx: Prisma.TransactionClient,
  restaurantId: string,
) {
  const restaurant = await tx.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: {
      name: true,
      city: true,
      email: true,
      phone: true,
      status: true,
      settings: {
        select: {
          addressLine1: true,
          countryCode: true,
          currencyCode: true,
          timezone: true,
        },
      },
    },
  });
  const activeWhere = {
    restaurantId,
    status: "ACTIVE",
    user: { status: "ACTIVE", emailVerified: true },
  } as const;
  const now = new Date();
  const [
    activeMembers,
    owners,
    staff,
    pendingInvitations,
    sentStaffInvites,
    lastActivity,
  ] = await Promise.all([
    tx.restaurantMembership.count({ where: activeWhere }),
    tx.restaurantMembership.count({ where: { ...activeWhere, role: "OWNER" } }),
    tx.restaurantMembership.count({
      where: { ...activeWhere, role: { in: ["MANAGER", "CASHIER"] } },
    }),
    tx.invitation.count({
      where: { restaurantId, status: "PENDING", expiresAt: { gt: now } },
    }),
    tx.invitation.count({
      where: {
        restaurantId,
        status: "PENDING",
        expiresAt: { gt: now },
        deliveryStatus: "SENT",
        role: { in: ["MANAGER", "CASHIER"] },
      },
    }),
    tx.auditEvent.findFirst({
      where: {
        restaurantId,
        title: {
          in: [
            "Restaurant settings updated",
            "Restaurant setup started",
            "Restaurant member invited",
            "Restaurant invitation reissued",
            "Restaurant invitation revoked",
            "Restaurant membership updated",
            "Restaurant membership disabled",
            "Invitation accepted",
          ],
        },
      },
      select: { occurredAt: true },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    }),
  ]);
  const profileComplete = Boolean(
    restaurant.name &&
    restaurant.city &&
    (restaurant.email || restaurant.phone) &&
    restaurant.settings?.addressLine1 &&
    restaurant.settings.countryCode,
  );
  const settingsComplete = Boolean(
    restaurant.settings?.currencyCode && restaurant.settings.timezone,
  );
  return {
    activeMembers,
    pendingInvitations,
    ownerPresent: owners > 0,
    profileComplete,
    settingsComplete,
    lastActivityAt: lastActivity?.occurredAt.toISOString() ?? null,
    onboarding: buildOnboarding({
      status: restaurant.status,
      profileComplete,
      settingsComplete,
      ownerPresent: owners > 0,
      staffPresent: staff > 0 || sentStaffInvites > 0,
    }),
  };
}
