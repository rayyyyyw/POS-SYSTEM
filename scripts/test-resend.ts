// Temporary, operator-run test only. Never import this script into the app.
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { Resend, type ErrorResponse } from "resend";
import { z } from "zod";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

function fail(category: string, message: string, statusCode?: number | null) {
  console.log(JSON.stringify({ success: false, category, message, ...(typeof statusCode === "number" ? { statusCode } : {}) }, null, 2));
  process.exitCode = 1;
}

function reportProviderError(error: ErrorResponse) {
  // Inspect provider details for diagnosis, but never print raw errors, headers,
  // client instances, or request bodies that might contain credentials.
  const message = typeof error.message === "string" ? error.message : "";
  const code: string = error.name;
  if (code === "missing_api_key") {
    fail("missing_api_key", "Resend did not receive an API key. Check RESEND_API_KEY in the local environment.", error.statusCode);
  } else if (code === "invalid_api_key" || /api key is invalid|invalid api key/i.test(message)) {
    fail("invalid_api_key", "Resend rejected the API key. Check its status in the Resend dashboard; never paste the key into chat.", error.statusCode);
  } else if (["restricted_api_key", "suspended_api_key", "invalid_permission", "invalid_access"].includes(code)) {
    fail("api_key_permissions", "The key is inactive, restricted, or lacks permission for this sender. Check its sending permission and domain scope in Resend.", error.statusCode);
  } else if (/only send testing emails|own email address/i.test(message)) {
    fail("testing_recipient_restriction", "The resend.dev sender can only send to your Resend account email. Set RESEND_TEST_EMAIL to that address, or use a verified custom sender.", error.statusCode);
  } else if (/domain.*not verified|verify.*domain|unverified.*domain/i.test(message)) {
    fail("sender_domain_verification", "The sender domain is not verified for this Resend account. Verify it, or use --from onboarding@resend.dev with your Resend account email as --to.", error.statusCode);
  } else if (code === "invalid_from_address") {
    fail("sender_address", "The sender address was rejected. Check --from or EMAIL_FROM.", error.statusCode);
  } else if (/recipient|\bto\b.*email/i.test(message)) {
    fail("recipient_restriction", "Resend rejected the recipient. Check RESEND_TEST_EMAIL or --to and the recipient restrictions in your Resend dashboard.", error.statusCode);
  } else if (/quota|rate_limit/.test(code)) {
    fail("sending_limit", "Resend reports a sending quota or rate limit. Check your usage before retrying.", error.statusCode);
  } else if (code === "application_error" && error.statusCode == null) {
    fail("network_or_timeout", "No API response was received. Check internet, DNS, proxy/firewall access to api.resend.com, and Resend status. Check Resend logs before retrying because acceptance may be uncertain.");
  } else {
    fail("provider_rejection", "Resend rejected the request. Check the matching API log in your Resend dashboard for the provider's exact reason.", error.statusCode);
  }
}

async function main() {
  let args;
  try {
    args = parseArgs({ options: { to: { type: "string" }, from: { type: "string" }, check: { type: "boolean" }, help: { type: "boolean" } }, allowPositionals: false }).values;
  } catch {
    fail("arguments", "Use: npm run test:resend. Configure RESEND_TEST_EMAIL first. Options after --: --to ADDRESS, --from ADDRESS, --check (no send), --help.");
    return;
  }
  if (args.help) {
    console.log("Run from the repository root:\nnpm run test:resend\n\nConfigure RESEND_API_KEY and RESEND_TEST_EMAIL in .env.local (or .env / your shell). One email per invocation. --to overrides RESEND_TEST_EMAIL. --from overrides EMAIL_FROM; otherwise the default is onboarding@resend.dev. With that sender, use your Resend account email as the recipient. Pass options after --, for example: npm run test:resend -- --check. --check checks key presence without sending or verifying key validity. No dev server is required.");
    return;
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    fail("missing_environment_variable", "RESEND_API_KEY is missing or empty. Configure it in .env.local, .env, or your shell environment, then rerun this command.");
    return;
  }
  if (args.check) {
    console.log(JSON.stringify({ success: true, configured: true, message: "RESEND_API_KEY is present. No email sent; key validity has not been verified." }, null, 2));
    return;
  }

  const to = args.to?.trim() || process.env.RESEND_TEST_EMAIL?.trim();
  const from = args.from?.trim() || process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev";
  const address = z.string().email().max(254);
  if (!address.safeParse(to).success) {
    fail("recipient_input", "Set RESEND_TEST_EMAIL in .env.local to one valid email, or provide --to. With onboarding@resend.dev, use the email address registered to your Resend account.");
    return;
  }
  if (/[\r\n]/.test(from) || !address.safeParse(from.match(/<([^<>]+)>$/)?.[1] ?? from).success) {
    fail("sender_input", "Provide a valid --from address, configure EMAIL_FROM, or use --from onboarding@resend.dev.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY, { baseUrl: "https://api.resend.com" });
  // This installed SDK logs raw provider errors outside production. Suppress
  // those logs only during this standalone call; our output is allowlisted.
  const originalConsoleError = console.error;
  let result;
  try {
    console.error = () => {};
    const options = { idempotencyKey: randomUUID(), signal: AbortSignal.timeout(15000) };
    result = await resend.emails.send({
      from,
      to: [to!],
      subject: "POS-SYSTEM Resend Test",
      text: "Resend has been successfully connected to the POS-SYSTEM.",
    }, options);
  } finally {
    console.error = originalConsoleError;
  }
  if (result.error) {
    reportProviderError(result.error);
    return;
  }
  // A successful response is acceptance, not proof of inbox delivery.
  const emailId = z.string().uuid().safeParse(result.data?.id);
  if (!emailId.success) {
    fail("unexpected_response", "Resend returned an unexpected response. Check the dashboard before retrying to avoid a duplicate email.");
    return;
  }
  console.log(JSON.stringify({ success: true, emailId: emailId.data, message: "Resend accepted the test email. Check your inbox and spam folder." }, null, 2));
}

main().catch(() => {
  fail("local_runtime_error", "The test could not complete locally. Check Node.js (20 or newer), the installed resend/tsx packages, and network access. Check Resend logs before retrying; raw errors are intentionally withheld to protect secrets.");
});
