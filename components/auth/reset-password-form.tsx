"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/auth/form-feedback";

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", success: false });
  const [mismatch, setMismatch] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("password") ?? "");
    if (newPassword !== formData.get("confirmation")) {
      setMismatch(true);
      setFeedback({ message: "Your passwords don't match. Please enter them again.", success: false });
      event.currentTarget.querySelector<HTMLInputElement>("#password-confirmation")?.focus();
      return;
    }

    setMismatch(false);
    setFeedback({ message: "", success: false });
    setPending(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword, token });
      setFeedback(error
        ? { message: "We couldn't reset your password. The link may have expired or already been used. Request a new link and try again.", success: false }
        : { message: "Your password has been updated. Sign in with your new password.", success: true });
    } catch {
      setFeedback({ message: "We couldn't reach the account service. Please try again.", success: false });
    } finally {
      setPending(false);
    }
  }

  if (feedback.success) {
    return (
      <div className="space-y-5">
        <FormFeedback {...feedback} />
        <Button asChild className="w-full" size="lg"><Link href="/login">Continue to sign in</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pending}>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} aria-describedby="password-requirements" />
        <p id="password-requirements" className="text-xs text-muted-foreground">Use at least 12 characters. A unique passphrase works well.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-confirmation">Confirm new password</Label>
        <Input id="password-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} aria-invalid={mismatch} aria-describedby={mismatch ? "reset-feedback" : undefined} onChange={() => setMismatch(false)} />
      </div>
      <FormFeedback {...feedback} id="reset-feedback" />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {pending ? "Updating password…" : "Update password"}
      </Button>
      <p className="text-center text-sm"><Link href="/forgot-password" className="font-medium text-primary hover:underline">Request a new reset link</Link></p>
    </form>
  );
}
