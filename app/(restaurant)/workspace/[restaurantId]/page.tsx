import Link from "next/link";
import { ArrowRight, ClipboardCheck, Users, Settings2 } from "lucide-react";
import { getRestaurantContext } from "@/lib/server/restaurant/authorization";
import { getRestaurantOverview } from "@/lib/server/restaurant/queries";
import { canAccessRestaurant } from "@/lib/domain/restaurant/policies";
import {
  RestaurantAccessNotice,
  RestaurantHeading,
  RestaurantPanel,
} from "@/components/restaurant/page-ui";
import { Button } from "@/components/ui/button";

export default async function RestaurantOverview({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const context = await getRestaurantContext(restaurantId);
  if (!canAccessRestaurant(context.role, context.restaurant.status, "overview"))
    return <RestaurantAccessNotice status={context.restaurant.status} />;
  const data = await getRestaurantOverview(restaurantId);
  const root = `/workspace/${restaurantId}`;
  return (
    <>
      <RestaurantHeading
        title={`Welcome, ${context.user.name}`}
        description={`Your ${context.restaurant.name} account is ready for setup. Keep your restaurant details and team access in one place.`}
      />
      {context.restaurant.status === "PENDING" && (
        <p
          role="status"
          className="rounded-lg border bg-warning-muted p-4 text-sm leading-6 text-warning"
        >
          Your restaurant is awaiting activation. You can complete account setup
          while the platform administrator reviews it.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-3">
        <RestaurantPanel title="Account setup">
          <ClipboardCheck className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-3 text-3xl font-semibold">
            {data.onboarding.completed}
            <span className="text-lg font-normal text-muted-foreground">
              {" "}
              / {data.onboarding.total}
            </span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Foundation steps complete
          </p>
        </RestaurantPanel>
        <RestaurantPanel title="Active team">
          <Users className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-3 text-3xl font-semibold">{data.activeMembers}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Verified accounts with active membership
          </p>
        </RestaurantPanel>
        <RestaurantPanel title="Regional settings">
          <Settings2 className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold">
            {data.settingsComplete ? "Configured" : "Needs setup"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Currency and timezone
          </p>
        </RestaurantPanel>
      </div>
      <RestaurantPanel
        title={
          context.role === "OWNER"
            ? "Make this workspace yours"
            : "Your restaurant account"
        }
        description={
          context.role === "OWNER"
            ? "Start with your business details, then invite the people who will run service with you."
            : "Your owner manages settings and access. Your role determines which tools are available."
        }
      >
        <div className="flex flex-wrap gap-3">
          {canAccessRestaurant(
            context.role,
            context.restaurant.status,
            "onboarding",
          ) && (
            <Button asChild>
              <Link href={`${root}/onboarding`}>
                View onboarding <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
          {canAccessRestaurant(
            context.role,
            context.restaurant.status,
            "teamRead",
          ) && (
            <Button asChild variant="outline">
              <Link href={`${root}/team`}>View team</Link>
            </Button>
          )}
          {canAccessRestaurant(
            context.role,
            context.restaurant.status,
            "settingsRead",
          ) && (
            <Button asChild variant="outline">
              <Link href={`${root}/settings`}>Restaurant settings</Link>
            </Button>
          )}
        </div>
      </RestaurantPanel>
      <div className="rounded-xl border border-dashed p-6">
        <h2 className="font-semibold">Service tools are coming next</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Menus, orders, kitchen tickets, payments, and inventory will appear
          here when those features are available. Your account setup and team
          access are available now.
        </p>
      </div>
    </>
  );
}
