import { getRestaurantContext } from "@/lib/server/restaurant/authorization";
import { readRestaurantTeam } from "@/lib/server/restaurant/queries";
import { canAccessRestaurant } from "@/lib/domain/restaurant/policies";
import {
  RestaurantAccessNotice,
  RestaurantHeading,
} from "@/components/restaurant/page-ui";
import {
  InviteTeamMember,
  RestaurantTeamMembers,
  RestaurantTeamInvitations,
} from "@/components/restaurant/team/team-management";

export const metadata = { title: "Team" };
export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { restaurantId } = await params;
  const context = await getRestaurantContext(restaurantId);
  if (!canAccessRestaurant(context.role, context.restaurant.status, "teamRead"))
    return <RestaurantAccessNotice status={context.restaurant.status} />;
  const search = await searchParams;
  const team = await readRestaurantTeam(
    context.user.id,
    restaurantId,
    search.page,
    search.invitesPage,
  );
  const editable = canAccessRestaurant(
    context.role,
    context.restaurant.status,
    "teamWrite",
  );
  return (
    <>
      <RestaurantHeading
        title="Your team"
        description="Give each person the access they need for this restaurant."
      />
      {editable && <InviteTeamMember restaurantId={restaurantId} />}
      <RestaurantTeamMembers
        restaurantId={restaurantId}
        team={team}
        editable={editable}
      />
      {editable && (
        <RestaurantTeamInvitations restaurantId={restaurantId} team={team} />
      )}
    </>
  );
}
