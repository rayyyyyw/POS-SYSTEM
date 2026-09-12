import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { db } from "@/lib/server/db";
import { appUrl, sendEmail } from "@/lib/server/email";

export const auth = betterAuth({
  appName: "POS System",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      after(async () => {
        try { await sendEmail(user.email, "Reset your POS System password", `Use this link to reset your password:\n${url}\n\nIf you did not request this, ignore this email.`); }
        catch { console.error("Password reset email delivery failed. Check Resend configuration; the user can request a new link."); }
      });
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      after(async () => {
        try {
          const verificationUrl = new URL(url);
          verificationUrl.searchParams.set("callbackURL", `${appUrl()}/verify-email?checked=1`);
          await sendEmail(user.email, "Verify your POS System email", `Verify your email address:\n${verificationUrl}`);
        }
        catch { console.error("Verification email delivery failed. Check Resend configuration; the user can request a new link."); }
      });
    },
  },
  user: {
    additionalFields: {
      platformRole: { type: "string", defaultValue: "NONE", input: false },
      status: { type: "string", defaultValue: "ACTIVE", input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60, cookieCache: { enabled: false } },
  databaseHooks: {
    session: { create: { before: async (session) => {
      const user = await db.user.findUnique({ where: { id: session.userId }, select: { status: true } });
      if (!user || user.status !== "ACTIVE") return false;
      return { data: session };
    } } },
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 30, customRules: {
    "/sign-in/email": { window: 60, max: 5 },
    "/request-password-reset": { window: 300, max: 3 },
    "/send-verification-email": { window: 300, max: 3 },
  } },
  plugins: [nextCookies()],
});
