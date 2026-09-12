import { cn } from "@/lib/utils";

export function FormFeedback({
  message,
  success = false,
  id,
}: {
  message: string;
  success?: boolean;
  id?: string;
}) {
  if (!message) return null;

  return (
    <p
      id={id}
      role={success ? "status" : "alert"}
      className={cn(
        "rounded-lg border p-3 text-sm leading-6",
        success
          ? "border-primary/20 bg-success-muted text-success"
          : "border-destructive/20 bg-destructive-muted text-destructive",
      )}
    >
      {message}
    </p>
  );
}
