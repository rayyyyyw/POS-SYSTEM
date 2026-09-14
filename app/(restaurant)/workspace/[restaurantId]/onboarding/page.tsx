import { getRestaurantContext } from "@/lib/server/restaurant/authorization";
import { getRestaurantOverview } from "@/lib/server/restaurant/queries";
import { canAccessRestaurant } from "@/lib/domain/restaurant/policies";
import {
  RestaurantAccessNotice,
  RestaurantHeading,
  RestaurantPanel,
} from "@/components/restaurant/page-ui";
import { OnboardingChecklist } from "@/components/restaurant/onboarding-checklist";

export const metadata = { title: "Onboarding" };
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const context = await getRestaurantContext(restaurantId);
  if (
    !canAccessRestaurant(context.role, context.restaurant.status, "onboarding")
  )
    return <RestaurantAccessNotice status={context.restaurant.status} />;
  const data = await getRestaurantOverview(restaurantId);
  return (
    <>
      <RestaurantHeading
        title="Set up your restaurant"
        description="Your checklist updates as you save details and bring your team on board."
      />
      <RestaurantPanel title="Account foundation">
        <OnboardingChecklist
          restaurantId={restaurantId}
          onboarding={data.onboarding}
        />
      </RestaurantPanel>
    </>
  );
}
