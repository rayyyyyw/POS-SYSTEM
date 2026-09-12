import { DateLabel } from "@/components/admin/date-label";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCheck, Inbox, Plus, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityList } from "@/components/admin/activity-list";
import { EmptyState, IdentityMark, PageHeading, Panel, StatCard, StatusBadge } from "@/components/admin/page-ui";
import { RestaurantStatusSummary } from "@/components/admin/report-visuals";
import { getOverview } from "@/lib/server/queries";
import { formatNumber } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminDashboard() {
  const overview = await getOverview();
  return <>
    <PageHeading eyebrow="Platform overview" title="A clear view of your platform." description="Restaurant onboarding, account health, and the latest platform activity." actions={<Button asChild><Link href="/admin/restaurants/create"><Plus aria-hidden="true" />Create restaurant</Link></Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total restaurants" value={formatNumber(overview.restaurants)} description={`${overview.pendingRestaurants} pending onboarding`} icon={<Store />} />
      <StatCard label="Active restaurants" value={formatNumber(overview.activeRestaurants)} description="Restaurants with active account access" icon={<CheckCheck />} />
      <StatCard label="Individual users" value={formatNumber(overview.users)} description="Across platform and restaurant accounts" icon={<Users />} />
      <StatCard label="New access requests" value={formatNumber(overview.pendingRequests)} description={<Link href="/admin/requests?status=NEW" className="font-medium text-primary hover:underline">Review early-access requests</Link>} icon={<Inbox />} />
    </div>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
      <Panel title="Recent registrations" description="The latest restaurants added to the platform." action={<Link href="/admin/restaurants" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
        {overview.recentRestaurants.length ? <ul className="divide-y">{overview.recentRestaurants.map((restaurant) => <li key={restaurant.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="flex min-w-0 items-center gap-3"><IdentityMark name={restaurant.name} /><div><Link href={`/admin/restaurants/${restaurant.id}`} className="text-sm font-medium hover:text-primary hover:underline">{restaurant.name}</Link><p className="mt-1 text-xs text-muted-foreground"><DateLabel value={restaurant.createdAt} /> · {restaurant.ownerName ?? "Awaiting owner"}</p></div></div><StatusBadge status={restaurant.status} /></li>)}</ul> : <EmptyState title="Your first restaurant starts here" description="Create a restaurant account and invite its owner to get started." />}
      </Panel>
      <Panel title="Restaurant health" description="Current restaurant lifecycle statuses."><RestaurantStatusSummary counts={overview.statusCounts} /></Panel>
    </div>
    <Panel title="Platform activity" description="Recent recorded changes across the platform."><ActivityList events={overview.activity} compact /></Panel>
  </>;
}
