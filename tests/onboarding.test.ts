import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { verifyPassword } from "better-auth/crypto";
import { createIsolatedDatabase } from "./support/database";
import { DomainError } from "../lib/domain/policies";

test("onboarding persists individual identities and handles invalid invitations", { timeout: 120_000 }, async (t) => {
  const fixture = await createIsolatedDatabase();
  const original = { DATABASE_URL: process.env.DATABASE_URL, RESEND_API_KEY: process.env.RESEND_API_KEY };
  process.env.DATABASE_URL = fixture.url;
  process.env.RESEND_API_KEY = "";
  const { db } = await import("../lib/server/db");
  try {
    const services = await import("../lib/server/admin-service");
    const invitations = await import("../lib/server/invitations");
    const { requestAccess } = await import("../app/actions/access");
    const admin = await db.user.create({ data: { id: randomUUID(), name: "Test Admin", email: "admin@example.test", emailVerified: true, platformRole: "ADMIN" } });
    const password = "Disposable-onboarding-test-2026";
    const input = () => ({ name: "Test Kitchen", slug: `kitchen-${randomBytes(6).toString("hex")}`, city: "Test City", ownerName: "Test Owner", ownerEmail: `${randomUUID()}@example.test` });
    // Only test records get a known token; production tokens are never retrieved.
    const knownInvitation = async (email?: string) => {
      const fields = { ...input(), ...(email ? { ownerEmail: email } : {}) };
      const created = await services.createRestaurant(admin.id, fields);
      const secret = invitations.newInvitationToken();
      await db.invitation.update({ where: { id: created.invitationId }, data: { tokenHash: secret.tokenHash, expiresAt: secret.expiresAt } });
      return { ...created, ...secret, email: fields.ownerEmail };
    };

    await t.test("owner accepts once, gets a hashed credential, and enables activation", async () => {
      const invite = await knownInvitation();
      assert.equal(await invitations.acceptInvitation({ token: invite.token, name: "Invited Owner", password }, null), false);
      const user = await db.user.findUniqueOrThrow({ where: { email: invite.email }, include: { accounts: true, memberships: true } });
      assert.equal(user.emailVerified, true);
      assert.equal(user.platformRole, "NONE");
      assert.equal(user.memberships[0]?.restaurantId, invite.id);
      assert.equal(user.memberships[0]?.role, "OWNER");
      assert.equal(user.accounts[0]?.providerId, "credential");
      assert.ok(await verifyPassword({ hash: user.accounts[0].password!, password }));
      await assert.rejects(invitations.acceptInvitation({ token: invite.token }, { id: user.id }), DomainError);
      await services.changeRestaurantStatus(admin.id, { id: invite.id, version: 0, status: "ACTIVE", reason: "Owner accepted invitation." });
      assert.equal((await db.restaurant.findUniqueOrThrow({ where: { id: invite.id } })).status, "ACTIVE");
      assert.equal(await db.auditEvent.count({ where: { restaurantId: invite.id, title: "Invitation accepted" } }), 1);
    });

    await t.test("existing users must authenticate as the invited identity and can join multiple tenants", async () => {
      const first = await knownInvitation();
      await invitations.acceptInvitation({ token: first.token, name: "Multi Restaurant Owner", password }, null);
      const user = await db.user.findUniqueOrThrow({ where: { email: first.email } });
      const second = await knownInvitation(first.email);
      for (const identity of [null, { id: admin.id }]) {
        await assert.rejects(invitations.acceptInvitation({ token: second.token }, identity), DomainError);
      }
      assert.equal(await invitations.acceptInvitation({ token: second.token, role: "ADMIN", userId: admin.id }, { id: user.id }), true);
      assert.equal(await db.user.count({ where: { email: user.email } }), 1);
      assert.equal(await db.restaurantMembership.count({ where: { userId: user.id, role: "OWNER" } }), 2);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).platformRole, "NONE");
    });

    await t.test("expired, revoked, suspended and archived invitations create no account or membership", async () => {
      for (const scenario of ["expired", "revoked", "suspended", "archived"] as const) {
        const invite = await knownInvitation();
        if (scenario === "expired") await db.invitation.update({ where: { id: invite.invitationId }, data: { expiresAt: new Date(0) } });
        if (scenario === "revoked") await invitations.revokeInvitation(admin.id, invite.invitationId);
        if (scenario === "suspended" || scenario === "archived") await db.restaurant.update({ where: { id: invite.id }, data: { status: scenario === "suspended" ? "SUSPENDED" : "ARCHIVED" } });
        await assert.rejects(invitations.acceptInvitation({ token: invite.token, name: "Invalid Invite", password }, null), DomainError);
        assert.equal(await db.user.findUnique({ where: { email: invite.email } }), null);
        assert.equal(await db.restaurantMembership.count({ where: { restaurantId: invite.id } }), 0);
      }
    });

    await t.test("concurrent acceptance grants exactly one membership and records one acceptance", async () => {
      const invite = await knownInvitation();
      const payload = { token: invite.token, name: "Concurrent Owner", password };
      const results = await Promise.allSettled([invitations.acceptInvitation(payload, null), invitations.acceptInvitation(payload, null)]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
      assert.equal(await db.user.count({ where: { email: invite.email } }), 1);
      assert.equal(await db.restaurantMembership.count({ where: { restaurantId: invite.id } }), 1);
      assert.equal(await db.auditEvent.count({ where: { restaurantId: invite.id, title: "Invitation accepted" } }), 1);
    });

    await t.test("delivery retries rotate the token, enforce cooldown, and retain failures for retry", async () => {
      const invite = await knownInvitation();
      await assert.rejects(invitations.resendInvitation(admin.id, invite.invitationId), /Wait one minute/);
      await db.invitation.update({ where: { id: invite.invitationId }, data: { lastSentAt: new Date(Date.now() - 61_000) } });
      assert.equal(await invitations.resendInvitation(admin.id, invite.invitationId), false);
      const saved = await db.invitation.findUniqueOrThrow({ where: { id: invite.invitationId } });
      assert.notEqual(saved.tokenHash, invite.tokenHash);
      assert.equal(saved.deliveryStatus, "FAILED");
      assert.equal(saved.status, "PENDING");
      await assert.rejects(invitations.acceptInvitation({ token: invite.token, name: "Old Token", password }, null), DomainError);
    });

    await t.test("public requests validate, persist, resist overwrites, and convert atomically once", async () => {
      const email = `${randomUUID()}@example.test`;
      const form = () => {
        const data = new FormData();
        for (const [key, value] of Object.entries({ name: "Request Owner", email, restaurantName: "Requested Kitchen", city: "Test City", consent: "on", website: "" })) data.set(key, value);
        return data;
      };
      const invalid = form();
      invalid.delete("consent");
      assert.ok((await requestAccess({ message: "" }, invalid)).errors?.consent);
      assert.equal(await db.accessRequest.count(), 0);
      const results = await Promise.all([requestAccess({ message: "" }, form()), requestAccess({ message: "" }, form())]);
      assert.ok(results.every(result => result.success), JSON.stringify(results));
      assert.equal(await db.accessRequest.count({ where: { email } }), 1);
      const request = await db.accessRequest.findUniqueOrThrow({ where: { email } });
      await services.reviewAccessRequest(admin.id, { id: request.id, status: "REVIEWED" });
      const changed = form();
      changed.set("name", "Overwrite Attempt");
      assert.equal((await requestAccess({ message: "" }, changed)).success, true);
      assert.equal((await db.accessRequest.findUniqueOrThrow({ where: { email } })).name, "Request Owner");
      assert.equal((await db.accessRequest.findUniqueOrThrow({ where: { email } })).status, "REVIEWED");
      assert.match((await requestAccess({ message: "" }, form())).message, /Too many attempts/);
      const restaurantInput = { ...input(), ownerEmail: email, requestId: request.id };
      const created = await services.createRestaurant(admin.id, restaurantInput);
      assert.equal((await db.accessRequest.findUniqueOrThrow({ where: { email } })).status, "CLOSED");
      const before = await db.restaurant.count();
      await assert.rejects(services.createRestaurant(admin.id, { ...restaurantInput, slug: `${restaurantInput.slug}-duplicate` }));
      assert.equal(await db.restaurant.count(), before);
      assert.equal(await db.invitation.count({ where: { restaurantId: created.id } }), 1);
    });

    await t.test("simultaneous first requests remain idempotent across repeated races", async () => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const email = `${randomUUID()}@example.test`;
        const submit = () => {
          const form = new FormData();
          for (const [key, value] of Object.entries({ name: "Concurrent Request", email, restaurantName: "Concurrent Kitchen", city: "Test City", consent: "on", website: "" })) form.set(key, value);
          return requestAccess({ message: "" }, form);
        };
        const results = await Promise.all([submit(), submit()]);
        assert.ok(results.every(result => result.success), JSON.stringify(results));
        assert.equal(await db.accessRequest.count({ where: { email } }), 1);
      }
    });
  } finally {
    await db.$disconnect();
    await fixture.cleanup();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
