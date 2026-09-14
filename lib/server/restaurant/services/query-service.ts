import "server-only";
import { transaction } from "@/lib/server/transaction";
import { assertRestaurantAccess } from "../access";
import { readRestaurantHealth } from "./onboarding-service";
import { restaurantPageInput } from "@/lib/validation/restaurant";

// Actor IDs enter these server-only functions from requireUser(), never forms.
export async function readRestaurantOverview(
  actorId: string,
  restaurantId: string,
) {
  return transaction(async (tx) => {
    await assertRestaurantAccess(tx, actorId, restaurantId, "overview");
    return readRestaurantHealth(tx, restaurantId);
  });
}

export async function readRestaurantSettings(
  actorId: string,
  restaurantId: string,
) {
  return transaction(async (tx) => {
    await assertRestaurantAccess(tx, actorId, restaurantId, "settingsRead");
    const restaurant = await tx.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        city: true,
        email: true,
        phone: true,
        version: true,
        settings: {
          select: {
            addressLine1: true,
            addressLine2: true,
            postalCode: true,
            countryCode: true,
            timezone: true,
            currencyCode: true,
            locale: true,
            serviceMode: true,
            defaultOrderType: true,
            orderNumberPrefix: true,
            receiptHeader: true,
            receiptFooter: true,
          },
        },
      },
    });
    const platform = restaurant.settings
      ? null
      : await tx.platformSettings.findUnique({
          where: { id: "platform" },
          select: { timezone: true },
        });
    return {
      ...restaurant,
      defaultTimezone: platform?.timezone ?? "Asia/Manila",
    };
  });
}

export async function readRestaurantTeam(
  actorId: string,
  restaurantId: string,
  memberPage: unknown = 1,
  invitationPage: unknown = 1,
) {
  const page = restaurantPageInput.parse(memberPage),
    invitesPage = restaurantPageInput.parse(invitationPage),
    pageSize = 20;
  return transaction(async (tx) => {
    const context = await assertRestaurantAccess(
      tx,
      actorId,
      restaurantId,
      "teamRead",
    );
    const [members, total, invitations, invitationTotal] = await Promise.all([
      tx.restaurantMembership.findMany({
        where: { restaurantId },
        select: {
          id: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              name: true,
              email: true,
              status: true,
              emailVerified: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      tx.restaurantMembership.count({ where: { restaurantId } }),
      context.role === "OWNER"
        ? tx.invitation.findMany({
            where: { restaurantId, status: "PENDING" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              deliveryStatus: true,
              expiresAt: true,
              lastSentAt: true,
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: pageSize,
            skip: (invitesPage - 1) * pageSize,
          })
        : [],
      context.role === "OWNER"
        ? tx.invitation.count({ where: { restaurantId, status: "PENDING" } })
        : 0,
    ]);
    return {
      members: members.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      invitesPage,
      invitationTotal,
      invitations: invitations.map((i) => ({
        ...i,
        expiresAt: i.expiresAt.toISOString(),
        lastSentAt: i.lastSentAt?.toISOString() ?? null,
      })),
    };
  });
}
