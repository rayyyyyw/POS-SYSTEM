import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/admin/page-ui";
import { RestaurantsTable } from "@/components/admin/restaurants-table";
import { getRestaurantList, summary } from "@/lib/mock-data/admin";

export const metadata: Metadata = { title: "Restaurants" };

export default function RestaurantsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Management"
        title="Restaurants"
        description="Manage restaurant identities, owners, and their lifecycle on the platform."
        actions={
          <Button asChild>
            <Link href="/admin/restaurants/create">
              <Plus aria-hidden="true" />
              Create restaurant
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span>
          <strong className="font-semibold text-foreground">
            {summary.restaurants}
          </strong>{" "}
          total restaurants
        </span>
        <span>
          <strong className="font-semibold text-primary">
            {summary.activeRestaurants}
          </strong>{" "}
          active
        </span>
        <span>
          <strong className="font-semibold text-warning">
            {summary.pendingRestaurants}
          </strong>{" "}
          pending review
        </span>
      </div>
      <RestaurantsTable data={getRestaurantList()} />
    </>
  );
}
