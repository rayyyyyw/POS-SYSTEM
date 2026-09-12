"use client";

import { useActionState, useState } from "react";
import { ArrowRight, CircleCheck, LoaderCircle } from "lucide-react";
import { requestAccess } from "@/app/actions/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fields = [
  { name: "name", label: "Your name", placeholder: "Full name", autoComplete: "name", maxLength: 120 },
  { name: "restaurantName", label: "Restaurant name", placeholder: "Your restaurant", autoComplete: "organization", maxLength: 160 },
  { name: "email", label: "Email address", placeholder: "you@restaurant.com", autoComplete: "email", type: "email", maxLength: 254 },
  { name: "city", label: "City", placeholder: "Where you serve", autoComplete: "address-level2", maxLength: 120 },
] as const;

export function AccessRequestForm() {
  const [state, formAction, pending] = useActionState(requestAccess, { message: "" });
  const [values, setValues] = useState({ name: "", email: "", restaurantName: "", city: "" });
  const [consent, setConsent] = useState(false);

  if (state.success) {
    return (
      <div className="flex min-h-96 flex-col justify-center" role="status" aria-live="polite">
        <span className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary"><CircleCheck className="size-7" aria-hidden="true" /></span>
        <h3 className="text-2xl font-semibold tracking-tight">You&apos;re on our list.</h3>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{state.message}</p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">Access begins with an invitation after review. POS and restaurant operations tools are planned for later releases.</p>
        <a href="#features" className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline">Explore what&apos;s ahead <ArrowRight className="size-4" aria-hidden="true" /></a>
      </div>
    );
  }

  return (
    <form action={formAction} aria-labelledby="access-form-title" className="space-y-5">
      <div className="mb-7">
        <h3 id="access-form-title" className="text-xl font-semibold tracking-tight">Request early access</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">All fields are required. This is an access request, not an account registration.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const error = state.errors?.[field.name]?.[0];
          return (
            <div key={field.name}>
              <Label htmlFor={`access-${field.name}`} className="mb-2.5">{field.label}</Label>
              <Input
                id={`access-${field.name}`}
                name={field.name}
                type={"type" in field ? field.type : "text"}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                required
                value={values[field.name]}
                onChange={(event) => setValues((previous) => ({ ...previous, [field.name]: event.target.value }))}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `access-${field.name}-error` : undefined}
                className="h-11 bg-[#fcfcf8]"
              />
              {error && <p id={`access-${field.name}-error`} className="mt-2 text-xs text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>
      <div hidden aria-hidden="true">
        <label htmlFor="access-website">Website</label>
        <input id="access-website" name="website" type="text" autoComplete="off" tabIndex={-1} />
      </div>
      <div className="pt-1">
        <label htmlFor="access-consent" className="flex cursor-pointer items-start gap-3 text-xs leading-6 text-muted-foreground">
          <input id="access-consent" type="checkbox" name="consent" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" aria-invalid={Boolean(state.errors?.consent)} aria-describedby={state.errors?.consent ? "access-consent-error" : undefined} />
          <span>I agree that POS System may use these details to review my request and contact me about early access.</span>
        </label>
        {state.errors?.consent?.[0] && <p id="access-consent-error" className="mt-2 text-xs text-destructive">{state.errors.consent[0]}</p>}
      </div>
      {state.message && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive-muted p-3 text-sm leading-6 text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-full">
        {pending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Submitting request…</> : <>Send my request <ArrowRight className="size-4" aria-hidden="true" /></>}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">Already invited? <a href="/login" className="font-medium text-primary hover:underline">Log in to your account</a></p>
    </form>
  );
}
