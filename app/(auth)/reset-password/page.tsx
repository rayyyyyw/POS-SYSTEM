import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Choose a new password | POS System" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" && params.token.length <= 256 ? params.token : "";

  return (
    <AuthCard title="Choose a new password" description="Keep your account secure with a password you don't use elsewhere.">
      {token && !params.error ? <ResetPasswordForm token={token} /> : (
        <div className="space-y-5">
          <p role="alert" className="text-sm leading-6 text-muted-foreground">This password reset link is missing or no longer valid. Request a new link to continue.</p>
          <Button asChild className="w-full" size="lg"><Link href="/forgot-password">Request a reset link</Link></Button>
        </div>
      )}
    </AuthCard>
  );
}
