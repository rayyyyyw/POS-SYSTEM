# POS System

A multi-tenant restaurant POS and management platform. This phase establishes the public landing page, persistent Platform Admin workflows, authentication, and the restaurant account workspace. Menus, restaurant operations, and the POS terminal are future modules.

Read `AGENTS.md` before development. The installed Next.js documentation is in `node_modules/next/dist/docs/`; use it for this project's framework version.

## What works

- Public landing page with a persisted early-access request form, consent, validation, and submission limits.
- Invitation-based accounts, login/logout, email verification, password recovery, and session revocation through Better Auth.
- Platform Admin restaurant creation, business-profile editing, lifecycle changes, member invitations, ownership transfer, and audit history.
- Database-backed restaurant, user, and request directories with server-side search, filters, sorting where offered, and pagination.
- User display-name edits, global account disabling/restoration, restaurant membership role/access changes, and session revocation.
- Early-access request review and conversion into a pending restaurant with an owner invitation.
- Persisted platform display name, support email, timezone, and date format used by the admin interface.
- Account and onboarding totals derived from PostgreSQL. Database failures show errors; there is no runtime mock-data fallback.

`/workspace` lists the signed-in person's active memberships and opens `/workspace/[restaurantId]`. The restaurant workspace includes a real account overview, onboarding checklist, settings, and team management. Menus, inventory, orders, payments, checkout, and restaurant sales reports are not implemented. Notifications, branding uploads, billing, and MFA are also not implemented.

## Local setup

Use a supported Node.js version for the installed Next.js and Prisma releases, npm, and an accessible PostgreSQL database.

1. Run `npm ci`.
2. Use `.env.example` as the configuration reference. The application, Prisma CLI, and bootstrap load `.env.local` before `.env`; the existing database URL can remain in `.env`. Do not commit either file or overwrite an existing database URL. Deployment environments may provide these variables directly.
3. Set `BETTER_AUTH_URL` to the application origin, such as `http://localhost:3000`, and set a strong, unique `BETTER_AUTH_SECRET`. The existing development workspace has a locally generated secret; a fresh checkout needs its own.
4. Run `npm run db:generate`, then `npm run db:status`. Review the target database and pending migrations before applying them with `npm run db:migrate`.
5. Run `npm run admin:bootstrap` in an interactive terminal to establish the first administrator.
6. Run `npm run dev` and open `http://localhost:3000`.

The bootstrap command prompts for a full name, email, and a hidden password of 12–128 characters. It creates a verified first administrator and an audit event; it refuses to create or overwrite an administrator when one already exists. No demo users or restaurants are automatically seeded. Keep the password out of command arguments, source files, and chat logs.

To generate an authentication secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### Email configuration

Account emails use the Resend HTTP API. Set `RESEND_API_KEY` and `EMAIL_FROM`; the sender must belong to a verified Resend domain. `BETTER_AUTH_URL` determines the origin used in invitation and account links, so configure it correctly before sending email.

Invitation delivery happens after the restaurant or invitation transaction commits. A delivery failure does not remove the saved restaurant. Its invitation shows a failed delivery state in restaurant details, where an administrator can retry after correcting configuration. Resending rotates the token, invalidates the previous link, and starts a new 72-hour expiry; retries have a one-minute cooldown.

Password-reset and verification messages use the same email configuration. Their forms do not reveal whether an account exists. Delivery errors are logged without email addresses or tokens, and users can request a new message. There is no email worker or automatic retry queue.

Real mailbox delivery has not been verified in this workspace because provider credentials have not been supplied. Database setup and administrator bootstrap do not require Resend, but invited-user onboarding and account recovery need working delivery.

## Routes

- `/`: public landing page and early-access request form.
- `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invitation`: account flows.
- `/workspace`: authenticated restaurant membership overview.
- `/workspace/[restaurantId]`: restaurant overview and lifecycle status, with role-aware navigation and a restaurant switcher.
- `/workspace/[restaurantId]/onboarding`: persisted-data checklist for activation, profile, regional settings, owner, and team.
- `/workspace/[restaurantId]/settings`: owner-editable business settings; managers have read-only access.
- `/workspace/[restaurantId]/team`: paginated memberships; owners can invite staff, retry or revoke invitations, and change non-owner roles/access. Managers can view memberships.
- `/admin`: real platform account totals and recent activity.
- `/admin/restaurants`: restaurant directory; `/create` adds a restaurant.
- `/admin/restaurants/[id]`: details, lifecycle, memberships, invitations, and ownership transfer; `/edit` edits business information and `/activity` shows audit history.
- `/admin/users` and `/admin/users/[id]`: users, membership management, global access, and sessions.
- `/admin/requests`: early-access request review and onboarding.
- `/admin/reports`: account and onboarding reporting; POS financial reporting remains unavailable.
- `/admin/settings`: supported platform display and contact settings.
- `/api/auth/[...all]`: Better Auth endpoints. Public account signup is disabled.

Private route metadata discourages indexing; actual access control is enforced on the server.

## Restaurant onboarding and lifecycle

