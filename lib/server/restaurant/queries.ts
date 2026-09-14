import "server-only";
import { cache } from "react";
import { requireAdmin, requireUser } from "@/lib/server/authorization";
import { transaction, assertAdmin } from "@/lib/server/transaction";
import { readRestaurantOverview } from "./services/query-service";
import { readRestaurantHealth } from "./services/onboarding-service";

export {
  readRestaurantSettings,
  readRestaurantTeam,
} from "./services/query-service";

export const getRestaurantOverview = cache(async (restaurantId: string) => {
  const user = await requireUser();
  return readRestaurantOverview(user.id, restaurantId);
});

export async function getAdminRestaurantHealth(restaurantId: string) {
  const actor = await requireAdmin();
  return transaction(async (tx) => {
    await assertAdmin(tx, actor.id);
    return readRestaurantHealth(tx, restaurantId);
  });
}
