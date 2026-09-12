import type { Metadata } from "next";
import { PageHeading } from "@/components/admin/page-ui";
import { UsersTable } from "@/components/admin/users-table";
import { getRestaurantOptions, listUsers } from "@/lib/server/queries";
import type { DirectoryParams } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  const params = await searchParams;
  const [result, restaurants] = await Promise.all([listUsers(params), getRestaurantOptions()]);
  return <><PageHeading eyebrow="Management" title="Users" description="Individual identities, platform access, and restaurant memberships. Invite people from the relevant restaurant's page." /><UsersTable result={result} params={params} restaurants={restaurants} /><p className="text-xs text-muted-foreground">The restaurant selector lists up to 100 recently added restaurants. Open a restaurant directly to manage its members.</p></>;
}
