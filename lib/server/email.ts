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
  if (!recipient.success || !message.subject || /[\r\n]/.test(message.subject)) throw new EmailDeliveryError("invalid_message");
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
    const code = response.status === 401 ? "authentication" : response.status === 403 || response.status === 422 ? "sender_or_recipient" : response.status === 429 ? "rate_limit" : "provider";
    throw new EmailDeliveryError(code);
  }
  const accepted = z.object({ id: z.string().uuid() }).safeParse(await response.json().catch(() => null));
  if (!accepted.success) throw new EmailDeliveryError("uncertain");
  return { status: "submitted" as const, emailId: accepted.data.id };
}
