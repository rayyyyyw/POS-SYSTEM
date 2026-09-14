# Restaurant account foundation — implementation handoff

## Delivered

The restaurant account foundation now supports a membership selector, restaurant overview, responsive workspace navigation, settings, owner-managed staff invitations, membership access changes, and a data-derived onboarding checklist. Platform Admin restaurant details display the same onboarding and account-health data. All business data comes from PostgreSQL; there are no runtime mock records.

The existing authentication and invitation-acceptance flows remain in use. A restaurant user signs in through `/login`, opens `/workspace`, and selects a restaurant. A platform administrator without a restaurant membership continues to enter `/admin` and receives no implicit restaurant access.

## Routes and modules

- `/workspace`: active memberships for the current user, with links to each restaurant.
- `/workspace/[restaurantId]`: account overview and lifecycle status.
- `/workspace/[restaurantId]/onboarding`: five account-foundation steps derived from persisted records.
- `/workspace/[restaurantId]/settings`: editable by owners; read-only for managers.
- `/workspace/[restaurantId]/team`: paginated memberships and owner-only invitation management.

The App Router route group is `app/(restaurant)`. Restaurant UI is in `components/restaurant`, Zod contracts in `lib/validation/restaurant`, and role/checklist policies in `lib/domain/restaurant`. `app/actions/restaurant.ts` resolves the server session and delegates to services under `lib/server/restaurant/services`. These services enforce authorization in the same serializable transaction as the protected reads/writes.

The session/navigation facade (`authorization.ts`) is separated from the database access assertion (`access.ts`) so the business boundary can be tested independently of Next.js rendering. Shared forms live in `components/forms/action-form.tsx`; the original admin import remains a compatibility re-export.

## Database

Applied additive migration: `20260914090000_restaurant_workspace`.

It adds:

- `RestaurantSettings`, keyed by and related to `restaurantId`.
- `ServiceMode` and `DefaultOrderType` enums for saved preferences.
- A restaurant/status/createdAt/id membership-listing index.

Restaurant name, city, email, and phone remain on the existing Restaurant record. Its existing version counter protects both platform profile edits and restaurant settings saves. Settings contain address, timezone, currency, locale, service preferences, order prefix, and receipt text. No financial values or tax engine were added.

Currency is an explicit choice. Timezone follows existing platform configuration when the form is first opened. Regional input is validated, and settings have no seeded business defaults masquerading as configured data. Prisma Client was regenerated, migrations are up to date, and the final Prisma comparison found no schema difference.

## Authorization and roles

- OWNER: overview, onboarding, settings read/write, team read, MANAGER/CASHIER invitation management, and non-owner membership role/access changes.
- MANAGER: overview, onboarding, settings read-only, and team-member read access in an active restaurant. Pending invitations and management forms are owner-only.
- CASHIER: account overview in an active restaurant. Team/settings pages and their mutations are denied.
- Platform ADMIN: existing platform administration and aggregate restaurant health. Tenant entry still requires an explicit active membership.

Every restaurant service checks the active, verified user and active membership and scopes operations by restaurant ID. Child membership/invitation IDs are also checked against that restaurant. Browser-supplied roles and actor IDs are never trusted.

Owners may complete setup for PENDING restaurants. Pending staff wait for activation. SUSPENDED and ARCHIVED members receive minimal account-status screens; protected data reads and tenant mutations are blocked. Ordinary membership changes cannot modify an OWNER record, preserving the existing database ownership invariant. Ownership transfer remains in Platform Admin. Disabling staff access preserves account identity, history, and memberships in other restaurants.

## Invitations, onboarding, and admin integration

Owners can invite managers/cashiers, resend eligible pending invitations, revoke links, and edit permitted team roles/statuses. Existing memberships and duplicate usable invitations are rejected. Resending rotates the token and expiry and enforces a one-minute cooldown. Invitation delivery is rate limited and occurs after the transaction commits. Failed delivery persists for retry without exposing token hashes or provider secrets to the UI.

Onboarding checks restaurant activation, complete business contact/address, saved regional settings, an active verified owner, and a staff member or successfully delivered unexpired staff invitation. Menu setup is clearly future work and does not count as a completed foundation step. Failed email delivery does not complete team onboarding.

Platform Admin restaurant detail shows profile/settings completion, active-team and pending-invitation counts, verified-owner presence, last tenant activity, and the shared checklist. Sensitive mutations create restaurant-scoped audit events in the same transaction. Audit failure rolls back the business change.

