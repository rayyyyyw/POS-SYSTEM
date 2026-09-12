import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/page-ui";
import { RestaurantForm } from "@/components/admin/restaurant-form";
import { getRestaurant } from "@/lib/server/queries";

export const metadata: Metadata = { title: "Edit restaurant" };

export default async function EditRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  if (!restaurant) notFound();
  return <><PageHeading title="Edit restaurant" description={`Update ${restaurant.name}'s business information.`} breadcrumbs={[{ label: "Restaurants", href: "/admin/restaurants" }, { label: restaurant.name, href: `/admin/restaurants/${id}` }, { label: "Edit" }]} /><RestaurantForm restaurant={restaurant} /></>;
}
