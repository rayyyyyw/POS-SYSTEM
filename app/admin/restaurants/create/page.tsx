import type { Metadata } from "next";
import { PageHeading } from "@/components/admin/page-ui";
import { RestaurantForm } from "@/components/admin/restaurant-form";
import { restaurants } from "@/lib/mock-data/admin";

export const metadata: Metadata = { title: "Create restaurant" };

export default function CreateRestaurantPage() {
  return (
    <>
      <PageHeading
        title="Create restaurant"
        description="Set up the restaurant's platform identity and assign its initial owner."
        breadcrumbs={[
          { label: "Restaurants", href: "/admin/restaurants" },
          { label: "Create restaurant" },
        ]}
      />
      <RestaurantForm
        reservedSlugs={restaurants.map((restaurant) => restaurant.slug)}
      />
    </>
  );
}
