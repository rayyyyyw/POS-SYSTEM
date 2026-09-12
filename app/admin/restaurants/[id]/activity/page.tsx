import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeading, Panel } from "@/components/admin/page-ui";
import { ActivityList } from "@/components/admin/activity-list";
import { getRestaurant } from "@/lib/server/queries";

export const metadata: Metadata = { title: "Restaurant activity" };

export default async function RestaurantActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  if (!restaurant) notFound();
  return <><PageHeading title="Restaurant activity" description={`Recorded account and lifecycle changes for ${restaurant.name}.`} breadcrumbs={[{ label: "Restaurants", href: "/admin/restaurants" }, { label: restaurant.name, href: `/admin/restaurants/${id}` }, { label: "Activity" }]} actions={<Button asChild variant="outline"><Link href={`/admin/restaurants/${id}`}>Overview</Link></Button>} /><Panel title="Platform event history" description="Most recent recorded events, newest first."><ActivityList events={restaurant.activity} /></Panel></>;
}
