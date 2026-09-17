import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, labelFor } from "@/lib/admin/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export function PageHeading({
  title,
  description,
  eyebrow,
  actions,
  breadcrumbs,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div>
      {breadcrumbs && (
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <li key={item.label} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="size-3" aria-hidden="true" />
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="rounded hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-5", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <CardDescription className="mt-1 text-xs leading-5">
              {description}
            </CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success-muted text-success",
  PENDING: "bg-warning-muted text-warning",
  SUSPENDED: "bg-destructive-muted text-destructive",
  ARCHIVED: "bg-muted text-muted-foreground",
  INVITED: "bg-info-muted text-info",
  DISABLED: "bg-muted text-muted-foreground",
  NEW: "bg-info-muted text-info",
  REVIEWED: "bg-success-muted text-success",
  CLOSED: "bg-muted text-muted-foreground",
  ACCEPTED: "bg-success-muted text-success",
  REVOKED: "bg-muted text-muted-foreground",
  SENT: "bg-success-muted text-success",
  FAILED: "bg-destructive-muted text-destructive",
  EXPIRED: "bg-warning-muted text-warning",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
        statusStyles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status === "SENT" ? "Email submitted" : status === "FAILED" ? "Submission unconfirmed" : labelFor(status)}
    </Badge>
  );
}

export function IdentityMark({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border bg-background font-semibold text-muted-foreground",
        large ? "size-14 text-lg" : "size-9 text-[11px]",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: ReactNode;
  icon: ReactNode;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
          <span
            className="text-muted-foreground [&>svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>
        <p className="mt-3 text-[29px] font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <div className="mt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

export function DetailList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="divide-y">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="grid gap-1.5 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(130px,0.6fr)_1fr] sm:gap-5"
        >
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-sm [overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({
  title = "No results found",
  description = "Try a different search or adjust your filters.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <SearchX
        className="mb-3 size-7 text-muted-foreground"
        aria-hidden="true"
      />
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
