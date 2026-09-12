import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RecoveryForm } from "@/components/auth/recovery-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify your email | POS System" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; checked?: string | string[] }> }) {
  const { error, checked } = await searchParams;

  if (checked === "1" && !error) {
    return (
      <AuthCard title="Continue to your account" description="Your verification link has been processed. Sign in to continue with your verified email address.">
        <Button asChild className="w-full" size="lg"><Link href="/login">Continue to sign in</Link></Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Verify your email" description={error
      ? "This verification link couldn't be used. Request a new link below."
      : "Open the verification link in your email to confirm your address. If you need another link, enter your account email below."}>
      <RecoveryForm mode="verification" />
    </AuthCard>
  );
}