An administrator can create a restaurant directly or start from an early-access request. Creation saves a `PENDING` restaurant, an initial owner invitation, and audit history in one transaction. Converting a request closes it as part of that transaction. Merely marking a request reviewed does not create an account or send an invitation.

Invitations store a hash of the secret token, expire after 72 hours, and can be accepted only once. A new invitee creates an individual account through the emailed invitation; possession of that link verifies the invited email. Existing users must sign in with the invited identity before accepting. The same user can belong to multiple restaurants.

Activation requires an active, verified owner membership. Accepting an invitation establishes membership but does not automatically activate a pending restaurant. Administrators activate it separately.

Allowed lifecycle changes are pending → active or archived; active → suspended or archived; suspended → active or archived; archived → pending. Restoring an archived restaurant returns it to pending for review. Archiving revokes pending invitations; it preserves restaurant records and audit history. There is no permanent-delete operation.

Ownership transfer selects an existing active, verified restaurant member. The previous owner becomes a manager. Owner membership cannot be disabled or changed through ordinary membership editing. Before globally disabling an owner of an active restaurant, transfer ownership or suspend the restaurant. The last active administrator is protected, and administrators cannot disable themselves.

Global account disabling blocks the person's access across restaurants and revokes their sessions. Disabling a membership affects only that restaurant and does not disable the person's other memberships. Restoring access does not revive revoked sessions.

## Code organization and security boundaries

The application uses Next.js App Router, React, TypeScript, Tailwind CSS, selected shadcn/ui primitives, Zod, Better Auth, Prisma 7, and PostgreSQL through `@prisma/adapter-pg`.

- `app/`: Server Component pages/layouts, account routes, authentication Route Handler, and thin Server Actions in `app/actions`.
- `components/marketing`, `components/admin`, and `components/ui`: public, admin, and reusable interface components. Client boundaries cover interaction and form state.
- `lib/validation`: server input schemas.
- `lib/domain`: shared domain policies.
- `lib/server`: authorization, services, queries, transactions, email delivery, rate limits, and the database client. These modules are server-only.
- `lib/auth.ts`: authentication configuration; `lib/admin`: presentation types and formatting.
- `prisma/schema.prisma`, `prisma/migrations`, and `prisma7.config.ts`: the data model and migration history. `generated/prisma` is generated and ignored by Git.
- `scripts/bootstrap-admin.ts`: controlled first-administrator setup.

The mutation flow is UI → Server Action → validated/authorized service → Prisma → PostgreSQL. Protected query functions check the session, and admin services recheck the actor inside the transaction. Platform privileges (`ADMIN`/`NONE`) are separate from restaurant membership roles (`OWNER`/`MANAGER`/`CASHIER`). Browser-provided IDs and role values are never sufficient authorization.

Restaurant foundation services use `lib/server/restaurant/access.ts` to recheck the active, verified user, active membership, tenant status, and exact permission inside each data transaction. `authorization.ts` adds the session-backed, request-cached page context; its identity-only mode exists solely for account-status screens. The earlier `requireRestaurantMember` remains an active-restaurant-only guard for future operational services. Neither boundary grants platform administrators an implicit tenant bypass.

Restaurant routes live in `app/(restaurant)/workspace/[restaurantId]`. `components/restaurant` contains the workspace UI, `lib/domain/restaurant` contains the role policy and pure checklist logic, `lib/validation/restaurant` contains Zod contracts, and `lib/server/restaurant/services` contains the settings, membership, invitation, query, and onboarding services. `app/actions/restaurant.ts` authenticates each submission and calls those services. Shared form behavior lives in `components/forms`; the existing admin form import remains compatible.

### Restaurant foundation behavior

- Owners can configure and staff ACTIVE or PENDING restaurants. Managers may read settings/team in ACTIVE restaurants. Cashiers can view the ACTIVE account overview but cannot read team/settings or mutate membership. Pending staff wait for activation. SUSPENDED and ARCHIVED memberships show only minimal identity/status screens; protected reads and all tenant mutations are blocked.
- Ownership transfer remains platform-admin controlled. Ordinary tenant edits cannot change an OWNER membership at all. Disabling a non-owner membership preserves its history, global account, and other restaurant memberships; access can be re-enabled later. There is no hard-delete action.
- `RestaurantSettings.restaurantId` is both its primary key and restaurant foreign key. Business name, city, email, and phone remain on Restaurant. Its existing `version` protects both admin profile edits and owner settings saves against stale updates. Settings and audits save in the same serializable transaction.
- Regional configuration validates currency against supported ISO currency codes and timezone using IANA identifiers. The initial timezone follows the existing platform setting (default Asia/Manila). Currency requires an explicit selection. Locale, address, service mode, order prefix, and receipt text are persisted. Service mode, order defaults, prefix, and receipt text are preferences only; this milestone does not generate order numbers, calculate tax, print receipts, or enable table service.
- Onboarding derives five foundation steps from current records. Profile completion requires a name, city, email or phone, address line 1, and country code. Regional completion requires saved currency/timezone. Team completion requires an active verified manager/cashier or an unexpired, successfully delivered staff invitation. Failed delivery does not complete the step. Menu setup is explicitly future work and excluded from foundation completion totals.
- Tenant invitations permit MANAGER/CASHIER only, reject existing memberships and duplicate usable invitations, rotate links on resend, and enforce the existing one-minute cooldown and delivery rate limit. Email is delivered after commit. Missing Resend credentials retain a failed invitation for retry; no new environment variables are needed.
- Admin restaurant details show aggregate onboarding, active-member/pending-invitation counts, owner presence, and the last tenant audit timestamp. They do not grant workspace access. Tenant activity also appears in the existing restaurant audit history.

