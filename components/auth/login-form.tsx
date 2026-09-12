"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/auth/form-feedback";

export function LoginForm({ invitation }: { invitation?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setMessage("");
    setPending(true);

    try {
      const { error } = await authClient.signIn.email({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      });
      if (error) {
        setMessage("We couldn't sign you in. Check your email and password, and make sure your email is verified.");
        return;
      }
      router.replace(invitation ? `/accept-invitation?token=${encodeURIComponent(invitation)}` : "/workspace");
      router.refresh();
    } catch {
      setMessage("We couldn't reach the sign-in service. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pending}>
      {invitation && <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">Sign in with the email address that received your invitation.</p>}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email address</Label>
        <Input id="login-email" name="email" type="email" autoComplete="username" maxLength={254} required disabled={pending} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="login-password">Password</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
        </div>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" maxLength={128} required disabled={pending} />
      </div>
      <FormFeedback message={message} />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Need to verify your email?{" "}<Link href="/verify-email" className="font-medium text-primary hover:underline">Resend link</Link>
      </p>
      <p className="border-t pt-5 text-center text-sm leading-6 text-muted-foreground">
        New here? Restaurant access is by invitation. <Link href="/#request-access" className="font-medium text-primary hover:underline">Request early access</Link>.
      </p>
    </form>
  );
}
