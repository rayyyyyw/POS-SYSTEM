import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sendEmail } from "../lib/server/email";
import { appUrl, authEmailUrl, emailConfiguration, EmailDeliveryError } from "../lib/server/email-config";
import { invitationEmail, passwordResetEmail, ownershipChangedEmail } from "../lib/server/email-templates";

test("transactional email is server-configured, escaped and fails without secret exposure", async t => {
  const keys = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "EMAIL_FROM", "ADMIN_EMAIL", "APP_URL", "BETTER_AUTH_URL", "NODE_ENV"];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  let requests: RequestInit[] = [];
  let response = () => Response.json({ id: randomUUID() });
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "https://api.resend.com/emails");
    requests.push(options);
    return response();
  });
  const logs: unknown[] = [];
  t.mock.method(console, "error", (...values: unknown[]) => { logs.push(values); });
  const defaults = () => {
    Object.assign(process.env, { RESEND_API_KEY: "disposable-test-key", RESEND_FROM_EMAIL: "POS System <sender@example.test>", EMAIL_FROM: "", ADMIN_EMAIL: "admin@example.test", APP_URL: "http://localhost:3000", BETTER_AUTH_URL: "http://localhost:3000", NODE_ENV: "test" });
    requests = [];
    response = () => Response.json({ id: randomUUID() });
  };
  const message = passwordResetEmail("http://localhost:3000/reset-password?token=disposable-token");
  try {
    await t.test("missing key, invalid sender and invalid admin contact fail before network I/O", async () => {
      for (const [key, value] of [["RESEND_API_KEY", ""], ["RESEND_FROM_EMAIL", "invalid"], ["ADMIN_EMAIL", "invalid"]]) {
        defaults(); process.env[key] = value;
        await assert.rejects(sendEmail("owner@example.test", message), { code: "configuration" });
        assert.equal(requests.length, 0);
      }
    });
    await t.test("sender precedence, legacy compatibility and explicit production configuration", () => {
      defaults();
      process.env.EMAIL_FROM = "legacy@example.test";
      assert.equal(emailConfiguration().from, "POS System <sender@example.test>");
      process.env.RESEND_FROM_EMAIL = "";
      assert.equal(emailConfiguration().from, "legacy@example.test");
      process.env.EMAIL_FROM = "";
      assert.equal(emailConfiguration().from, "onboarding@resend.dev");
      Object.assign(process.env, { NODE_ENV: "production" });
      assert.throws(emailConfiguration, { code: "configuration" });
    });
    await t.test("submits exactly once and returns acceptance, not delivery", async () => {
      defaults();
      const id = randomUUID(); response = () => Response.json({ id });
      assert.deepEqual(await sendEmail("owner@example.test", message, "test-idempotency"), { status: "submitted", emailId: id });
      assert.equal(requests.length, 1);
      const request = requests[0];
      const body = JSON.parse(String(request.body));
      assert.deepEqual(body.to, ["owner@example.test"]);
      assert.equal(body.reply_to, "admin@example.test");
      assert.equal(body.subject, message.subject);
      assert.ok(body.html.includes("Reset password"));
      assert.equal(new Headers(request.headers).get("Idempotency-Key"), "test-idempotency");
      assert.equal(request.redirect, "error");
      assert.ok(request.signal);
      assert.equal(request.cache, "no-store");
    });
    await t.test("provider errors and timeouts never leak raw responses or retry automatically", async () => {
      for (const [status, code] of [[401, "authentication"], [403, "sender_or_recipient"], [422, "sender_or_recipient"], [429, "rate_limit"], [503, "provider"]] as const) {
        defaults(); response = () => Response.json({ message: "disposable-test-key secret-token-url owner@example.test" }, { status });
        await assert.rejects(sendEmail("owner@example.test", message), error => error instanceof EmailDeliveryError && error.code === code && !error.message.includes("disposable-test-key"));
        assert.equal(requests.length, 1);
      }
      defaults(); response = () => { throw new Error("disposable-test-key"); };
      await assert.rejects(sendEmail("owner@example.test", message), { code: "uncertain" });
      assert.equal(requests.length, 1);
      defaults(); response = () => Response.json({ success: true });
      await assert.rejects(sendEmail("owner@example.test", message), { code: "uncertain" });
      assert.equal(logs.length, 0);
    });
    await t.test("invalid recipients and header injection are rejected", async () => {
      defaults();
      await assert.rejects(sendEmail("owner@example.test,other@example.test", message), { code: "invalid_message" });
      await assert.rejects(sendEmail("owner@example.test", { ...message, subject: "Subject\r\nBcc: other@example.test" }), { code: "invalid_message" });
      assert.equal(requests.length, 0);
    });
    await t.test("account URLs cannot redirect to another origin or embed credentials", () => {
      defaults();
      assert.equal(appUrl(), "http://localhost:3000");
      const url = new URL(authEmailUrl("http://localhost:3000/api/auth/reset-password/test?callbackURL=https://evil.example", "reset"));
      assert.equal(url.searchParams.get("callbackURL"), "http://localhost:3000/reset-password");
      assert.throws(() => authEmailUrl("https://evil.example/api/auth/reset-password/test", "reset"));
      for (const bad of ["javascript:alert(1)", "https://user:password@example.test", "http://example.test", "https://example.test/path", "https://example.test?token=test"]) {
        process.env.APP_URL = bad;
        assert.throws(appUrl, { code: "configuration" });
      }
      process.env.APP_URL = "";
      assert.equal(appUrl(), "http://localhost:3000");
    });
    await t.test("branded templates escape restaurant names, offer plaintext and explain security", () => {
      defaults();
      const invite = invitationEmail({ restaurantName: '<img src=x onerror="alert(1)">', email: "owner@example.test", owner: true, expiresAt: new Date("2026-12-01T00:00:00Z"), url: "http://localhost:3000/accept-invitation?token=test" });
      assert.match(invite.subject, /^You're invited to manage/);
      assert.ok(!invite.html.includes("<img"));
      assert.ok(invite.html.includes("&lt;img"));
      assert.ok(invite.html.includes("Set Password &amp; Activate Account"));
      assert.ok(invite.text.includes("owner@example.test"));
      assert.ok(invite.text.includes("72 hours"));
      assert.ok(invite.text.includes("http://localhost:3000/accept-invitation?token=test"));
      assert.match(ownershipChangedEmail("Kitchen", false).text, /now a manager/);
    });
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
