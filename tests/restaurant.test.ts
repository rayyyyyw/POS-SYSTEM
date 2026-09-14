import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Client } from "pg";
import { DomainError } from "../lib/domain/policies";
import {
  canAccessRestaurant,
  buildOnboarding,
} from "../lib/domain/restaurant/policies";
import { restaurantSettingsInput } from "../lib/validation/restaurant";
import { createIsolatedDatabase } from "./support/database";

const settings = (restaurantId: string, version = 0) => ({
  restaurantId,
  version,
  name: "Updated Test Kitchen",
  city: "Test City",
  email: "kitchen@example.test",
  phone: "",
  addressLine1: "12 Test Street",
  addressLine2: "",
  countryCode: "PH",
  postalCode: "1000",
  timezone: "Asia/Manila",
  currencyCode: "PHP",
  locale: "en-PH",
  serviceMode: "QUICK_SERVICE",
  defaultOrderType: "TAKEOUT",
  orderNumberPrefix: "ORD",
  receiptHeader: "",
  receiptFooter: "Thank you",
});

test("restaurant policy separates tenant roles and lifecycle", () => {
  for (const status of [
    "ACTIVE",
    "PENDING",
    "SUSPENDED",
    "ARCHIVED",
  ] as const) {
    for (const role of ["OWNER", "MANAGER", "CASHIER"] as const) {
      assert.equal(
        canAccessRestaurant(role, status, "overview"),
        status === "ACTIVE" || (status === "PENDING" && role === "OWNER"),
      );
      assert.equal(
        canAccessRestaurant(role, status, "settingsWrite"),
        role === "OWNER" && ["ACTIVE", "PENDING"].includes(status),
      );
      assert.equal(
        canAccessRestaurant(role, status, "teamRead"),
        (status === "ACTIVE" && role !== "CASHIER") ||
          (status === "PENDING" && role === "OWNER"),
      );
    }
  }
});

test("regional validation rejects invalid values and normalizes persisted input", () => {
  const valid = settings("test-restaurant");
  assert.equal(
    restaurantSettingsInput.parse({
      ...valid,
      currencyCode: "php",
      countryCode: "ph",
      name: "  Kitchen  ",
    }).name,
    "Kitchen",
  );
  for (const bad of [
    { timezone: "Mars/Capital" },
    { timezone: "+08:00" },
    { currencyCode: "XYZ" },
    { locale: "not a locale" },
    { serviceMode: "UNKNOWN" },
    { defaultOrderType: "UNKNOWN" },
    { version: -1 },
    { receiptFooter: "x".repeat(301) },
    { orderNumberPrefix: "<script>" },
  ]) {
    assert.equal(
      restaurantSettingsInput.safeParse({ ...valid, ...bad }).success,
      false,
      JSON.stringify(bad),
    );
  }
  const onboarding = buildOnboarding({
    status: "ACTIVE",
    profileComplete: true,
    settingsComplete: true,
    ownerPresent: true,
    staffPresent: false,
  });
  assert.equal(onboarding.completed, 4);
  assert.equal(onboarding.total, 5);
  assert.ok(!onboarding.steps.some((step) => step.key === "menu"));
});

