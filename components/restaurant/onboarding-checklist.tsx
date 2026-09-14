import Link from "next/link";
import { CheckCircle2, Circle, LockKeyhole } from "lucide-react";
import type { buildOnboarding } from "@/lib/domain/restaurant/policies";

export function OnboardingChecklist({
  onboarding,
  restaurantId,
}: {
  onboarding: ReturnType<typeof buildOnboarding>;
  restaurantId?: string;
}) {
  return (
    <div>
      <p className="mb-5 text-sm text-muted-foreground">
        {onboarding.completed} of {onboarding.total} foundation steps complete
      </p>
      <ul className="divide-y">
        {onboarding.steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3 py-4 first:pt-0">
            {step.complete ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-label="Complete"
              />
            ) : (
              <Circle
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-label="Incomplete"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {restaurantId && step.segment ? (
                  <Link
                    href={`/workspace/${restaurantId}${step.segment}`}
                    className="hover:underline"
                  >
                    {step.label}
                  </Link>
                ) : (
                  step.label
                )}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-start gap-3 rounded-lg bg-muted p-4">
        <LockKeyhole
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium">Menu setup comes next</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Menu and POS tools are not available yet. They are separate from
            your account setup.
          </p>
        </div>
      </div>
    </div>
  );
}
