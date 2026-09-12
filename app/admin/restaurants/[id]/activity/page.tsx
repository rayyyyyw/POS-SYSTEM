import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityList } from "@/components/admin/activity-list";
import { PageHeading, Panel } from "@/components/admin/page-ui";
import { getRestaurant, getRestaurantActivity } from "@/lib/mock-data/admin";

export const metadata: Metadata = { title: "Restaurant activity" };

export default async function RestaurantActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = getRestaurant(id);
  if (!restaurant) notFound();
  const events = getRestaurantActivity(id);
  return (
    <>
      <PageHeading
        title="Restaurant activity"
        description={`Registration, owner assignments, and lifecycle changes for ${restaurant.name}.`}
        breadcrumbs={[
          { label: "Restaurants", href: "/admin/restaurants" },
          { label: restaurant.name, href: `/admin/restaurants/${id}` },
          { label: "Activity" },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/restaurants/${id}`}>
              <ArrowLeft aria-hidden="true" />
              Overview
            </Link>
          </Button>
        }
      />
      <Panel
        title="Platform event history"
        description={`${events.length} sample events · newest first · Asia/Manila`}
      >
        <ActivityList events={events} />
      </Panel>
      <p className="text-xs text-muted-foreground">
        This timeline is illustrative. It is not a live or persistent audit log.
      </p>
    </>
  );
}
