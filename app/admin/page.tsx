import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  Plus,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActivityList } from "@/components/admin/activity-list";
import {
  IdentityMark,
  PageHeading,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/admin/page-ui";
import {
  RestaurantStatusSummary,
  SalesChart,
} from "@/components/admin/report-visuals";
import {
  activity,
  getRestaurantList,
  reportPeriod,
  restaurants,
  salesTrend,
  snapshotLabel,
  summary,
} from "@/lib/mock-data/admin";
import { formatDate, formatMoney, formatNumber } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Overview" };

export default function AdminDashboard() {
  const recent = getRestaurantList().slice(0, 4);
  return (
    <>
      <PageHeading
        eyebrow={`Platform overview / ${snapshotLabel}`}
        title="A clear view of your platform."
        description="Monitor restaurant growth, account health, and activity across your workspace."
        actions={
          <Button asChild>
            <Link href="/admin/restaurants/create">
              <Plus aria-hidden="true" />
              Create restaurant
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Restaurants"
          value={formatNumber(summary.restaurants)}
          description={
            <>
              <span className="font-medium text-primary">
                {summary.pendingRestaurants} pending
              </span>{" "}
              registration reviews
            </>
          }
          icon={<Store />}
        />
        <StatCard
          label="Active Restaurants"
          value={formatNumber(summary.activeRestaurants)}
          description="Current lifecycle status · sample data"
          icon={<CheckCheck />}
        />
        <StatCard
          label="Total Users"
          value={formatNumber(summary.users)}
          description="Across all restaurant and platform roles"
          icon={<Users />}
        />
        <StatCard
          label="Gross Restaurant Sales"
          value={formatMoney(summary.grossSalesMinor, true)}
          description={`${formatNumber(summary.transactions)} transactions · Sep 1–10`}
          icon={<Wallet />}
        />
      </div>
      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Panel
          title="Sales across the platform"
          description="Gross restaurant sales, not platform revenue."
          action={
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1.5 text-[10px] text-muted-foreground">
              <CalendarDays className="size-3" aria-hidden="true" />
              Sep 1–10, 2026
            </span>
          }
        >
          <div className="mb-6 flex items-baseline gap-3">
            <span className="text-2xl font-semibold tracking-tight">
              {formatMoney(summary.grossSalesMinor)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Sample period
            </span>
          </div>
          <SalesChart data={salesTrend} />
        </Panel>
        <Panel
          title="Restaurant health"
          description="A snapshot of platform account statuses."
        >
          <RestaurantStatusSummary restaurants={restaurants} />
          <div className="mt-7 border-t pt-4">
            <Link
              href="/admin/restaurants"
              className="inline-flex items-center gap-2 rounded text-xs font-medium text-primary hover:underline"
            >
              Manage restaurants
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </Panel>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Panel
          title="Recent registrations"
          description="The latest restaurants joining your platform."
          action={
            <Link
              href="/admin/restaurants"
              className="shrink-0 rounded text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          }
        >
          <Table className="min-w-[530px]">
            <caption className="sr-only">
              Four most recent restaurant registrations
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-0">Restaurant</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((restaurant) => (
                <TableRow key={restaurant.id}>
                  <TableCell className="py-4 pl-0">
                    <div className="flex items-center gap-3">
                      <IdentityMark name={restaurant.name} />
                      <div>
                        <Link
                          href={`/admin/restaurants/${restaurant.id}`}
                          className="rounded text-xs font-medium hover:text-primary hover:underline"
                        >
                          {restaurant.name}
                        </Link>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {restaurant.ownerName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {formatDate(restaurant.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={restaurant.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <Panel
          title="Platform activity"
          description="Recent sample events from across your workspace."
        >
          <ActivityList events={activity.slice(0, 4)} compact />
        </Panel>
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">
        Figures are illustrative. Reporting period: {reportPeriod}. Account
        counts reflect the {snapshotLabel} sample snapshot.
      </p>
    </>
  );
}
