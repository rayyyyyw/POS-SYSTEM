"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { acceptInvitation } from "@/app/actions/invitations";
import { authClient } from "@/lib/auth-client";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/auth/form-feedback";

const initialState: ActionState = { message: "" };

export function InvitationForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(acceptInvitation, initialState);
  const { data: session, isPending: loadingSession, error: sessionError } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const router = useRouter();

  async function switchAccount() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setSignOutError("We couldn't sign you out. Please try again.");
        return;
      }
      router.replace(`/login?invitation=${encodeURIComponent(token)}`);
      router.refresh();
    } catch {
      setSignOutError("We couldn't reach the account service. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  if (loadingSession) return <p role="status" className="text-sm text-muted-foreground">Checking your account…</p>;
  if (sessionError) return <FormFeedback message="We couldn't check your account. Refresh this page to try again." />;

  if (state.success) {
    const destination = state.redirectTo === "/workspace" ? "/workspace" : "/login";
    return (
      <div className="space-y-5">
        <FormFeedback message={state.message} success />
        <Button asChild className="w-full" size="lg"><Link href={destination}>{destination === "/workspace" ? "Continue to your account" : "Continue to sign in"}</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {session ? (
        <div className="rounded-lg border bg-muted/50 p-4 text-sm leading-6">
          <p>Accepting as <span className="font-medium break-all">{session.user.email}</span>.</p>
          <p className="text-muted-foreground">Use the email address that received this invitation.</p>
          <Button type="button" variant="link" className="h-auto p-0" onClick={switchAccount} disabled={pending || signingOut}>{signingOut ? "Signing out…" : "Use a different account"}</Button>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">Already have an account? <Link href={`/login?invitation=${encodeURIComponent(token)}`} className="font-medium text-primary hover:underline">Sign in to accept</Link>. Otherwise, set up your account below.</p>
      )}
      <FormFeedback message={signOutError} />
      <form action={formAction} className="space-y-5" aria-busy={pending}>
        <input name="token" type="hidden" value={token} />
        {!session && <>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Full name</Label>
            <Input id="invite-name" name="name" autoComplete="name" minLength={2} maxLength={100} required disabled={pending || signingOut} aria-invalid={Boolean(state.errors?.name)} aria-describedby={state.errors?.name ? "invite-name-error" : undefined} />
            {state.errors?.name && <p id="invite-name-error" className="text-sm text-destructive">{state.errors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-password">Create a password</Label>
            <Input id="invite-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending || signingOut} aria-invalid={Boolean(state.errors?.password)} aria-describedby={state.errors?.password ? "invitation-password-help invite-password-error" : "invitation-password-help"} />
            <p id="invitation-password-help" className="text-xs text-muted-foreground">Use at least 12 characters. Your account will use the invited email address.</p>
            {state.errors?.password && <p id="invite-password-error" className="text-sm text-destructive">{state.errors.password[0]}</p>}
          </div>
        </>}
        <FormFeedback message={state.message} />
        <Button type="submit" className="w-full" size="lg" disabled={pending || signingOut}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending ? "Accepting invitation…" : session ? "Accept invitation" : "Create account and accept"}
        </Button>
      </form>
      <p className="text-xs leading-5 text-muted-foreground">If your invitation has expired, ask the platform administrator for a new one.</p>
    </div>
  );
}
