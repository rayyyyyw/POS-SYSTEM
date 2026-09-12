import Link from "next/link";
import { Check, FileText, Pause, UserRoundPlus } from "lucide-react";
import type { ActivityEvent } from "@/lib/admin/types";
import { formatDate, formatTime } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success-muted text-success",
  info: "bg-info-muted text-info",
  warning: "bg-warning-muted text-warning",
  destructive: "bg-destructive-muted text-destructive",
};

export function ActivityList({
  events,
  compact = false,
}: {
  events: readonly ActivityEvent[];
  compact?: boolean;
}) {
  if (!events.length)
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No sample account activity is available for this user.
      </p>
    );
  return (
    <ol className="space-y-0">
      {events.map((event, index) => {
        const Icon =
          event.tone === "destructive"
            ? Pause
            : event.title.includes("owner")
              ? UserRoundPlus
              : event.tone === "success"
                ? Check
                : FileText;
        return (
          <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {index < events.length - 1 && (
              <span
                className="absolute bottom-0 left-4 top-9 border-l"
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                tones[event.tone],
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-5">
                <p className="text-xs font-medium">{event.title}</p>
                <time
                  dateTime={event.occurredAt}
                  className="shrink-0 text-[11px] text-muted-foreground"
                >
                  {formatDate(event.occurredAt)}
                  {!compact && ` · ${formatTime(event.occurredAt)}`}
                </time>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {event.detail}
              </p>
              {!compact && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  By {event.actor} ·{" "}
                  <span className="font-mono">{event.id}</span>
                </p>
              )}
              {compact && event.restaurantId && (
                <Link
                  href={`/admin/restaurants/${event.restaurantId}/activity`}
                  className="mt-1 inline-block rounded text-[11px] font-medium text-primary hover:underline"
                >
                  View activity
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
