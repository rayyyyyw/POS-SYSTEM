import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { InvitationForm } from "@/components/auth/invitation-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accept your invitation | POS System" };

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const validToken = typeof token === "string" && token.length > 0 && token.length <= 256;

  return (
    <AuthCard title="Join your restaurant team" description="Accept your invitation to connect your personal account to your restaurant.">
      {validToken ? <InvitationForm token={token} /> : (
        <div className="space-y-5">
          <p role="alert" className="text-sm leading-6 text-muted-foreground">This invitation link is incomplete. Open the full link from your invitation email, or ask the platform administrator for a new invitation.</p>
          <Button asChild variant="outline" className="w-full"><Link href="/login">Go to sign in</Link></Button>
        </div>
      )}
    </AuthCard>
  );
}