## Verification

- Formatter: Prettier ran on changed TypeScript/TSX/Markdown files.
- `npm run lint`: passed.
- `node_modules/.bin/tsc --noEmit --incremental false`: passed.
- `npm test`: 39 tests passed, zero failures.
- `npm run build`: passed; all four new restaurant routes were generated as dynamic routes.
- `npm run test:http`: 18 tests passed, zero failures.
- `npm run db:generate`: passed.
- `npm run db:migrate`: applied the additive migration to the confirmed development database.
- `npm run db:status`: up to date.
- Prisma `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: no difference detected.
- `git diff --check`: passed.

New unit/database coverage includes the role/lifecycle matrix, regional validation, tenant isolation, admin non-bypass, pending-owner setup, cross-tenant child IDs, owner protection, membership disabling, stale/concurrent edits, duplicate invitations, delivery failures/retries, acceptance reuse, pagination, secret-free DTOs, and audit rollback.

Production HTTP coverage uses real sessions and rendered Server Action references. It verifies owner settings persistence and admin health, manager/cashier restrictions, multiple memberships, unauthenticated/forged actions, tenant invitation retry/accept/revoke, and suspended/archived screens. Email requests are captured only inside the isolated test server; no test email is sent externally.

Manual browser QA used disposable accounts and an isolated schema. It verified desktop and 390-pixel mobile layouts, owner login and workspace selection, mobile navigation, Escape dismissal/focus restoration, settings save feedback, and the onboarding checklist updating from saved data. Temporary QA data is removed when the fixture stops.

## Configuration and remaining scope

The existing variables remain required: `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET`. Real invitation delivery and account recovery also need `RESEND_API_KEY` and `EMAIL_FROM` using a verified sender. No new environment variables or application dependencies were added. Real Resend/mailbox delivery remains unverified; the application handles missing configuration and provider failure with a saved retryable invitation.

Order prefixes, service mode, order type, and receipt text are saved preferences only. Menu CRUD, order-number allocation, POS transactions, tax calculation, receipt printing, kitchen operations, inventory, and payments are outside this milestone. The next approved development milestone should be real menu/catalog CRUD: categories, items, variants, modifier groups/options, availability, tenant pricing, and archive/restore.

The implementation is present in the checkout's existing commit `869d5c0` (`added restaurant configurations`). No commit was created during this handoff. This report is an additional uncommitted documentation file.

## Complete file inventory

Modified existing files:

- `README.md`
- `app/admin/restaurants/[id]/page.tsx`
- `app/workspace/page.tsx`
- `components/admin/action-form.tsx`
- `prisma/schema.prisma`
- `tests/http.e2e.ts`
- `tests/support/database.ts`

New files:

- `app/(restaurant)/workspace/[restaurantId]/layout.tsx`
- `app/(restaurant)/workspace/[restaurantId]/loading.tsx`
- `app/(restaurant)/workspace/[restaurantId]/not-found.tsx`
- `app/(restaurant)/workspace/[restaurantId]/onboarding/page.tsx`
- `app/(restaurant)/workspace/[restaurantId]/page.tsx`
- `app/(restaurant)/workspace/[restaurantId]/settings/page.tsx`
- `app/(restaurant)/workspace/[restaurantId]/team/page.tsx`
- `app/(restaurant)/workspace/error.tsx`
- `app/actions/restaurant.ts`
- `components/forms/action-form.tsx`
- `components/restaurant/onboarding-checklist.tsx`
- `components/restaurant/page-ui.tsx`
- `components/restaurant/restaurant-shell.tsx`
- `components/restaurant/settings/settings-form.tsx`
- `components/restaurant/team/team-management.tsx`
- `docs/restaurant-foundation.md`
- `lib/domain/restaurant/policies.ts`
- `lib/server/restaurant/access.ts`
- `lib/server/restaurant/authorization.ts`
- `lib/server/restaurant/queries.ts`
- `lib/server/restaurant/services/invitation-service.ts`
- `lib/server/restaurant/services/membership-service.ts`
- `lib/server/restaurant/services/onboarding-service.ts`
- `lib/server/restaurant/services/query-service.ts`
- `lib/server/restaurant/services/settings-service.ts`
- `lib/validation/restaurant/index.ts`
- `prisma/migrations/20260914090000_restaurant_workspace/migration.sql`
- `tests/restaurant.test.ts`

Ignored Prisma Client output was regenerated normally. Environment files, dependencies, and existing migration files were not edited.
