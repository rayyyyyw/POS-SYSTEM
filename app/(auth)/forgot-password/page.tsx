import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RecoveryForm } from "@/components/auth/recovery-form";

export const metadata: Metadata = { title: "Reset your password | POS System" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" description="Enter your account email and we'll help you reset your password.">
      <RecoveryForm mode="password" />
    </AuthCard>
  );
}
