import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CreditCard, Store, Users, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeading,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/admin/page-ui";
import {
  RestaurantStatusSummary,
  SalesChart,
} from "@/components/admin/report-visuals";
import { ActivityList } from "@/components/admin/activity-list";
import {
  activity,
  getRestaurant,
  reportPeriod,
  restaurantPerformance,
  restaurants,
  salesTrend,
  summary,
  users,
} from "@/lib/mock-data/admin";
import { formatMoney, formatNumber, labelFor } from "@/lib/admin/format";
import { userRoles } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  const performance = [...restaurantPerformance].sort(
    (a, b) => b.grossSalesMinor - a.grossSalesMinor,
  );
  return (
    <>
      <PageHeading
        eyebrow="Analytics"
        title="Platform reports"
        description="A consolidated view of restaurant sales, transaction volume, and account activity."
        actions={
          <span className="flex items-center gap-2 rounded-md border bg-card px-3 py-2.5 text-xs">
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            {reportPeriod}
          </span>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross Restaurant Sales"
          value={formatMoney(summary.grossSalesMinor, true)}
          description="Illustrative gross sales · PHP"
          icon={<Wallet />}
        />
        <StatCard
          label="Platform Transaction Volume"
          value={formatNumber(summary.transactions)}
          description="Transaction count across restaurants"
          icon={<CreditCard />}
        />
        <StatCard
          label="Restaurants with Transactions"
          value={formatNumber(
            performance.filter((item) => item.transactions > 0).length,
          )}
          description="During the sample reporting period"
          icon={<Store />}
        />
        <StatCard
          label="Active User Accounts"
          value={formatNumber(
            users.filter((user) => user.status === "ACTIVE").length,
          )}
          description="Account status, not recent sign-ins"
          icon={<Users />}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Panel
          title="Gross restaurant sales"
          description="Daily sample totals for the reporting period."
        >
          <SalesChart data={salesTrend} />
        </Panel>
        <Panel title="How to read these reports">
          <div className="space-y-5 text-sm leading-6 text-muted-foreground">
            <p>
              Gross restaurant sales represent the value of restaurant sales
              across the platform.
            </p>
            <p>
              These figures are{" "}
              <span className="font-medium text-foreground">
                not platform revenue
              </span>
              . No platform fee or monetization model has been defined.
            </p>
            <div className="border-t pt-4 text-xs">
              All figures are static samples in PHP. Transaction counts and
              sales totals use the same dataset as the dashboard.
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Restaurant performance"
        description="Sample period totals, ordered by gross sales. Lifecycle status is the current sample snapshot."
      >
        <Table className="min-w-[620px]">
          <caption className="sr-only">
            Gross restaurant sales and transaction counts by restaurant,
            September 1 to 10, 2026
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-0">Restaurant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Gross sales</TableHead>
              <TableHead className="pl-6">Share of sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performance.map((item) => {
              const restaurant = getRestaurant(item.restaurantId)!;
              const share = summary.grossSalesMinor
                ? (item.grossSalesMinor / summary.grossSalesMinor) * 100
                : 0;
              return (
                <TableRow key={item.restaurantId}>
                  <TableCell className="py-4 pl-0">
                    <Link
                      href={`/admin/restaurants/${restaurant.id}`}
                      className="rounded text-xs font-medium hover:text-primary hover:underline"
                    >
                      {restaurant.name}
                    </Link>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {restaurant.city}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={restaurant.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatNumber(item.transactions)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">
                    {formatMoney(item.grossSalesMinor)}
                  </TableCell>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-1.5 w-20 rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-chart-primary"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {Math.round(share)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Restaurant status snapshot"
          description="Current account health across the sample platform."
        >
          <RestaurantStatusSummary restaurants={restaurants} />
        </Panel>
        <Panel
          title="User distribution"
          description="Individual users grouped by their platform or restaurant role."
        >
          <dl className="space-y-5">
            {userRoles.map((role) => (
              <div key={role} className="flex justify-between gap-4 text-sm">
                <dt className="text-muted-foreground">{labelFor(role)}</dt>
                <dd className="font-medium tabular-nums">
                  {users.filter((user) => user.role === role).length}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t pt-4">
            <Link
              href="/admin/users"
              className="rounded text-xs font-medium text-primary hover:underline"
            >
              Explore user accounts
            </Link>
          </div>
        </Panel>
      </div>
      <Panel
        title="Recent account activity"
        description="Sample platform events involving an individual user. This is not sign-in analytics."
      >
        <ActivityList
          events={activity.filter((event) => event.userId !== null).slice(0, 3)}
        />
      </Panel>
    </>
  );
}
