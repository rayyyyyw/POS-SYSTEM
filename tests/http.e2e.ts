import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { hashPassword } from "better-auth/crypto";
import { startIsolatedApp } from "./support/app-server";

let clientNumber = 0;
function client(origin: string) {
  const cookies = new Map<string, string>();
  const address = `198.18.0.${++clientNumber}`;
  return async (path: string, options: RequestInit = {}) => {
    const url = new URL(path, origin);
    assert.equal(
      url.origin,
      origin,
      "HTTP tests must stay on the disposable app server.",
    );
    const headers = new Headers(options.headers);
    if (!headers.has("Origin")) headers.set("Origin", origin);
    headers.set("X-Forwarded-For", address);
    headers.set(
      "Cookie",
      [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
    );
    const response = await fetch(url, {
      ...options,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
}
type Client = ReturnType<typeof client>;
const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const decode = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Exercise the real progressive-enhancement form protocol from rendered HTML.
// No hard-coded action IDs, test API routes, or application authorization bypass.
async function formFor(request: Client, path: string, field: string) {
  const response = await request(path);
  assert.equal(response.status, 200);
  const html = await response.text();
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].find(
    (match) =>
      match[1].includes(`name="${field}"`) ||
      match[1].includes(`>${field}</button>`),
  );
  assert.ok(form, `No form containing ${field} on ${path}`);
  const data = new FormData();
  for (const [input] of form[1].matchAll(/<input\b[^>]*>/g)) {
    if (!input.includes('type="hidden"')) continue;
    const name = input.match(/\bname="([^"]*)"/)?.[1];
    if (name)
      data.append(
        decode(name),
        decode(input.match(/\bvalue="([^"]*)"/)?.[1] ?? ""),
      );
  }
  assert.ok(
    [...data.keys()].some((key) => key.startsWith("$ACTION_")),
    "Rendered form must include its Server Action reference.",
  );
  return data;
}
async function invitationAction(request: Client, token: string) {
  // The invitation form waits for client session hydration. Exercise that action
  // using the installed Next/React encoder and this build's reference manifest.
  const manifest = JSON.parse(
    await readFile(".next/server/server-reference-manifest.json", "utf8"),
  ) as { node: Record<string, { filename: string; exportedName: string }> };
  const action = Object.entries(manifest.node).find(
    ([, value]) =>
      value.filename === "app/actions/invitations.ts" &&
      value.exportedName === "acceptInvitation",
  );
  assert.ok(action, "Build must export the invitation acceptance action.");
  const { encodeReply } = createRequire(import.meta.url)(
    "next/dist/compiled/react-server-dom-webpack/client.node",
  ) as { encodeReply(values: unknown[]): Promise<string | FormData> };
  const form = new FormData();
  form.set("token", token);
  return request(`/accept-invitation?token=${token}`, {
    method: "POST",
    headers: { "Next-Action": action[0] },
    body: await encodeReply([{ message: "" }, form]),
  });
}
function fields(form: FormData, values: Record<string, string | number>) {
  for (const [key, value] of Object.entries(values))
    form.set(key, String(value));
  return { method: "POST", body: form } satisfies RequestInit;
}

test(
  "production HTTP flows enforce identity and persist onboarding",
  { timeout: 240_000 },
  async (t) => {
    const app = await startIsolatedApp();
    try {
      const anonymous = client(app.origin),
        adminClient = client(app.origin),
        ownerClient = client(app.origin);
      const password = "Disposable-http-test-2026";
      const hash = await hashPassword(password);
      const user = async (
        name: string,
        role: "ADMIN" | "NONE" = "NONE",
        verified = true,
      ) => {
        const id = randomUUID();
        return app.db.user.create({
          data: {
            id,
            name,
            email: `${id}@example.test`,
            platformRole: role,
            emailVerified: verified,
            accounts: {
              create: {
                id: randomUUID(),
                accountId: id,
                providerId: "credential",
                password: hash,
              },
            },
          },
        });
      };
      const admin = await user("HTTP Administrator", "ADMIN");
      const owner = await user("HTTP Owner");
      const login = async (
        request: Client,
        email: string,
        credential = password,
      ) =>
        request(
          "/api/auth/sign-in/email",
          json({ email, password: credential }),
        );
      const messages = async () =>
        (await (await fetch(`${app.mailbox}/messages`)).json()) as Array<{
          to: string[];
          subject: string;
          text: string;
        }>;
      const emailLink = async (email: string, subject: string) => {
        for (let attempt = 0; attempt < 30; attempt++) {
          const message = (await messages())
            .reverse()
            .find(
              (item) =>
                item.to.includes(email) && item.subject.includes(subject),
            );
          if (message) {
            const url = message.text.match(/https?:\/\/\S+/)?.[0];
            assert.ok(url, "Captured account email must contain its link.");
            assert.equal(new URL(url).origin, app.origin);
            return url;
          }
          await new Promise((resolveWait) => setTimeout(resolveWait, 100));
        }
        assert.fail("Expected account email was not captured.");
      };

      await t.test(
        "public signup and unauthenticated admin reads are blocked",
        async () => {
          assert.equal(
            (await anonymous("/admin")).headers.get("location"),
            "/login",
          );
          const response = await anonymous(
            "/api/auth/sign-up/email",
            json({
              name: "Uninvited",
              email: "uninvited@example.test",
              password,
              platformRole: "ADMIN",
            }),
          );
          assert.equal(response.ok, false);
          assert.equal(
            await app.db.user.findUnique({
              where: { email: "uninvited@example.test" },
            }),
            null,
          );
        },
      );

      await t.test(
        "login creates real sessions and restaurant members cannot read admin pages",
        async () => {
          assert.equal((await login(adminClient, admin.email)).status, 200);
          assert.equal((await login(ownerClient, owner.email)).status, 200);
          assert.equal(
            (await adminClient("/workspace")).headers.get("location"),
            "/admin",
          );
          assert.equal(
            (await ownerClient("/admin/restaurants")).headers.get("location"),
            "/workspace",
          );
          const response = await adminClient("/admin");
          assert.match(
            response.headers.get("cache-control") ?? "",
            /private|no-store/,
          );
          assert.ok((await response.text()).includes(admin.name));
        },
      );

      await t.test(
        "direct unauthenticated and non-admin action POSTs cannot create restaurants",
        async () => {
          const form = await formFor(
            adminClient,
            "/admin/restaurants/create",
            "ownerEmail",
          );
          const data = {
            name: "Unauthorized Kitchen",
            slug: "unauthorized-kitchen",
            city: "Test City",
            email: "kitchen@example.test",
            ownerName: "Forbidden Owner",
            ownerEmail: owner.email,
          };
          assert.equal(
            (
              await anonymous("/admin/restaurants/create", fields(form, data))
            ).headers.get("location"),
            "/login",
          );
          assert.equal(
            (
              await ownerClient("/admin/restaurants/create", fields(form, data))
            ).headers.get("location"),
            "/workspace",
          );
          assert.equal(await app.db.restaurant.count(), 0);
        },
      );

      let restaurantId = "";
      await t.test(
        "create, accept, edit, activate, archive and restore persist through real actions",
        async () => {
          const create = await formFor(
            adminClient,
            "/admin/restaurants/create",
            "ownerEmail",
          );
          await adminClient(
            "/admin/restaurants/create",
            fields(create, {
              name: "HTTP Kitchen",
              slug: "http-kitchen",
              city: "Test City",
              email: "kitchen@example.test",
              ownerName: owner.name,
              ownerEmail: owner.email,
            }),
          );
          const restaurant = await app.db.restaurant.findUniqueOrThrow({
            where: { slug: "http-kitchen" },
          });
          restaurantId = restaurant.id;
          const link = await emailLink(owner.email, "Invitation");
          const token = new URL(link).searchParams.get("token");
          assert.ok(token);
          await invitationAction(ownerClient, token);
          assert.equal(
            await app.db.restaurantMembership.count({
              where: { restaurantId, userId: owner.id, role: "OWNER" },
            }),
            1,
          );
          const editPath = `/admin/restaurants/${restaurantId}/edit`;
          const edit = await formFor(adminClient, editPath, "slug");
          await adminClient(
            editPath,
            fields(edit, {
              name: "HTTP Kitchen Updated",
              slug: "http-kitchen",
              city: "Updated City",
              email: "kitchen@example.test",
              phone: "",
            }),
          );
          assert.equal(
            (
              await app.db.restaurant.findUniqueOrThrow({
                where: { id: restaurantId },
              })
            ).name,
            "HTTP Kitchen Updated",
          );
          const detailPath = `/admin/restaurants/${restaurantId}`;
          for (const status of ["ACTIVE", "ARCHIVED", "PENDING"] as const) {
            const lifecycle = await formFor(adminClient, detailPath, "reason");
            await adminClient(
              detailPath,
              fields(lifecycle, {
                status,
                reason: "HTTP lifecycle acceptance test.",
              }),
            );
            assert.equal(
              (
                await app.db.restaurant.findUniqueOrThrow({
                  where: { id: restaurantId },
                })
              ).status,
              status,
            );
          }
          const refreshed = await (await adminClient(detailPath)).text();
          assert.ok(refreshed.includes("HTTP Kitchen Updated"));
          assert.ok(refreshed.includes(owner.email));
          const activity = await (
            await adminClient(`${detailPath}/activity`)
          ).text();
          for (const event of [
            "Restaurant created",
            "Invitation accepted",
            "Restaurant updated",
            "Restaurant archived",
          ])
            assert.ok(activity.includes(event));
        },
      );

      await t.test(
        "workspace only returns the authenticated person's memberships",
        async () => {
          await app.db.restaurant.create({
            data: { name: "Hidden Other Tenant", slug: "hidden-other-tenant" },
          });
          const html = await (
            await ownerClient(
              "/workspace?restaurantId=hidden-other-tenant&role=ADMIN",
            )
          ).text();
          assert.ok(html.includes("HTTP Kitchen Updated"));
          assert.ok(!html.includes("Hidden Other Tenant"));
          assert.equal(
            (
              await ownerClient(`/admin/restaurants/${restaurantId}/edit`)
            ).headers.get("location"),
            "/workspace",
          );
        },
      );

      await t.test(
        "cross-origin action submissions are rejected without saving records",
        async () => {
          const form = await formFor(
            adminClient,
            "/admin/restaurants/create",
            "ownerEmail",
          );
          const response = await adminClient("/admin/restaurants/create", {
            ...fields(form, {
              name: "Cross Origin Kitchen",
              slug: "cross-origin-kitchen",
              city: "Test City",
              email: "kitchen@example.test",
              ownerName: "Other Owner",
              ownerEmail: "other@example.test",
            }),
            headers: { Origin: "https://untrusted.example.test" },
          });
          assert.equal(response.ok, false);
          assert.equal(
            await app.db.restaurant.findUnique({
              where: { slug: "cross-origin-kitchen" },
            }),
            null,
          );
        },
      );

      await t.test(
        "failed invitation delivery is visible and a retry sends a rotated link",
        async () => {
          await fetch(`${app.mailbox}/failure`, json({ enabled: true }));
          const path = `/admin/restaurants/${restaurantId}`;
          const invite = await formFor(adminClient, path, "email");
          await adminClient(
            path,
            fields(invite, { email: "retry@example.test", role: "MANAGER" }),
          );
          const failed = await app.db.invitation.findFirstOrThrow({
            where: { email: "retry@example.test" },
          });
          assert.equal(failed.status, "PENDING");
          assert.equal(failed.deliveryStatus, "FAILED");
          await fetch(`${app.mailbox}/failure`, json({ enabled: false }));
          // Advance only this fixture's cooldown to avoid a one-minute test delay.
          await app.db.invitation.update({
            where: { id: failed.id },
            data: { lastSentAt: new Date(Date.now() - 61_000) },
          });
          const retry = await formFor(adminClient, path, "Retry delivery");
          await adminClient(path, fields(retry, {}));
          const sent = await app.db.invitation.findUniqueOrThrow({
            where: { id: failed.id },
          });
          assert.equal(sent.deliveryStatus, "SENT");
          assert.notEqual(sent.tokenHash, failed.tokenHash);
          await emailLink("retry@example.test", "Invitation");
        },
      );

      await t.test(
        "restaurant settings persist through real owner actions and appear in admin health",
        async () => {
          const path = `/workspace/${restaurantId}/settings`;
          assert.equal(
            (await anonymous(path)).headers.get("location"),
            "/login",
          );
          const before = await app.db.restaurant.findUniqueOrThrow({
            where: { id: restaurantId },
          });
          const form = await formFor(ownerClient, path, "currencyCode");
          const input = {
            name: "Restaurant Owner Kitchen",
            city: "Test City",
            email: "owner-kitchen@example.test",
            phone: "",
            addressLine1: "10 Test Road",
            addressLine2: "",
            postalCode: "1000",
            countryCode: "PH",
            timezone: "Asia/Manila",
            currencyCode: "PHP",
            locale: "en-PH",
            serviceMode: "QUICK_SERVICE",
            defaultOrderType: "TAKEOUT",
            orderNumberPrefix: "ORD",
            receiptHeader: "",
            receiptFooter: "Thank you",
          };
          assert.equal(
            (await anonymous(path, fields(form, input))).headers.get(
              "location",
            ),
            "/login",
          );
          await adminClient(path, fields(form, input));
          assert.equal(
            await app.db.restaurantSettings.count(),
            0,
            "Platform admin must not inherit owner privileges.",
          );
          const other = await app.db.restaurant.findUniqueOrThrow({
            where: { slug: "hidden-other-tenant" },
          });
          await ownerClient(
            path,
            fields(form, { ...input, restaurantId: other.id }),
          );
          assert.equal(await app.db.restaurantSettings.count(), 0);
          const response = await ownerClient(
            path,
            fields(form, { ...input, restaurantId }),
          );
          assert.equal(response.status, 200);
          assert.equal(
            (
              await app.db.restaurantSettings.findUniqueOrThrow({
                where: { restaurantId },
              })
            ).currencyCode,
            "PHP",
          );
          assert.equal(
            (
              await app.db.restaurant.findUniqueOrThrow({
                where: { id: restaurantId },
              })
            ).version,
            before.version + 1,
          );
          const refreshed = await (await ownerClient(path)).text();
          assert.ok(refreshed.includes("Restaurant Owner Kitchen"));
          assert.ok(refreshed.includes("10 Test Road"));
          const adminPage = await (
            await adminClient(`/admin/restaurants/${restaurantId}`)
          ).text();
          assert.ok(adminPage.includes("Workspace health"));
          assert.ok(adminPage.includes("Configured"));
          assert.ok(
            (
              await (
                await ownerClient(`/workspace/${restaurantId}/onboarding`)
              ).text()
            ).includes("Restaurant profile"),
          );
          assert.ok(
            (await (await ownerClient("/workspace")).text()).includes(
              `/workspace/${restaurantId}`,
            ),
          );
        },
      );

      await t.test(
        "restaurant team roles, membership switching and direct action authorization work",
        async () => {
          const manager = await user("Restaurant Manager"),
            cashier = await user("Restaurant Cashier");
          const managerClient = client(app.origin),
            cashierClient = client(app.origin);
          await login(managerClient, manager.email);
          await login(cashierClient, cashier.email);
          const managerMember = await app.db.restaurantMembership.create({
            data: { restaurantId, userId: manager.id, role: "MANAGER" },
          });
          await app.db.restaurantMembership.create({
            data: { restaurantId, userId: cashier.id, role: "CASHIER" },
          });
          const pending = await (
            await managerClient(`/workspace/${restaurantId}`)
          ).text();
          assert.ok(pending.includes("awaiting activation"));
          const detail = `/admin/restaurants/${restaurantId}`;
          const activation = await formFor(adminClient, detail, "reason");
          await adminClient(
            detail,
            fields(activation, {
              status: "ACTIVE",
              reason: "Workspace tests start service access.",
            }),
          );
          const settingsPath = `/workspace/${restaurantId}/settings`,
            teamPath = `/workspace/${restaurantId}/team`;
          const managerSettings = await (
            await managerClient(settingsPath)
          ).text();
          assert.ok(managerSettings.includes("Read only"));
          assert.ok(!managerSettings.includes('name="currencyCode"'));
          assert.ok(
            (await (await cashierClient(settingsPath)).text()).includes(
              "This page is restricted",
            ),
          );
          const cashierOverview = await (
            await cashierClient(`/workspace/${restaurantId}`)
          ).text();
          assert.ok(cashierOverview.includes("Service tools are coming next"));
          assert.ok(!cashierOverview.includes('aria-label="Admin navigation"'));
          assert.ok(!cashierOverview.includes(">Team</a>"));
          const other = await app.db.restaurant.findUniqueOrThrow({
            where: { slug: "hidden-other-tenant" },
          });
          const hidden = await (
            await ownerClient(`/workspace/${other.id}/settings`)
          ).text();
          assert.ok(!hidden.includes("Hidden Other Tenant"));
          const second = await app.db.restaurant.create({
            data: {
              name: "Second Owned Restaurant",
              slug: "second-owned",
              status: "ACTIVE",
              memberships: { create: { userId: owner.id, role: "OWNER" } },
            },
          });
          const selector = await (await ownerClient("/workspace")).text();
          assert.ok(selector.includes(`/workspace/${second.id}`));
          assert.ok(
            (
              await (await ownerClient(`/workspace/${second.id}`)).text()
            ).includes("Second Owned Restaurant"),
          );
          const membership = await formFor(
            ownerClient,
            teamPath,
            "membershipId",
          );
          const update = {
            membershipId: managerMember.id,
            expectedUpdatedAt: managerMember.updatedAt.toISOString(),
            role: "CASHIER",
            status: "DISABLED",
          };
          for (const request of [managerClient, cashierClient, adminClient])
            await request(teamPath, fields(membership, update));
          assert.equal(
            (
              await app.db.restaurantMembership.findUniqueOrThrow({
                where: { id: managerMember.id },
              })
            ).role,
            "MANAGER",
          );
          await ownerClient(teamPath, fields(membership, update));
          assert.equal(
            (
              await app.db.restaurantMembership.findUniqueOrThrow({
                where: { id: managerMember.id },
              })
            ).status,
            "DISABLED",
          );
          assert.ok(
            !(
              await (
                await managerClient(`/workspace/${restaurantId}/team`)
              ).text()
            ).includes(cashier.email),
          );
          // This extra owned restaurant must not prevent the later global-disable test.
          await app.db.restaurant.update({
            where: { id: second.id },
            data: { status: "PENDING" },
          });
        },
      );

      await t.test(
        "owner invitations fail safely, retry, accept once and revoke through real actions",
        async () => {
          const path = `/workspace/${restaurantId}/team`;
          const staff = await user("Invited Restaurant Staff");
          const staffClient = client(app.origin);
          await login(staffClient, staff.email);
          await fetch(`${app.mailbox}/failure`, json({ enabled: true }));
          const create = await formFor(ownerClient, path, "email");
          await ownerClient(
            path,
            fields(create, {
              name: staff.name,
              email: staff.email,
              role: "CASHIER",
            }),
          );
          const invite = await app.db.invitation.findFirstOrThrow({
            where: { restaurantId, email: staff.email },
          });
          assert.equal(invite.deliveryStatus, "FAILED");
          assert.ok(
            (await (await ownerClient(path)).text()).includes(
              "Delivery failed",
            ),
          );
          await fetch(`${app.mailbox}/failure`, json({ enabled: false }));
          await app.db.invitation.update({
            where: { id: invite.id },
            data: { lastSentAt: new Date(0) },
          });
          const retry = await formFor(ownerClient, path, "Retry delivery");
          await ownerClient(path, fields(retry, { invitationId: invite.id }));
          assert.equal(
            (
              await app.db.invitation.findUniqueOrThrow({
                where: { id: invite.id },
              })
            ).deliveryStatus,
            "SENT",
          );
          const token = new URL(
            await emailLink(staff.email, "Invitation"),
          ).searchParams.get("token");
          assert.ok(token);
          await invitationAction(staffClient, token);
          await invitationAction(staffClient, token);
          assert.equal(
            await app.db.restaurantMembership.count({
              where: { restaurantId, userId: staff.id, role: "CASHIER" },
            }),
            1,
          );
          const next = await formFor(ownerClient, path, "email");
          await ownerClient(
            path,
            fields(next, {
              name: "Revoked Staff",
              email: "revoked-staff@example.test",
              role: "MANAGER",
            }),
          );
          const revocable = await app.db.invitation.findFirstOrThrow({
            where: { restaurantId, email: "revoked-staff@example.test" },
          });
          const revoke = await formFor(ownerClient, path, "Revoke invitation");
          await ownerClient(
            path,
            fields(revoke, { invitationId: revocable.id }),
          );
          assert.equal(
            (
              await app.db.invitation.findUniqueOrThrow({
                where: { id: revocable.id },
              })
            ).status,
            "REVOKED",
          );
        },
      );

      await t.test(
        "suspended and archived workspaces show status and reject stale owner actions",
        async () => {
          const path = `/workspace/${restaurantId}/team`;
          const form = await formFor(ownerClient, path, "email");
          const detail = `/admin/restaurants/${restaurantId}`;
          const before = await app.db.invitation.count({
            where: { restaurantId },
          });
          for (const status of ["SUSPENDED", "ARCHIVED", "PENDING"] as const) {
            const lifecycle = await formFor(adminClient, detail, "reason");
            await adminClient(
              detail,
              fields(lifecycle, {
                status,
                reason: "Workspace lifecycle verification.",
              }),
            );
            if (status !== "PENDING") {
              const html = await (await ownerClient(path)).text();
              assert.ok(
                html.includes(
                  status === "SUSPENDED"
                    ? "Restaurant access is suspended"
                    : "This restaurant is archived",
                ),
              );
              await ownerClient(
                path,
                fields(form, {
                  name: "Blocked Staff",
                  email: "blocked-staff@example.test",
                  role: "CASHIER",
                }),
              );
              assert.equal(
                await app.db.invitation.count({ where: { restaurantId } }),
                before,
              );
            }
          }
        },
      );

      await t.test(
        "landing submissions persist and appear after refreshing the admin request directory",
        async () => {
          const form = await formFor(anonymous, "/", "restaurantName");
          await anonymous(
            "/",
            fields(form, {
              name: "Early Owner",
              email: "early@example.test",
              restaurantName: "Early Kitchen",
              city: "Test City",
              consent: "on",
              website: "",
            }),
          );
          assert.equal(
            await app.db.accessRequest.count({
              where: { email: "early@example.test" },
            }),
            1,
          );
          assert.ok(
            (await (await adminClient("/admin/requests")).text()).includes(
              "Early Kitchen",
            ),
          );
        },
      );

      await t.test(
        "verification links work through the real authentication route",
        async () => {
          const unverified = await user("Unverified User", "NONE", false);
          const request = client(app.origin);
          assert.equal(
            (
              await request(
                "/api/auth/send-verification-email",
                json({
                  email: unverified.email,
                  callbackURL: "/verify-email?checked=1",
                }),
              )
            ).status,
            200,
          );
          await request(await emailLink(unverified.email, "Verify"));
          assert.equal(
            (
              await app.db.user.findUniqueOrThrow({
                where: { id: unverified.id },
              })
            ).emailVerified,
            true,
          );
          assert.equal((await login(request, unverified.email)).status, 200);
        },
      );

      await t.test(
        "password recovery invalidates old credentials, sessions and used reset links",
        async () => {
          assert.equal(
            (
              await anonymous(
                "/api/auth/request-password-reset",
                json({ email: owner.email, redirectTo: "/reset-password" }),
              )
            ).status,
            200,
          );
          const response = await anonymous(
            await emailLink(owner.email, "Reset"),
          );
          const location = response.headers.get("location");
          assert.ok(location);
          const token = new URL(location, app.origin).searchParams.get("token");
          assert.ok(token);
          const nextPassword = "Disposable-reset-test-2026";
          assert.equal(
            (
              await anonymous(
                "/api/auth/reset-password",
                json({ token, newPassword: nextPassword }),
              )
            ).status,
            200,
          );
          assert.equal(
            (await ownerClient("/workspace")).headers.get("location"),
            "/login",
          );
          assert.equal(
            (await login(client(app.origin), owner.email)).ok,
            false,
          );
          assert.equal(
            (await login(ownerClient, owner.email, nextPassword)).status,
            200,
          );
          assert.equal(
            (
              await anonymous(
                "/api/auth/reset-password",
                json({ token, newPassword: password }),
              )
            ).ok,
            false,
          );
        },
      );

      await t.test(
        "revocation and global disable take effect on subsequent requests",
        async () => {
          const path = `/admin/users/${owner.id}`;
          const revoke = await formFor(
            adminClient,
            path,
            "Revoke all sessions",
          );
          await adminClient(path, fields(revoke, {}));
          assert.equal(
            (await ownerClient("/workspace")).headers.get("location"),
            "/login",
          );
          const disable = await formFor(adminClient, path, "Disable account");
          await adminClient(path, fields(disable, {}));
          assert.equal(
            (await app.db.user.findUniqueOrThrow({ where: { id: owner.id } }))
              .status,
            "DISABLED",
          );
          assert.equal(
            (
              await login(
                ownerClient,
                owner.email,
                "Disposable-reset-test-2026",
              )
            ).ok,
            false,
          );
        },
      );

      await t.test("logout revokes the administrator session", async () => {
        assert.equal(
          (await adminClient("/api/auth/sign-out", json({}))).status,
          200,
        );
        assert.equal(
          (await adminClient("/admin")).headers.get("location"),
          "/login",
        );
      });

      await t.test(
        "repeated invalid login attempts are rate limited",
        async () => {
          const attempts = client(app.origin);
          for (let attempt = 0; attempt < 5; attempt++) {
            assert.equal(
              (await login(attempts, "missing@example.test")).status,
              401,
            );
          }
          assert.equal(
            (await login(attempts, "missing@example.test")).status,
            429,
          );
        },
      );
    } finally {
      await app.close();
    }
  },
);
