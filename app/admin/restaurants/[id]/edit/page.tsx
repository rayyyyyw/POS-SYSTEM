import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/page-ui";
import { RestaurantForm } from "@/components/admin/restaurant-form";
import { getRestaurantList, restaurants } from "@/lib/mock-data/admin";

export const metadata: Metadata = { title: "Edit restaurant" };

export default async function EditRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = getRestaurantList().find((item) => item.id === id);
  if (!restaurant) notFound();
  return (
    <>
      <PageHeading
        title="Edit restaurant"
        description={`Review changes to ${restaurant.name}'s identity and owner information.`}
        breadcrumbs={[
          { label: "Restaurants", href: "/admin/restaurants" },
          {
            label: restaurant.name,
            href: `/admin/restaurants/${restaurant.id}`,
          },
          { label: "Edit" },
        ]}
      />
      <RestaurantForm
        restaurant={restaurant}
        reservedSlugs={restaurants.map((item) => item.slug)}
      />
    </>
  );
}
