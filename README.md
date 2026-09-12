# POS System

A multi-tenant restaurant POS and management platform. This phase establishes the public landing page, persistent Platform Admin workflows, authentication, and restaurant account memberships. Restaurant operations and the POS terminal are future modules.

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

`/workspace` shows the signed-in person's restaurant memberships. It is an account foundation, not a restaurant operations dashboard. Menus, inventory, orders, payments, checkout, and restaurant sales reports are not implemented. Sales sections are explicitly unavailable. Notifications, branding uploads, billing, and MFA are also not implemented.

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

Future tenant operations must use `requireRestaurantMember` with the required roles. It checks the current user, active membership, and active restaurant before granting access. It does not grant platform administrators an implicit tenant bypass. The workspace currently lists only the signed-in user's memberships and contains no POS mutations.

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
npm run start
```

`db:migrate` applies checked-in migrations using `prisma migrate deploy`; it does not reset the database. `build` regenerates Prisma Client before the Next.js production build. `start` serves the production build. On a fresh checkout, run `npx next typegen` before a separate `npx tsc --noEmit --incremental false` check. An uncached production build may need network access for the existing Google-hosted Geist fonts.

Review the test harness configuration before running integration tests. Database tests must use isolated temporary schemas and must never seed, truncate, or delete records in the application's public schema. Use a dedicated development/test database rather than production credentials.

## Rollout and remaining work

Before deploying, review migrations, take a recoverable database backup, rehearse migration deployment against a staging copy, and confirm `db:status`. Keep existing migration history and apply corrections through new forward migrations. Do not use `db push`, reset a database, or delete migrations to work around drift. Rolling back application code must remain compatible with the deployed schema; destructive rollback requires a separately reviewed recovery procedure.

Configure the real application origin, HTTPS, a production authentication secret, verified email delivery, and database connection limits for the hosting environment. Verify invitation delivery, password recovery, direct unauthorized requests, cross-tenant boundaries, and the complete create/invite/accept/activate/archive/restore workflow before opening access.

MFA for platform administrators, operational monitoring, and a tested backup/restore process are recommended before production use. This implementation is not a production-readiness certification. Prisma CLI transitive dependency advisories remain under review; do not force a framework or Prisma downgrade through `npm audit fix --force`.

Product branding, an approved public contact, legal/privacy copy, pricing, and the release scope for restaurant operations still need product decisions. The landing page labels future capabilities explicitly and makes no sales, pricing, or customer-count claims.
