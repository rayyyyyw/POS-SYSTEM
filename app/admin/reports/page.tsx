import type { Metadata } from "next";
import Link from "next/link";
import { CheckCheck, Inbox, Store, Users } from "lucide-react";
import { PageHeading, Panel, StatCard } from "@/components/admin/page-ui";
import { RestaurantStatusSummary } from "@/components/admin/report-visuals";
import { ActivityList } from "@/components/admin/activity-list";
import { getOverview } from "@/lib/server/queries";
import { formatNumber } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const overview = await getOverview();
  return <>
    <PageHeading eyebrow="Analytics" title="Platform reports" description="Current account and onboarding totals from the platform database." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Restaurants" value={formatNumber(overview.restaurants)} description="All lifecycle statuses" icon={<Store />} /><StatCard label="Active restaurants" value={formatNumber(overview.activeRestaurants)} description="Currently enabled for restaurant access" icon={<CheckCheck />} /><StatCard label="Individual users" value={formatNumber(overview.users)} description="Distinct accounts, including disabled users" icon={<Users />} /><StatCard label="Awaiting review" value={formatNumber(overview.pendingRequests)} description="New early-access requests" icon={<Inbox />} /></div>
    <div className="grid gap-6 lg:grid-cols-2"><Panel title="Restaurant status distribution" description="A current snapshot, not a historical trend."><RestaurantStatusSummary counts={overview.statusCounts} /></Panel><Panel title="Onboarding follow-up"><div className="space-y-5 text-sm leading-6 text-muted-foreground"><p><strong className="font-medium text-foreground">{formatNumber(overview.pendingRestaurants)} restaurants</strong> are pending. Review their owner invitations and business details before activation.</p><Link href="/admin/restaurants?status=PENDING" className="inline-block text-xs font-medium text-primary hover:underline">Review pending restaurants →</Link><div className="border-t pt-5"><p><strong className="font-medium text-foreground">{formatNumber(overview.pendingRequests)} early-access requests</strong> have not been reviewed.</p><Link href="/admin/requests?status=NEW" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">Review requests →</Link></div></div></Panel></div>
    <Panel title="Sales and transaction reporting" description="Not available in this release."><p className="max-w-2xl text-sm leading-6 text-muted-foreground">Sales totals, payment volume, and restaurant performance will become available when the restaurant order and payment modules are implemented. No sales figures are recorded by the current account-management system.</p></Panel>
    <Panel title="Recent platform activity" description="Recorded administrative changes; this is not sign-in analytics."><ActivityList events={overview.activity} /></Panel>
  </>;
}
