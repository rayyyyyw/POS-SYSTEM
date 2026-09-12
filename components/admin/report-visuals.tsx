import { formatMoney, formatNumber, labelFor } from "@/lib/admin/format";
import { restaurantStatuses, type Restaurant } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export function SalesChart({
  data,
}: {
  data: readonly { label: string; grossSalesMinor: number }[];
}) {
  const maximum = Math.max(...data.map((item) => item.grossSalesMinor), 1);
  return (
    <figure aria-label="Sample daily gross restaurant sales in Philippine pesos">
      <div className="flex h-48 gap-3 sm:gap-5" aria-hidden="true">
        <div className="flex w-11 shrink-0 flex-col justify-between pb-7 text-[10px] text-muted-foreground">
          <span>{formatMoney(maximum, true)}</span>
          <span>{formatMoney(maximum / 2, true)}</span>
          <span>₱0</span>
        </div>
        <div className="relative flex flex-1 items-end gap-2 border-b pb-7 sm:gap-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed" />
          {data.map((item, index) => (
            <div
              key={item.label}
              className="relative z-10 flex h-full min-w-0 flex-1 items-end"
            >
              <div
                className={cn(
                  "w-full rounded-t-[3px]",
                  index === data.length - 1
                    ? "bg-chart-primary"
                    : "bg-chart-secondary",
                )}
                style={{ height: `${(item.grossSalesMinor / maximum) * 100}%` }}
                title={`${item.label}: ${formatMoney(item.grossSalesMinor)}`}
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground">
                {index === 0 ? "Sep 1" : index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span
            className="size-2 rounded-sm bg-chart-primary"
            aria-hidden="true"
          />{" "}
          Gross restaurant sales · PHP
        </span>
        <span>Sample period</span>
      </figcaption>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer rounded hover:text-foreground">
          View daily values
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
          {data.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatMoney(item.grossSalesMinor)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </figure>
  );
}

const barColors = {
  ACTIVE: "bg-success",
  PENDING: "bg-warning",
  SUSPENDED: "bg-destructive",
  ARCHIVED: "bg-muted-foreground",
};

export function RestaurantStatusSummary({
  restaurants,
}: {
  restaurants: readonly Restaurant[];
}) {
  const counts = restaurantStatuses.map((status) => ({
    status,
    count: restaurants.filter((restaurant) => restaurant.status === status)
      .length,
  }));
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight">
          {restaurants.length}
        </span>
        <span className="text-xs text-muted-foreground">
          restaurants on the platform
        </span>
      </div>
      <div
        className="mb-7 mt-5 flex h-2 gap-1 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        {counts
          .filter((item) => item.count)
          .map(({ status, count }) => (
            <span
              key={status}
              className={barColors[status]}
              style={{ width: `${(count / restaurants.length) * 100}%` }}
            />
          ))}
      </div>
      <dl className="space-y-4">
        {counts.map(({ status, count }) => (
          <div
            key={status}
            className="flex items-center justify-between text-xs"
          >
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span
                className={cn("size-2 rounded-full", barColors[status])}
                aria-hidden="true"
              />
              {labelFor(status)}
            </dt>
            <dd className="font-medium tabular-nums">{formatNumber(count)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
