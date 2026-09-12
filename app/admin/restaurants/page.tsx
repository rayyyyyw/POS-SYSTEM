import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/admin/page-ui";
import { RestaurantsTable } from "@/components/admin/restaurants-table";
import { listRestaurants } from "@/lib/server/queries";
import type { DirectoryParams } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Restaurants" };

export default async function RestaurantsPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  const params = await searchParams;
  const result = await listRestaurants(params);
  return <><PageHeading eyebrow="Management" title="Restaurants" description="Manage business profiles, owner onboarding, and restaurant access." actions={<Button asChild><Link href="/admin/restaurants/create"><Plus aria-hidden="true" />Create restaurant</Link></Button>} /><RestaurantsTable result={result} params={params} /></>;
}
