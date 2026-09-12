import { formatNumber, labelFor } from "@/lib/admin/format";
import { restaurantStatuses, type RestaurantStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const barColors: Record<RestaurantStatus, string> = {
  ACTIVE: "bg-success", PENDING: "bg-warning", SUSPENDED: "bg-destructive", ARCHIVED: "bg-muted-foreground",
};

export function RestaurantStatusSummary({ counts: values }: { counts: { status: RestaurantStatus; count: number }[] }) {
  const counts = restaurantStatuses.map((status) => ({ status, count: values.find((item) => item.status === status)?.count ?? 0 }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  return <div>
    <div className="flex items-baseline gap-2"><span className="text-3xl font-semibold tracking-tight">{formatNumber(total)}</span><span className="text-xs text-muted-foreground">restaurants on the platform</span></div>
    <div className={cn("mb-7 mt-5 flex h-2 gap-1 overflow-hidden rounded-full", total === 0 && "bg-muted")} aria-hidden="true">{counts.filter((item) => item.count > 0).map(({ status, count }) => <span key={status} className={barColors[status]} style={{ width: `${count / total * 100}%` }} />)}</div>
    <dl className="space-y-4">{counts.map(({ status, count }) => <div key={status} className="flex items-center justify-between text-xs"><dt className="flex items-center gap-2 text-muted-foreground"><span className={cn("size-2 rounded-full", barColors[status])} aria-hidden="true" />{labelFor(status)}</dt><dd className="font-medium tabular-nums">{formatNumber(count)}</dd></div>)}</dl>
  </div>;
}
