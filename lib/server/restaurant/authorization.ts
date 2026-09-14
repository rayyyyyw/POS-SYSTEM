import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { DomainError } from "@/lib/domain/policies";
import { id } from "@/lib/validation/admin";
import { requireUser } from "@/lib/server/authorization";
import { transaction } from "@/lib/server/transaction";
import { assertRestaurantAccess } from "./access";

// Only minimal identity/status is exposed here. Each operational service checks
// its own permission in the transaction that accesses the protected records.
export const getRestaurantContext = cache(async (restaurantId: string) => {
  const user = await requireUser();
  if (!id.safeParse(restaurantId).success) notFound();
  try {
    return await transaction((tx) =>
      assertRestaurantAccess(tx, user.id, restaurantId),
    );
  } catch (error) {
    if (error instanceof DomainError) notFound();
    throw error;
  }
});
