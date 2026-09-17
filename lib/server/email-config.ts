import "server-only";
import { z } from "zod";

export class EmailDeliveryError extends Error {
  constructor(public readonly code: "configuration" | "invalid_message" | "authentication" | "sender_or_recipient" | "rate_limit" | "provider" | "uncertain") {
    super(`Email submission failed (${code}). Check server configuration and Resend logs.`);
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
  if (!key?.trim() || /[\r\n]/.test(from) || !emailAddress.safeParse(senderAddress).success ||
      (replyTo && !emailAddress.safeParse(replyTo).success)) throw new EmailDeliveryError("configuration");
  return { key, from, replyTo };
}
