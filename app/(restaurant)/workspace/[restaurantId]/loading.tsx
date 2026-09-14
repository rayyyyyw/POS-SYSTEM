export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <p className="text-sm text-muted-foreground">Loading your restaurant…</p>
      <div
        aria-hidden="true"
        className="h-28 animate-pulse rounded-xl bg-muted"
      />
      <div
        aria-hidden="true"
        className="h-64 animate-pulse rounded-xl bg-muted"
      />
    </div>
  );
}
