import "server-only";

export function appUrl() {
  const value = process.env.BETTER_AUTH_URL;
  if (!value) throw new Error("Configure BETTER_AUTH_URL before sending account emails.");
  return new URL(value).origin;
}

// Delivery happens after business transactions commit. Never log tokens or recipients.
export async function sendEmail(to: string, subject: string, text: string, idempotencyKey?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Email delivery failed. Please retry.");
}