The additive migration `20260914090000_restaurant_workspace` adds RestaurantSettings, service/order preference enums, and a tenant membership listing index. It does not seed records or alter existing business data.

Database uniqueness constraints, serializable transactions with bounded conflict retries, and version checks on restaurant/settings edits protect consistency. Audit events are written with successful business changes and remain read-only. Queries select needed fields and bound result sizes. Authentication cookies are not used as a cached source of account status; server access checks reload the user record.

## Commands and verification

```bash
npm run db:generate
npm run db:status
npm run db:migrate
npm run admin:bootstrap
npm test
npm run lint
npm run build
npm run test:http
npm run start
```

`db:migrate` applies checked-in migrations using `prisma migrate deploy`; it does not reset the database. `build` regenerates Prisma Client before the Next.js production build. `start` serves the production build. On a fresh checkout, run `npx next typegen` before a separate `npx tsc --noEmit --incremental false` check. An uncached production build may need network access for the existing Google-hosted Geist fonts.

Review the test harness configuration before running integration tests. Database tests must use isolated temporary schemas and must never seed, truncate, or delete records in the application's public schema. Use a dedicated development/test database rather than production credentials.

`npm test` covers database permissions, lifecycle and ownership rules, stale edits, concurrent operations, invitation acceptance/expiry/retries, request validation and conversion, and transaction rollback. The database suites share `tests/support/database.ts`, which loads the same environment precedence as the application and applies migrations only inside a generated `pos_test_*` schema. Each run removes its own schema afterward.

`tests/restaurant.test.ts` adds the tenant permission matrix, regional input validation, cross-tenant reads and writes, pending-owner setup, blocked lifecycle states, final-owner protection, membership disabling, concurrent invitation/settings races, pagination, secret-free DTOs, and settings rollback on audit failure. HTTP coverage also exercises owner settings, admin health, manager/cashier restrictions, multiple memberships, direct unauthorized actions, tenant invitation retry/accept/revoke, and suspended/archived screens against the compiled app.

After `npm run build`, run `npm run test:http` to test the compiled application through a disposable local server. It checks login/logout, disabled accounts, session revocation, blocked public signup, unauthorized and cross-origin Server Action requests, tenant membership visibility, restaurant onboarding and lifecycle, persisted landing requests, verification, password recovery, and login rate limits. Forms use the action references from the rendered HTML; the client-hydrated invitation action uses the installed Next/React encoder and current build manifest. Recheck that test adapter when upgrading Next.js.

HTTP tests preload `tests/support/mail-capture.mjs` only into the disposable server. It intercepts Resend requests in memory, permits only `@example.test` recipients, and can simulate failed delivery. It refuses to start without an isolated test schema and explicit test configuration. Nothing is sent to Resend, and the production application has no fake-email fallback or test endpoints. These tests verify application email behavior, not real provider or mailbox delivery.

For manual browser checks, build first and run `node_modules/.bin/tsx tests/serve-fixture.ts` (`node_modules\.bin\tsx.cmd tests/serve-fixture.ts` in PowerShell). This starts a disposable app on `http://127.0.0.1:3100` and prints credentials for temporary QA accounts. Type `stop` in that terminal to stop the server and remove its schema. Do not use these fixture credentials for your real administrator account.

## Rollout and remaining work

Before deploying, review migrations, take a recoverable database backup, rehearse migration deployment against a staging copy, and confirm `db:status`. Keep existing migration history and apply corrections through new forward migrations. Do not use `db push`, reset a database, or delete migrations to work around drift. Rolling back application code must remain compatible with the deployed schema; destructive rollback requires a separately reviewed recovery procedure.

Configure the real application origin, HTTPS, a production authentication secret, verified email delivery, and database connection limits for the hosting environment. Verify invitation delivery, password recovery, direct unauthorized requests, cross-tenant boundaries, and the complete create/invite/accept/activate/archive/restore workflow before opening access.

MFA for platform administrators, operational monitoring, and a tested backup/restore process are recommended before production use. This implementation is not a production-readiness certification. Prisma CLI transitive dependency advisories remain under review; do not force a framework or Prisma downgrade through `npm audit fix --force`.

Product branding, an approved public contact, legal/privacy copy, pricing, and the release scope for restaurant operations still need product decisions. The landing page labels future capabilities explicitly and makes no sales, pricing, or customer-count claims.
