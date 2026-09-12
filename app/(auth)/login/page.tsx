import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in | POS System" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invitation?: string | string[] }> }) {
  const { invitation } = await searchParams;
  const token = typeof invitation === "string" && invitation.length <= 256 ? invitation : undefined;

  return (
    <AuthCard title="Welcome back" description="Sign in to access your restaurant account or manage the platform.">
      <LoginForm invitation={token} />
    </AuthCard>
  );
}
