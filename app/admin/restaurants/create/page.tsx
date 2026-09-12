import type { Metadata } from "next";
import { PageHeading } from "@/components/admin/page-ui";
import { RestaurantForm } from "@/components/admin/restaurant-form";
import { paramValue } from "@/components/admin/directory-controls";
import { requireAdmin } from "@/lib/server/authorization";
import { getAccessRequest } from "@/lib/server/queries";
import { notFound } from "next/navigation";
import type { DirectoryParams } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Create restaurant" };

export default async function CreateRestaurantPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const requestId = paramValue(params, "requestId");
  const request = requestId ? await getAccessRequest(requestId) : null;
  if (requestId && (!request || request.status === "CLOSED")) notFound();
  return <><PageHeading title="Create restaurant" description="Establish a business account and invite its initial owner." breadcrumbs={[{ label: "Restaurants", href: "/admin/restaurants" }, { label: "Create" }]} /><RestaurantForm requestId={request?.id} defaults={request ? { name: request.restaurantName, ownerName: request.name, ownerEmail: request.email, city: request.city } : undefined} /></>;
}