test(
  "restaurant services preserve isolation, ownership, settings and invitations",
  { timeout: 120_000 },
  async (t) => {
    const fixture = await createIsolatedDatabase();
    const original = {
      DATABASE_URL: process.env.DATABASE_URL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
    };
    process.env.DATABASE_URL = fixture.url;
    process.env.RESEND_API_KEY = "";
    process.env.EMAIL_FROM = "";
    const { db } = await import("../lib/server/db");
    const setup = new Client({ connectionString: fixture.url });
    try {
      const { saveRestaurantSettings } =
        await import("../lib/server/restaurant/services/settings-service");
      const { updateRestaurantMembership } =
        await import("../lib/server/restaurant/services/membership-service");
      const invites =
        await import("../lib/server/restaurant/services/invitation-service");
      const queries =
        await import("../lib/server/restaurant/services/query-service");
      const { transaction } = await import("../lib/server/transaction");
      const { assertRestaurantAccess } =
        await import("../lib/server/restaurant/access");
      const { acceptInvitation, newInvitationToken } =
        await import("../lib/server/invitations");
      await setup.connect();
      const user = (name: string, extra = {}) =>
        db.user.create({
          data: {
            id: randomUUID(),
            name,
            email: `${randomUUID()}@example.test`,
            emailVerified: true,
            ...extra,
          },
        });
      const owner = await user("Tenant Owner"),
        manager = await user("Tenant Manager"),
        cashier = await user("Tenant Cashier"),
        outsider = await user("Other Tenant Owner"),
        admin = await user("Platform Admin", { platformRole: "ADMIN" });
      const disabled = await user("Disabled Owner", { status: "DISABLED" }),
        unverified = await user("Unverified Owner", { emailVerified: false });
      const restaurant = await db.restaurant.create({
        data: {
          name: "First Kitchen",
          slug: "first-kitchen",
          status: "ACTIVE",
        },
      });
      const other = await db.restaurant.create({
        data: {
          name: "Private Other Kitchen",
          slug: "other-kitchen",
          status: "ACTIVE",
        },
      });
      const pending = await db.restaurant.create({
        data: { name: "Pending Kitchen", slug: "pending-kitchen" },
      });
      const ownerMembership = await db.restaurantMembership.create({
        data: { restaurantId: restaurant.id, userId: owner.id, role: "OWNER" },
      });
      const managerMembership = await db.restaurantMembership.create({
        data: {
          restaurantId: restaurant.id,
          userId: manager.id,
          role: "MANAGER",
        },
      });
      await db.restaurantMembership.createMany({
        data: [
          { restaurantId: restaurant.id, userId: cashier.id, role: "CASHIER" },
          { restaurantId: other.id, userId: outsider.id, role: "OWNER" },
          { restaurantId: pending.id, userId: owner.id, role: "OWNER" },
          { restaurantId: pending.id, userId: manager.id, role: "MANAGER" },
          { restaurantId: restaurant.id, userId: disabled.id, role: "MANAGER" },
          {
            restaurantId: restaurant.id,
            userId: unverified.id,
            role: "MANAGER",
          },
        ],
      });
      const inviteInput = (email = `${randomUUID()}@example.test`) => ({
        restaurantId: restaurant.id,
        name: "Invited Staff",
        email,
        role: "CASHIER",
      });
      const memberInput = () => ({
        restaurantId: restaurant.id,
        membershipId: managerMembership.id,
        expectedUpdatedAt: managerMembership.updatedAt.toISOString(),
        role: "CASHIER",
        status: "ACTIVE",
      });

      await t.test(
        "unknown, disabled, unverified and unrelated actors cannot read or mutate tenant data",
        async () => {
          for (const actorId of [
            randomUUID(),
            disabled.id,
            unverified.id,
            outsider.id,
            admin.id,
          ]) {
            await assert.rejects(
              queries.readRestaurantOverview(actorId, restaurant.id),
              DomainError,
            );
            await assert.rejects(
              queries.readRestaurantSettings(actorId, restaurant.id),
              DomainError,
            );
            await assert.rejects(
              queries.readRestaurantTeam(actorId, restaurant.id),
              DomainError,
            );
            await assert.rejects(
              saveRestaurantSettings(actorId, settings(restaurant.id)),
              DomainError,
            );
            await assert.rejects(
              invites.inviteRestaurantMember(actorId, inviteInput()),
              DomainError,
            );
            await assert.rejects(
              updateRestaurantMembership(actorId, memberInput()),
              DomainError,
            );
          }
          assert.equal(await db.restaurantSettings.count(), 0);
          assert.equal(await db.invitation.count(), 0);
          assert.equal(await db.auditEvent.count(), 0);
        },
      );

      await t.test(
        "owners save profile and settings atomically, with safe audit and stale-edit rejection",
        async () => {
          await saveRestaurantSettings(owner.id, settings(restaurant.id));
          const saved = await queries.readRestaurantSettings(
            owner.id,
            restaurant.id,
          );
          assert.equal(saved.name, "Updated Test Kitchen");
          assert.equal(saved.settings?.currencyCode, "PHP");
          assert.equal(saved.version, 1);
          assert.equal(
            await db.restaurantSettings.count({
              where: { restaurantId: restaurant.id },
            }),
            1,
          );
          await assert.rejects(
            saveRestaurantSettings(owner.id, {
              ...settings(restaurant.id),
              name: "Stale change",
            }),
            /changed/,
          );
          const health = await queries.readRestaurantOverview(
            owner.id,
            restaurant.id,
          );
          assert.equal(health.onboarding.completed, 5);
          assert.equal(health.activeMembers, 3);
          assert.ok(health.lastActivityAt);
          const audit = await db.auditEvent.findMany({
            where: { restaurantId: restaurant.id },
          });
          assert.equal(audit.length, 2);
          assert.ok(audit.every((event) => event.actorId === owner.id));
          assert.doesNotMatch(
            JSON.stringify(audit),
            /tokenHash|password|RESEND_API_KEY/,
          );
        },
      );

      await t.test(
        "manager read access and cashier restrictions are enforced in services",
        async () => {
          assert.equal(
            (await queries.readRestaurantSettings(manager.id, restaurant.id))
              .id,
            restaurant.id,
          );
          assert.equal(
            (await queries.readRestaurantTeam(manager.id, restaurant.id)).total,
            5,
          );
          await assert.rejects(
            queries.readRestaurantSettings(cashier.id, restaurant.id),
            DomainError,
          );
          await assert.rejects(
            queries.readRestaurantTeam(cashier.id, restaurant.id),
            DomainError,
          );
          assert.equal(
            (await queries.readRestaurantOverview(cashier.id, restaurant.id))
              .activeMembers,
            3,
          );
          for (const actor of [manager, cashier]) {
            await assert.rejects(
              saveRestaurantSettings(actor.id, settings(restaurant.id, 1)),
              DomainError,
            );
            await assert.rejects(
              invites.inviteRestaurantMember(actor.id, inviteInput()),
              DomainError,
            );
            await assert.rejects(
              updateRestaurantMembership(actor.id, memberInput()),
              DomainError,
            );
          }
        },
      );

      await t.test(
        "owners can prepare pending restaurants but staff must await activation",
        async () => {
          await saveRestaurantSettings(owner.id, settings(pending.id));
          assert.equal(
            (await queries.readRestaurantOverview(owner.id, pending.id))
              .onboarding.completed,
            4,
          );
          await assert.rejects(
            queries.readRestaurantOverview(manager.id, pending.id),
            DomainError,
          );
          await assert.rejects(
            saveRestaurantSettings(manager.id, settings(pending.id, 1)),
            DomainError,
          );
        },
      );

      await t.test(
        "suspension and archive block all data access beyond status and prevent mutations",
        async () => {
          const count = await db.auditEvent.count();
          for (const status of ["SUSPENDED", "ARCHIVED"] as const) {
            await db.restaurant.update({
              where: { id: restaurant.id },
              data: { status },
            });
            const context = await transaction((tx) =>
              assertRestaurantAccess(tx, owner.id, restaurant.id),
            );
            assert.equal(context.restaurant.status, status);
            await assert.rejects(
              queries.readRestaurantOverview(owner.id, restaurant.id),
              DomainError,
            );
            await assert.rejects(
              queries.readRestaurantSettings(owner.id, restaurant.id),
              DomainError,
            );
            await assert.rejects(
              queries.readRestaurantTeam(owner.id, restaurant.id),
              DomainError,
            );
            await assert.rejects(
              saveRestaurantSettings(owner.id, settings(restaurant.id, 1)),
              DomainError,
            );
            await assert.rejects(
              invites.inviteRestaurantMember(owner.id, inviteInput()),
              DomainError,
            );
            await assert.rejects(
              updateRestaurantMembership(owner.id, memberInput()),
              DomainError,
            );
          }
          assert.equal(await db.auditEvent.count(), count);
          await db.restaurant.update({
            where: { id: restaurant.id },
            data: { status: "ACTIVE" },
          });
        },
      );

      await t.test(
        "forged tenant and child IDs cannot alter other tenant memberships or invitations",
        async () => {
          const target = await db.restaurantMembership.findUniqueOrThrow({
            where: {
              restaurantId_userId: {
                restaurantId: other.id,
                userId: outsider.id,
              },
            },
          });
          const secret = newInvitationToken();
          const invitation = await db.invitation.create({
            data: {
              restaurantId: other.id,
              email: "other-invite@example.test",
              name: "Other",
              role: "CASHIER",
              tokenHash: secret.tokenHash,
              expiresAt: secret.expiresAt,
            },
          });
          await assert.rejects(
            saveRestaurantSettings(owner.id, settings(other.id)),
            DomainError,
          );
          await assert.rejects(
            updateRestaurantMembership(owner.id, {
              ...memberInput(),
              membershipId: target.id,
            }),
            DomainError,
          );
          for (const method of [
            invites.resendRestaurantInvitation,
            invites.revokeRestaurantInvitation,
          ]) {
            await assert.rejects(
              method(owner.id, {
                restaurantId: restaurant.id,
                invitationId: invitation.id,
              }),
              DomainError,
            );
            await assert.rejects(
              method(owner.id, {
                restaurantId: other.id,
                invitationId: invitation.id,
              }),
              DomainError,
            );
          }
          assert.equal(
            (
              await db.invitation.findUniqueOrThrow({
                where: { id: invitation.id },
              })
            ).tokenHash,
            secret.tokenHash,
          );
          assert.equal(
            await db.restaurantSettings.count({
              where: { restaurantId: other.id },
            }),
            0,
          );
        },
      );

      await t.test(
        "owner membership cannot be disabled, demoted or replaced by invitation",
        async () => {
          await assert.rejects(
            updateRestaurantMembership(owner.id, {
              ...memberInput(),
              membershipId: ownerMembership.id,
              status: "DISABLED",
              expectedUpdatedAt: ownerMembership.updatedAt.toISOString(),
            }),
            /ownership/,
          );
          await assert.rejects(
            invites.inviteRestaurantMember(owner.id, {
              ...inviteInput(),
              role: "OWNER",
            }),
          );
          assert.equal(
            await db.restaurantMembership.count({
              where: {
                restaurantId: restaurant.id,
                role: "OWNER",
                status: "ACTIVE",
              },
            }),
            1,
          );
        },
      );

      await t.test(
        "membership disable preserves identity and other restaurant access; stale changes fail",
        async () => {
          await updateRestaurantMembership(owner.id, {
            ...memberInput(),
            status: "DISABLED",
          });
          await assert.rejects(
            updateRestaurantMembership(owner.id, memberInput()),
            /changed/,
          );
          await assert.rejects(
            queries.readRestaurantOverview(manager.id, restaurant.id),
            DomainError,
          );
          assert.equal(
            (await db.user.findUniqueOrThrow({ where: { id: manager.id } }))
              .status,
            "ACTIVE",
          );
          assert.equal(
            (
              await db.restaurantMembership.findUniqueOrThrow({
                where: {
                  restaurantId_userId: {
                    restaurantId: pending.id,
                    userId: manager.id,
                  },
                },
              })
            ).status,
            "ACTIVE",
          );
          const current = await db.restaurantMembership.findUniqueOrThrow({
            where: { id: managerMembership.id },
          });
          await updateRestaurantMembership(owner.id, {
            ...memberInput(),
            role: "MANAGER",
            expectedUpdatedAt: current.updatedAt.toISOString(),
          });
        },
      );

      await t.test(
        "failed delivery persists and concurrent duplicate invitations create exactly one pending record",
        async () => {
          const input = inviteInput();
          const results = await Promise.allSettled([
            invites.inviteRestaurantMember(owner.id, input),
            invites.inviteRestaurantMember(owner.id, input),
          ]);
          assert.equal(
            results.filter((result) => result.status === "fulfilled").length,
            1,
          );
          const saved = await db.invitation.findFirstOrThrow({
            where: { restaurantId: restaurant.id, email: input.email },
          });
          assert.equal(saved.deliveryStatus, "FAILED");
          assert.equal(saved.status, "PENDING");
          assert.equal(
            await db.invitation.count({
              where: {
                restaurantId: restaurant.id,
                email: input.email,
                status: "PENDING",
              },
            }),
            1,
          );
          const target = {
            restaurantId: restaurant.id,
            invitationId: saved.id,
          };
          await assert.rejects(
            invites.resendRestaurantInvitation(owner.id, target),
            /one minute/,
          );
          await db.invitation.update({
            where: { id: saved.id },
            data: { lastSentAt: new Date(0) },
          });
          assert.equal(
            await invites.resendRestaurantInvitation(owner.id, target),
            false,
          );
          assert.notEqual(
            (await db.invitation.findUniqueOrThrow({ where: { id: saved.id } }))
              .tokenHash,
            saved.tokenHash,
          );
          await invites.revokeRestaurantInvitation(owner.id, target);
          await assert.rejects(
            invites.resendRestaurantInvitation(owner.id, target),
            DomainError,
          );
          assert.equal(
            (await db.invitation.findUniqueOrThrow({ where: { id: saved.id } }))
              .status,
            "REVOKED",
          );
        },
      );

      await t.test(
        "existing memberships cannot receive duplicate invitations and accepted links cannot be reused",
        async () => {
          await assert.rejects(
            invites.inviteRestaurantMember(
              owner.id,
              inviteInput(manager.email),
            ),
            /already has a membership/,
          );
          const staff = await user("Accepting Staff");
          await invites.inviteRestaurantMember(
            owner.id,
            inviteInput(staff.email),
          );
          const invitation = await db.invitation.findFirstOrThrow({
            where: { restaurantId: restaurant.id, email: staff.email },
          });
          const token = newInvitationToken();
          await db.invitation.update({
            where: { id: invitation.id },
            data: { tokenHash: token.tokenHash },
          });
          await acceptInvitation({ token: token.token }, { id: staff.id });
          await assert.rejects(
            acceptInvitation({ token: token.token }, { id: staff.id }),
            DomainError,
          );
          assert.equal(
            await db.restaurantMembership.count({
              where: { restaurantId: restaurant.id, userId: staff.id },
            }),
            1,
          );
        },
      );

      await t.test(
        "team pagination is bounded and invitation DTOs exclude tokens",
        async () => {
          const members = await Promise.all(
            Array.from({ length: 22 }, (_, index) =>
              user(`Pagination Staff ${index}`),
            ),
          );
          await db.restaurantMembership.createMany({
            data: members.map((member) => ({
              restaurantId: restaurant.id,
              userId: member.id,
              role: "CASHIER",
            })),
          });
          const first = await queries.readRestaurantTeam(
            owner.id,
            restaurant.id,
            1,
          );
          const second = await queries.readRestaurantTeam(
            owner.id,
            restaurant.id,
            2,
          );
          assert.equal(first.members.length, 20);
          assert.ok(second.members.length > 0);
          assert.ok(
            second.members.every(
              (member) =>
                !first.members.some(
                  (otherMember) => otherMember.id === member.id,
                ),
            ),
          );
          assert.doesNotMatch(JSON.stringify(first), /tokenHash|password/);
        },
      );

      await t.test(
        "concurrent settings edits preserve one winner and audit failures roll back settings",
        async () => {
          const results = await Promise.allSettled([
            saveRestaurantSettings(owner.id, {
              ...settings(restaurant.id, 1),
              name: "First edit",
            }),
            saveRestaurantSettings(owner.id, {
              ...settings(restaurant.id, 1),
              name: "Second edit",
            }),
          ]);
          assert.equal(
            results.filter((result) => result.status === "fulfilled").length,
            1,
          );
          const before = await queries.readRestaurantSettings(
            owner.id,
            restaurant.id,
          );
          assert.match(fixture.schema, /^pos_test_[a-f0-9]{24}$/);
          await setup.query(
            `CREATE FUNCTION "${fixture.schema}".reject_restaurant_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Isolated audit failure'; END; $$`,
          );
          await setup.query(
            `CREATE TRIGGER reject_restaurant_audit BEFORE INSERT ON "${fixture.schema}"."AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".reject_restaurant_audit()`,
          );
          try {
            await assert.rejects(
              saveRestaurantSettings(owner.id, {
                ...settings(restaurant.id, before.version),
                name: "Must roll back",
                currencyCode: "USD",
              }),
            );
            const after = await queries.readRestaurantSettings(
              owner.id,
              restaurant.id,
            );
            assert.deepEqual(after, before);
          } finally {
            await setup.query(
              `DROP TRIGGER reject_restaurant_audit ON "${fixture.schema}"."AuditEvent"`,
            );
            await setup.query(
              `DROP FUNCTION "${fixture.schema}".reject_restaurant_audit()`,
            );
          }
        },
      );
    } finally {
      await setup.end();
      await db.$disconnect();
      await fixture.cleanup();
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);
