import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { Client } from "pg";
import type { PrismaClient } from "../generated/prisma/client";
import { DomainError } from "../lib/domain/policies";
import { createIsolatedDatabase } from "./support/database";

// Every write, including migration DDL and deliberate failure triggers, stays in
// this newly created schema. The application's normal schema is never reset.
test("database services preserve permissions and business invariants", { timeout: 120_000 }, async (t) => {
  const fixture = await createIsolatedDatabase();
  const originalEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  };
  const schema = fixture.schema;
  const validateSchema = () => assert.match(schema, /^pos_test_[a-f0-9]{24}$/);
  validateSchema();
  const setup = new Client({ connectionString: fixture.url, connectionTimeoutMillis: 5000 });
  let db: PrismaClient | undefined;

  try {
    await setup.connect();
    process.env.DATABASE_URL = fixture.url;
    process.env.RESEND_API_KEY = ""; // These tests must never send an email.
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");

    db = (await import("../lib/server/db")).db;
    const database = db;
    const services = await import("../lib/server/admin-service");
    const { transaction, assertAdmin } = await import("../lib/server/transaction");
    const prismaSchema = await database.$queryRaw<Array<{ schema_name: string }>>`SELECT current_schema() AS schema_name`;
    assert.equal(prismaSchema[0]?.schema_name, schema, "Prisma must be connected only to the isolated test schema.");

    const createUser = (label: string, extra: { platformRole?: "ADMIN" | "NONE"; status?: "ACTIVE" | "DISABLED"; emailVerified?: boolean } = {}) => database.user.create({
      data: {
        id: randomUUID(),
        name: `Test ${label}`,
        email: `${randomUUID()}@example.test`,
        emailVerified: true,
        ...extra,
      },
    });
    const admin = await createUser("Administrator", { platformRole: "ADMIN" });
    const restaurantInput = (slug = `test-${randomBytes(6).toString("hex")}`) => ({
      name: "Test Restaurant",
      slug,
      city: "Test City",
      email: "",
      phone: "",
      ownerName: "Test Owner",
      ownerEmail: `${randomUUID()}@example.test`,
    });
    const createRestaurant = () => services.createRestaurant(admin.id, restaurantInput());
    const addOwner = async (restaurantId: string) => {
      const owner = await createUser("Owner");
      const membership = await database.restaurantMembership.create({
        data: { restaurantId, userId: owner.id, role: "OWNER" },
      });
      return { owner, membership };
    };
    const activate = (restaurantId: string, version = 0) => services.changeRestaurantStatus(admin.id, {
      id: restaurantId, version, status: "ACTIVE", reason: "Owner onboarding completed.",
    });

    await t.test("a fresh schema has no invented restaurant data", async () => {
      assert.equal(await database.restaurant.count(), 0);
      assert.equal(await database.invitation.count(), 0);
      assert.equal(await database.auditEvent.count(), 0);
      assert.equal(await database.databaseConnectionTest.count(), 0);
    });

    await t.test("creation persists a pending restaurant, invitation, and audit even when mail is unconfigured", async () => {
      const input = restaurantInput();
      const result = await services.createRestaurant(admin.id, input);
      assert.equal(result.delivered, false);
      const restaurant = await database.restaurant.findUniqueOrThrow({ where: { id: result.id } });
      const invitation = await database.invitation.findUniqueOrThrow({ where: { id: result.invitationId } });
      const audit = await database.auditEvent.findFirstOrThrow({ where: { restaurantId: result.id } });
      assert.equal(restaurant.slug, input.slug);
      assert.equal(restaurant.status, "PENDING");
      assert.equal(invitation.email, input.ownerEmail);
      assert.equal(invitation.role, "OWNER");
      assert.equal(invitation.status, "PENDING");
      assert.equal(invitation.deliveryStatus, "FAILED");
      assert.match(invitation.tokenHash, /^[a-f0-9]{64}$/);
      assert.equal(audit.actorId, admin.id);
      assert.equal(audit.title, "Restaurant created");
    });

    await t.test("non-admin, disabled-admin, unverified-admin, and unknown actors cannot call admin services", async () => {
      const member = await createUser("Member");
      const disabledAdmin = await createUser("Disabled administrator", { platformRole: "ADMIN", status: "DISABLED" });
      const unverifiedAdmin = await createUser("Unverified administrator", { platformRole: "ADMIN", emailVerified: false });
      const before = await database.restaurant.count();
      const audits = await database.auditEvent.count();
      for (const actorId of [member.id, disabledAdmin.id, unverifiedAdmin.id, randomUUID()]) {
        await assert.rejects(transaction((tx) => assertAdmin(tx, actorId)), DomainError);
        await assert.rejects(services.createRestaurant(actorId, restaurantInput()), DomainError);
      }
      assert.equal(await database.restaurant.count(), before);
      assert.equal(await database.auditEvent.count(), audits);
      await database.user.update({ where: { id: unverifiedAdmin.id }, data: { status: "DISABLED" } });
    });

    await t.test("concurrent duplicate restaurant submissions produce exactly one restaurant and invitation", async () => {
      const input = restaurantInput();
      const results = await Promise.allSettled([
        services.createRestaurant(admin.id, input),
        services.createRestaurant(admin.id, input),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      const restaurant = await database.restaurant.findUniqueOrThrow({ where: { slug: input.slug } });
      assert.equal(await database.invitation.count({ where: { restaurantId: restaurant.id } }), 1);
      assert.equal(await database.auditEvent.count({ where: { restaurantId: restaurant.id } }), 1);
    });

    await t.test("stale edits cannot overwrite a newer saved restaurant", async () => {
      const result = await createRestaurant();
      const original = await database.restaurant.findUniqueOrThrow({ where: { id: result.id } });
      const update = { ...original, name: "Updated Restaurant", version: original.version };
      await services.updateRestaurant(admin.id, update);
      await assert.rejects(services.updateRestaurant(admin.id, { ...update, name: "Stale Restaurant" }), DomainError);
      const saved = await database.restaurant.findUniqueOrThrow({ where: { id: result.id } });
      assert.equal(saved.name, "Updated Restaurant");
      assert.equal(saved.version, original.version + 1);
      assert.equal(await database.auditEvent.count({ where: { restaurantId: result.id } }), 2);
    });

    await t.test("activation requires an active verified owner, and archive revokes pending invitations", async () => {
      const result = await createRestaurant();
      await assert.rejects(services.changeRestaurantStatus(admin.id, {
        id: result.id, version: 0, status: "SUSPENDED", reason: "Invalid pending transition.",
      }), DomainError);
      await assert.rejects(activate(result.id), DomainError);
      const { owner } = await addOwner(result.id);
      await database.user.update({ where: { id: owner.id }, data: { emailVerified: false } });
      await assert.rejects(activate(result.id), DomainError);
      await database.user.update({ where: { id: owner.id }, data: { emailVerified: true } });
      await activate(result.id);
      await services.changeRestaurantStatus(admin.id, { id: result.id, version: 1, status: "ARCHIVED", reason: "Restaurant archived for testing." });
      assert.equal((await database.invitation.findUniqueOrThrow({ where: { id: result.invitationId } })).status, "REVOKED");
      await assert.rejects(services.changeRestaurantStatus(admin.id, { id: result.id, version: 2, status: "ACTIVE", reason: "Invalid direct restoration." }), DomainError);
      await services.changeRestaurantStatus(admin.id, { id: result.id, version: 2, status: "PENDING", reason: "Restore for owner review." });
      assert.equal((await database.restaurant.findUniqueOrThrow({ where: { id: result.id } })).status, "PENDING");
    });

    await t.test("ownership transfer stays within a restaurant and retains exactly one owner", async () => {
      const result = await createRestaurant();
      const { owner, membership } = await addOwner(result.id);
      const manager = await createUser("Manager");
      const nextOwner = await database.restaurantMembership.create({ data: { restaurantId: result.id, userId: manager.id, role: "MANAGER" } });
      const otherRestaurant = await createRestaurant();
      const outsider = await createUser("Other restaurant manager");
      await database.restaurantMembership.create({ data: { restaurantId: otherRestaurant.id, userId: outsider.id, role: "MANAGER" } });
      await activate(result.id);
      const before = await database.auditEvent.count({ where: { restaurantId: result.id } });
      await assert.rejects(services.transferOwnership(admin.id, { restaurantId: result.id, userId: outsider.id, version: 1 }));
      assert.equal(await database.auditEvent.count({ where: { restaurantId: result.id } }), before);
      await services.transferOwnership(admin.id, { restaurantId: result.id, userId: manager.id, version: 1 });
      assert.equal((await database.restaurantMembership.findUniqueOrThrow({ where: { id: membership.id } })).role, "MANAGER");
      assert.equal((await database.restaurantMembership.findUniqueOrThrow({ where: { id: nextOwner.id } })).role, "OWNER");
      assert.equal(await database.restaurantMembership.count({ where: { restaurantId: result.id, role: "OWNER" } }), 1);
      assert.equal((await database.user.findUniqueOrThrow({ where: { id: owner.id } })).status, "ACTIVE");
      assert.equal((await database.invitation.findUniqueOrThrow({ where: { id: result.invitationId } })).status, "REVOKED");
      assert.equal(await database.auditEvent.count({ where: { restaurantId: result.id, title: "Ownership transferred" } }), 1);
    });

    await t.test("owner membership edits and duplicate owners are rejected", async () => {
      const result = await createRestaurant();
      const { membership } = await addOwner(result.id);
      await assert.rejects(services.updateMembership(admin.id, { membershipId: membership.id, expectedUpdatedAt: membership.updatedAt.toISOString(), role: "MANAGER", status: "DISABLED" }), DomainError);
      const other = await createUser("Second owner candidate");
      await assert.rejects(database.restaurantMembership.create({ data: { restaurantId: result.id, userId: other.id, role: "OWNER" } }));
      const saved = await database.restaurantMembership.findUniqueOrThrow({ where: { id: membership.id } });
      assert.equal(saved.role, "OWNER");
      assert.equal(saved.status, "ACTIVE");
    });

    await t.test("global owner suspension is blocked while their restaurant is active and revokes sessions when permitted", async () => {
      const result = await createRestaurant();
      const { owner } = await addOwner(result.id);
      await activate(result.id);
      await database.session.create({ data: { id: randomUUID(), userId: owner.id, token: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
      await assert.rejects(services.changeUserStatus(admin.id, { userId: owner.id, status: "DISABLED" }), DomainError);
      assert.equal((await database.user.findUniqueOrThrow({ where: { id: owner.id } })).status, "ACTIVE");
      assert.equal(await database.session.count({ where: { userId: owner.id } }), 1);
      await services.changeRestaurantStatus(admin.id, { id: result.id, version: 1, status: "SUSPENDED", reason: "Suspend operations before account change." });
      await services.changeUserStatus(admin.id, { userId: owner.id, status: "DISABLED" });
      assert.equal((await database.user.findUniqueOrThrow({ where: { id: owner.id } })).status, "DISABLED");
      assert.equal(await database.session.count({ where: { userId: owner.id } }), 0);
    });

    await t.test("persisted platform settings reject stale saves", async () => {
      const input = { name: "Test Platform", supportEmail: "support@example.test", timezone: "UTC", dateFormat: "YMD", version: 0 };
      await services.saveSettings(admin.id, input);
      await assert.rejects(services.saveSettings(admin.id, { ...input, name: "Stale settings" }), DomainError);
      const saved = await database.platformSettings.findUniqueOrThrow({ where: { id: "platform" } });
      assert.equal(saved.name, input.name);
      assert.equal(saved.timezone, "UTC");
      assert.equal(saved.version, 1);
    });

    await t.test("audit failure rolls back the restaurant and invitation in the same transaction", async () => {
      const input = restaurantInput();
      const before = { restaurants: await database.restaurant.count(), invitations: await database.invitation.count(), audits: await database.auditEvent.count() };
      validateSchema();
      await setup.query(`CREATE FUNCTION "${schema}".reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Deliberate isolated test audit failure'; END; $$`);
      try {
        await setup.query(`CREATE TRIGGER reject_test_audit BEFORE INSERT ON "${schema}"."AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_test_audit()`);
        try {
          await assert.rejects(services.createRestaurant(admin.id, input));
          assert.equal(await database.restaurant.count(), before.restaurants);
          assert.equal(await database.invitation.count(), before.invitations);
          assert.equal(await database.auditEvent.count(), before.audits);
          assert.equal(await database.restaurant.findUnique({ where: { slug: input.slug } }), null);
        } finally {
          await setup.query(`DROP TRIGGER reject_test_audit ON "${schema}"."AuditEvent"`);
        }
      } finally {
        await setup.query(`DROP FUNCTION "${schema}".reject_test_audit()`);
      }
    });

    await t.test("administrator self-disable and concurrent mutual disable cannot remove every administrator", async () => {
      assert.equal(await database.user.count({ where: { platformRole: "ADMIN", status: "ACTIVE" } }), 1);
      await assert.rejects(services.changeUserStatus(admin.id, { userId: admin.id, status: "DISABLED" }), DomainError);
      const secondAdmin = await createUser("Second administrator", { platformRole: "ADMIN" });
      const outcomes = await Promise.allSettled([
        services.changeUserStatus(admin.id, { userId: secondAdmin.id, status: "DISABLED" }),
        services.changeUserStatus(secondAdmin.id, { userId: admin.id, status: "DISABLED" }),
      ]);
      assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
      assert.equal(await database.user.count({ where: { platformRole: "ADMIN", status: "ACTIVE" } }), 1);
    });
  } finally {
    try {
      await db?.$disconnect();
    } finally {
      try {
        await setup.end();
      } finally {
        await fixture.cleanup();
        for (const [key, value] of Object.entries(originalEnv)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    }
  }
});
