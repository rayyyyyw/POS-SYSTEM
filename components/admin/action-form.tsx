"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
const FormErrors = createContext<Record<string, string[]>>({});

export function ActionForm({ action, children, submitLabel, pendingLabel = "Saving…", confirmation, variant = "default", className }: {
  action: FormAction;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  confirmation?: string;
  variant?: "default" | "outline" | "destructive";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { message: "" });
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) {
      if (state.redirectTo) router.push(state.redirectTo);
      router.refresh();
    } else if (state.errors) {
      const firstName = Object.keys(state.errors)[0];
      const control = formRef.current?.elements.namedItem(firstName);
      if (control instanceof HTMLElement) control.focus();
    }
  }, [state, router]);
  return (
    <form ref={formRef} action={formAction} className={cn("space-y-5", className)} onSubmit={(event) => {
      if (confirmation && !window.confirm(confirmation)) event.preventDefault();
    }}>
      <FormErrors.Provider value={state.errors ?? {}}>
        <fieldset disabled={pending} className="min-w-0 space-y-5 disabled:opacity-70">{children}</fieldset>
      </FormErrors.Provider>
      {state.message && <p role={state.success ? "status" : "alert"} className={cn("rounded-md border px-3 py-2.5 text-sm leading-6", state.success ? "border-success/20 bg-success-muted text-success" : "border-destructive/20 bg-destructive-muted text-destructive")}>{state.message}</p>}
      <Button type="submit" disabled={pending} variant={variant}>{pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pending ? pendingLabel : submitLabel}</Button>
    </form>
  );
}

export function FormField({ name, label, defaultValue = "", type = "text", required = false, hint, options, maxLength = 200, placeholder }: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: "text" | "email" | "tel";
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  maxLength?: number;
  placeholder?: string;
}) {
  const id = useId();
  const initialValue = defaultValue || options?.[0]?.value || "";
  const [value, setValue] = useState(initialValue);
  const [previousDefault, setPreviousDefault] = useState(initialValue);
  if (previousDefault !== initialValue) {
    setPreviousDefault(initialValue);
    setValue(initialValue);
  }
  const errors = useContext(FormErrors)[name];
  const describedBy = errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const attributes = { id, name, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValue(event.target.value), required, "aria-invalid": Boolean(errors?.length), "aria-describedby": describedBy };
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}{required && <span className="text-muted-foreground" aria-hidden="true">*</span>}</Label>
    {options ? <NativeSelect {...attributes} className="h-10 w-full">{options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}</NativeSelect> : <Input {...attributes} type={type} maxLength={maxLength} placeholder={placeholder} className="h-10 bg-card" />}
    {errors?.length ? <p id={`${id}-error`} className="text-xs text-destructive">{errors.join(" ")}</p> : hint && <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">{hint}</p>}
  </div>;
}
