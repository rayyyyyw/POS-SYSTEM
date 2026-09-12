"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/auth/form-feedback";

export function RecoveryForm({ mode }: { mode: "password" | "verification" }) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", success: false });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setFeedback({ message: "", success: false });
    setPending(true);

    try {
      const result = mode === "password"
        ? await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })
        : await authClient.sendVerificationEmail({ email, callbackURL: "/verify-email?checked=1" });

      setFeedback(result.error
        ? { message: "We couldn't process this request. Please try again later.", success: false }
        : {
          message: mode === "password"
            ? "If this email belongs to an eligible account, you'll receive a password reset link. Check your inbox and spam folder."
            : "If this account needs verification, you'll receive a verification link. Check your inbox and spam folder.",
          success: true,
        });
    } catch {
      setFeedback({ message: "We couldn't reach the account service. Please try again.", success: false });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pending}>
      <div className="space-y-2">
        <Label htmlFor="recovery-email">Email address</Label>
        <Input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending} />
      </div>
      <FormFeedback {...feedback} />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}
        {pending ? "Sending request…" : mode === "password" ? "Send reset link" : "Send verification link"}
      </Button>
      <p className="text-center text-sm"><Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link></p>
    </form>
  );
}
