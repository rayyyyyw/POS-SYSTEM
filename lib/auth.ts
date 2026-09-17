import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { db } from "@/lib/server/db";
import { sendEmail } from "@/lib/server/email";
import { appUrl, authEmailUrl, EmailDeliveryError } from "@/lib/server/email-config";
import { passwordResetEmail, passwordChangedEmail, verificationEmail } from "@/lib/server/email-templates";

function reportEmailFailure(error: unknown) {
  console.error("Account email submission failed:", error instanceof EmailDeliveryError ? error.code : "internal");
}

export const auth = betterAuth({
  appName: "POS System",
  baseURL: process.env.APP_URL || process.env.BETTER_AUTH_URL ? appUrl() : undefined,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      after(async () => {
        try { await sendEmail(user.email, passwordResetEmail(authEmailUrl(url, "reset"))); }
        catch (error) { reportEmailFailure(error); }
      });
    },
    onPasswordReset: async ({ user }) => {
      after(async () => {
        try { await sendEmail(user.email, passwordChangedEmail()); }
        catch (error) { reportEmailFailure(error); }
      });
    },
  },
  verification: { storeIdentifier: "hashed" },
  emailVerification: {
    sendOnSignIn: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      after(async () => {
        try {
          await sendEmail(user.email, verificationEmail(authEmailUrl(url, "verification")));
        }
        catch (error) { reportEmailFailure(error); }
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
