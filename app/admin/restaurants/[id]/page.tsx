import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowUpRight, History, Pause, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityList } from "@/components/admin/activity-list";
import {
  DetailList,
  IdentityMark,
  PageHeading,
  Panel,
  StatusBadge,
} from "@/components/admin/page-ui";
import {
  getRestaurant,
  getRestaurantActivity,
  getUser,
} from "@/lib/mock-data/admin";
import { formatDate } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Restaurant details" };

export default async function RestaurantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = getRestaurant(id);
  if (!restaurant) notFound();
  const owner = getUser(restaurant.ownerId)!;
  const base = `/admin/restaurants/${restaurant.id}`;
  return (
    <>
      <PageHeading
        title={restaurant.name}
        description={`${restaurant.city} · Restaurant account overview`}
        breadcrumbs={[
          { label: "Restaurants", href: "/admin/restaurants" },
          { label: restaurant.name },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`${base}/activity`}>
                <History aria-hidden="true" />
                View activity
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${base}/edit`}>
                <Pencil aria-hidden="true" />
                Edit restaurant
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <Panel title="Restaurant overview">
            <div className="mb-6 flex items-center gap-4">
              <IdentityMark name={restaurant.name} large />
              <div>
                <p className="font-semibold">{restaurant.name}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {restaurant.slug}
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={restaurant.status} />
              </div>
            </div>
            <DetailList
              items={[
                {
                  label: "Restaurant ID",
                  value: (
                    <span className="font-mono text-xs">{restaurant.id}</span>
                  ),
                },
                { label: "Contact email", value: restaurant.email },
                { label: "Contact phone", value: restaurant.phone },
                { label: "City", value: restaurant.city },
                {
                  label: "Registered",
                  value: formatDate(restaurant.createdAt),
                },
              ]}
            />
          </Panel>
          <Panel
            title="Recent platform activity"
            description="Sample lifecycle and account events."
            action={
              <Link
                href={`${base}/activity`}
                className="rounded text-xs text-primary hover:underline"
              >
                View all
              </Link>
            }
          >
            <ActivityList events={getRestaurantActivity(id).slice(0, 3)} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel
            title="Restaurant owner"
            description="The individual user responsible for this restaurant."
          >
            <div className="mb-5 flex items-center gap-3">
              <IdentityMark name={owner.name} />
              <div>
                <p className="text-sm font-medium">{owner.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Restaurant owner
                </p>
              </div>
            </div>
            <DetailList
              items={[
                { label: "Email", value: owner.email },
                {
                  label: "User status",
                  value: <StatusBadge status={owner.status} />,
                },
              ]}
            />
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href={`/admin/users/${owner.id}`}>
                View owner profile
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </Panel>
          <Panel
            title="Account lifecycle"
            description="Platform-level actions only."
          >
            <div className="space-y-2">
              <Button
                variant="outline"
                disabled
                className="w-full justify-start"
              >
                <Pause aria-hidden="true" />
                Suspend restaurant
              </Button>
              <Button
                variant="outline"
                disabled
                className="w-full justify-start text-destructive"
              >
                <Archive aria-hidden="true" />
                Archive restaurant
              </Button>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Lifecycle actions are unavailable in this preview. No access or
              account status will be changed.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
