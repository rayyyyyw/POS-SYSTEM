import "server-only";
import { z } from "zod";
import { emailAddress, emailConfiguration, EmailDeliveryError } from "./email-config";
import type { EmailMessage } from "./email-templates";

// Retain the existing REST transport: the installed SDK logs raw API errors in
// development. Do not suppress global console methods in a concurrent server.
// Never log request bodies, credentials, token URLs, or raw provider errors.
export async function sendEmail(to: string, message: EmailMessage, idempotencyKey?: string) {
  const { key, from, replyTo } = emailConfiguration();
  const recipient = emailAddress.safeParse(to);
  if (!recipient.success) throw new EmailDeliveryError("invalid_recipient");
  if (!message.subject || /[\r\n]/.test(message.subject)) throw new EmailDeliveryError("invalid_message");
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify({ from, to: [recipient.data], ...message, ...(replyTo ? { reply_to: replyTo } : {}) }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
    redirect: "error",
  });
  } catch {
    // A timeout may occur after acceptance. Check Resend logs before retrying.
    throw new EmailDeliveryError("uncertain");
  }
  if (!response.ok) {
    // Provider text is inspected only to select a fixed, safe diagnostic. Never
    // return/log the raw body: it can contain addresses or sensitive input.
    const parsed = z.object({ name: z.string().optional(), message: z.string().optional() }).safeParse(await response.json().catch(() => null));
    const name = parsed.success ? parsed.data.name ?? "" : "";
    const detail = parsed.success ? parsed.data.message ?? "" : "";
    const code = response.status === 401 || ["invalid_api_key", "restricted_api_key", "suspended_api_key", "invalid_permission"].includes(name) || /invalid api key|api key is invalid/i.test(detail) ? "authentication"
      : /only send testing emails|own email address/i.test(detail) ? "recipient_restriction"
      : /domain.*not verified|verify.*domain|unverified.*domain/i.test(detail) ? "unverified_domain"
      : name === "invalid_from_address" ? "invalid_sender"
      : /recipient|\bto\b.*(?:invalid|email)|invalid.*\bto\b/i.test(detail) ? "invalid_recipient"
      : response.status === 429 || /quota|rate_limit/.test(name) ? "rate_limit"
      : response.status === 403 || response.status === 422 ? "sender_or_recipient" : "provider";
    throw new EmailDeliveryError(code);
  }
  const accepted = z.object({ id: z.string().uuid() }).safeParse(await response.json().catch(() => null));
  if (!accepted.success) throw new EmailDeliveryError("uncertain");
  return { status: "submitted" as const, emailId: accepted.data.id };
}
