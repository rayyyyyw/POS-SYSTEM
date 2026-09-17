import "server-only";
import { z } from "zod";

const emailFailureMessages = {
  configuration: "Check the server email configuration and APP_URL. No secret values are shown here.",
  missing_api_key: "RESEND_API_KEY is missing from the server environment. Configure it privately and restart the application.",
  invalid_message: "The email message is invalid. Ask the administrator to review the email implementation.",
  invalid_sender: "The sender address is invalid. Check RESEND_FROM_EMAIL or legacy EMAIL_FROM.",
  invalid_recipient: "The invited email address was rejected. Check the intended recipient; do not substitute the test email.",
  authentication: "Resend rejected the API key or its permissions. Check the key status and sending-domain scope privately.",
  recipient_restriction: "Resend's onboarding@resend.dev sender can only send real emails to your Resend account address. Verify a sending domain and update RESEND_FROM_EMAIL to invite other owners. The intended recipient has not been changed.",
  unverified_domain: "Resend has not verified the sending domain. Verify that domain and configure RESEND_FROM_EMAIL before retrying.",
  sender_or_recipient: "Resend rejected the sender or recipient. Check the matching Resend API log and domain configuration.",
  rate_limit: "Resend reports a sending limit or quota. Check usage and wait before retrying.",
  provider: "Resend rejected the email request. Check its API log and service status before retrying.",
  uncertain: "Email submission could not be confirmed. Check Resend logs before retrying; a timeout may occur after acceptance.",
} as const;

export class EmailDeliveryError extends Error {
  constructor(public readonly code: keyof typeof emailFailureMessages) {
    super(emailFailureMessages[code]);
    this.name = "EmailDeliveryError";
  }
}

export const emailAddress = z.string().trim().email().max(254);

export function appUrl() {
  try {
    const url = new URL(process.env.APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim() || "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
        url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
    return url.origin;
  } catch {
    throw new EmailDeliveryError("configuration");
  }
}

export function accountEmailUrl(path: "/accept-invitation" | "/login") {
  return new URL(path, appUrl());
}

// Better Auth generates the token URL; keep its destination on our configured
// origin and force the callback to the appropriate local account page.
export function authEmailUrl(value: string, kind: "reset" | "verification") {
  try {
    const url = new URL(value);
    const expectedPath = kind === "reset" ? "/api/auth/reset-password/" : "/api/auth/verify-email";
    if (url.origin !== appUrl() || url.username || url.password ||
        (kind === "reset" ? !url.pathname.startsWith(expectedPath) : url.pathname !== expectedPath)) throw new Error();
    url.searchParams.set("callbackURL", `${appUrl()}${kind === "reset" ? "/reset-password" : "/verify-email?checked=1"}`);
    return url.toString();
  } catch {
    throw new EmailDeliveryError("configuration");
  }
}

export function emailConfiguration() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "onboarding@resend.dev");
  const replyTo = process.env.ADMIN_EMAIL?.trim() || undefined;
  const senderAddress = from.match(/^[^<>]+<([^<>]+)>$/)?.[1] ?? from;
  if (!key?.trim()) throw new EmailDeliveryError("missing_api_key");
  if (!from) throw new EmailDeliveryError("configuration");
  if (/[\r\n]/.test(from) || !emailAddress.safeParse(senderAddress).success) throw new EmailDeliveryError("invalid_sender");
  if (replyTo && !emailAddress.safeParse(replyTo).success) throw new EmailDeliveryError("configuration");
  return { key, from, replyTo };
}
