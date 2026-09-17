# Transactional email

## Existing architecture preserved

Next.js App Router actions call authorized services, which use Prisma/PostgreSQL
transactions. Better Auth owns credentials, sessions, verification and password
reset. Restaurant invitations use the existing `Invitation` table; accepting a
new invitation creates the existing `User`, credential `Account`, and tenant
membership together. An existing account must authenticate as the invited email.
No parallel auth system, token table, ownership system or schema migration was added.

`Restaurant.email` is business contact information. `User.email` is the login
identity. Updating restaurant profiles changes neither credentials nor ownership
and sends no account email. Login email changes are not enabled by this project.

## Email layer

- `lib/server/email-config.ts`: private sender/contact configuration and canonical,
  validated account URLs. `APP_URL` takes precedence over legacy `BETTER_AUTH_URL`.
- `lib/server/email-templates.ts`: branded, escaped HTML plus plain text for
  owner/staff invitations, password reset, verification, password-reset confirmation,
  and ownership-change notices. No template contains passwords.
- `lib/server/email.ts`: the existing Resend REST transport, now validating input
  and returned email IDs with a 10-second timeout and redacted error categories.
  It remains a REST call deliberately: the installed SDK logs raw provider errors
  in development. No process-wide logging suppression is used in the application.
- `lib/auth.ts`: existing Better Auth callbacks schedule emails using Next.js
  `after`, keeping recovery responses generic even when submission fails.

All modules are `server-only`. The API host is fixed to `https://api.resend.com`;
redirects are rejected. Secrets, raw API errors, recipient addresses and token URLs
are never logged by the email layer. `ADMIN_EMAIL` is an optional Reply-To/contact,
not a sender, authorization grant, or administrator bootstrap setting.

## Configuration

Keep real values in `.env.local` locally, or private Vercel environment variables.
Neither `.env` nor `.env.local` was modified by this integration; both are ignored
by Git. `.env.example` contains placeholders only.

Local development:

```env
APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3000"
RESEND_FROM_EMAIL="onboarding@resend.dev"
ADMIN_EMAIL=""
```

Set `ADMIN_EMAIL` yourself to your administrator contact address if you want email
replies routed there. Keep your existing `RESEND_API_KEY`, `DATABASE_URL` and
`BETTER_AUTH_SECRET`. Restart `npm run dev` after environment changes.

For Vercel, configure:

- `APP_URL`: your actual deployed HTTPS origin, without a path/query.
- `BETTER_AUTH_URL`: the same origin, for compatibility with existing configuration.
- `RESEND_API_KEY`: existing private key with permission for your sending domain.
- `RESEND_FROM_EMAIL`: sender address on a domain verified in your Resend account.
- `ADMIN_EMAIL`: optional administrator contact / Reply-To.
- `DATABASE_URL` and `BETTER_AUTH_SECRET`: existing production database/auth settings.

Redeploy after Vercel environment changes. Do not use `NEXT_PUBLIC_` for these
settings. The application does not depend on `.env.local` in production. Production
requires an explicit sender; development may default to `onboarding@resend.dev`.
Legacy `EMAIL_FROM` remains a fallback, but `RESEND_FROM_EMAIL` wins.

`RESEND_TEST_EMAIL` is used only by the manual connectivity script. No test recipient
setting is needed for application emails: they target the appropriate account email.

## Workflow and security

1. Admin creation commits a pending restaurant, a 72-hour invitation and its audit
   record, then submits the invitation to the owner account email. Account creation
   is deferred until acceptance, preserving the existing design.
2. Tokens contain 32 cryptographically random bytes; only SHA-256 hashes are stored.
   Acceptance verifies status, expiry, tenant lifecycle and identity, hashes a new
   password with Better Auth's existing scrypt implementation, creates membership
   and consumes the invitation in a serializable transaction. The account is active
   and verified, but the restaurant still requires the normal admin activation.
3. Admin resend enforces eligibility, a one-minute cooldown and the existing
   per-actor rate limit. It rotates the token and invalidates the old link. Existing
   tenant-owner staff invitations remain tenant-scoped; they cannot issue owner
   invitations or call the platform-admin resend service.
4. Better Auth password reset uses the existing Verification table with
   `storeIdentifier: "hashed"`, a one-hour expiry, atomic single-use consumption,
   password hashing and session revocation. Newly issued reset tokens are not stored
   in plaintext. Any pre-existing legacy reset records expire normally; no data was
   reset or deleted as part of deployment.
5. Reset and verification links stay on the configured application origin. The
   callback is fixed to the matching local account page. Better Auth also checks
   request origins and rate-limits requests. Forgot-password responses are generic
   for known and unknown accounts.
6. The existing admin ownership-transfer workflow notifies the former and new owner
   at their account addresses after commit. Failure never undoes the transfer; the
   action warns the admin and an outcome is written to activity where possible.
   Password-reset confirmation is also sent without affecting reset success.

## Submission is not delivery

The existing database enum `SENT` means **submitted/accepted by Resend**, not inbox
delivery. The UI labels it "Email submitted". `FAILED` is shown as "Submission
unconfirmed": it includes definite rejection and uncertain timeout/response cases.
The restaurant/invitation remains saved, so the admin can inspect and resend.
If acceptance is uncertain, check Resend's dashboard before retrying. Resend
idempotency keys protect repeat submissions of the same invitation token; the
intentional resend action creates a new token and therefore a new message.

No delivery/bounce webhook or automatic retry queue is introduced. A request can
terminate after commit but before email submission/status update; such an invitation
remains pending and can be resent. Security notifications are best effort. If durable
retry guarantees are needed, the next step is a transactional outbox/worker, followed
by signed Resend webhooks for delivered/bounced/failed status and provider-ID storage.
Never repeat an ownership transfer solely to retry its notification.

## Manual checks

Use an account/address you control. The `onboarding@resend.dev` sender only permits
real mail to your Resend account address. `delivered@resend.dev` is a simulation
recipient, not a real inbox you can use to click an activation link. Sending to
arbitrary restaurant owners requires verifying a domain in Resend, completing its
DNS requirements, and setting `RESEND_FROM_EMAIL` to a sender on that domain.

1. **Invitation:** sign in as admin; open `/admin/restaurants/create`. Use different
   business and owner email addresses. Submit once, open the new restaurant detail,
   and inspect invitation status. Check the owner inbox/spam and Resend dashboard.
2. **Activation:** open the emailed link. A new account chooses a name and a
   12–128-character password; an existing account signs in as the invited identity.
   Accept, sign in, and verify the restaurant workspace. Reusing the invitation must
   fail. In admin, activate the restaurant through its existing lifecycle control.
3. **Password reset:** sign out, open `/forgot-password`, enter the account email,
   follow the email and set a new password. Confirm new credentials work, old
   credentials and sessions do not, and reusing the reset link fails. Unknown email
   addresses must get the same generic response. Check the confirmation email.
4. **Resend:** for a pending invitation, wait at least one minute and click
   **Resend invitation** (or **Retry delivery** after a failure). Confirm the old
   link fails and only the new link works. Immediate repeat requests are blocked.
5. **Profile isolation:** edit only the restaurant business email. Confirm the
   owner's login email/password stay unchanged and no new email appears.
6. **Ownership notices:** transfer to an eligible existing verified member using
   the existing admin form. Check both affected account inboxes and activity.

The standalone `npm run test:resend` remains optional/manual, with sender precedence
`--from` → `RESEND_FROM_EMAIL` → legacy `EMAIL_FROM` → `onboarding@resend.dev`.
It is never run by `npm test`.

## Automated validation

```powershell
npm test
npm run lint
npm run build
npm run test:http
```

Service tests use disposable PostgreSQL schemas, not normal application tables.
Email unit tests intercept all transport calls. HTTP tests run an isolated production
server with dummy credentials and a local mailbox intercepting Resend requests;
no automated test sends real email. The HTTP suite requires a completed build.
Prisma Client is regenerated by the existing build script. No new migration is
required, so there is no migration command for this change.

Integration validation: `npm test` passed 50 tests; `npm run test:http` passed 19
tests; lint and the production build passed. The build reports an existing warning
about a parent-directory package-lock outside this repository; it does not prevent
the build and no unrelated configuration was changed.

## File inventory for this integration

Created:

- `lib/server/email-config.ts`
- `lib/server/email-templates.ts`
- `tests/email.test.ts`
- `docs/transactional-email.md`

Modified:

- `.env.example`: configuration placeholders.
- `lib/server/email.ts`: validated, redacted Resend submission transport.
- `lib/auth.ts`: templates, canonical links, hashed reset identifiers, confirmation notice.
- `lib/server/invitations.ts`: templates, stale-token guards and resend eligibility.
- `lib/server/admin-service.ts`: post-commit ownership notifications and audit outcomes.
- `app/actions/admin.ts`: submission feedback and ownership-notification failure feedback.
- `app/actions/restaurant.ts`: accurate submission feedback for existing staff invitations.
- `components/admin/page-ui.tsx`: submitted/unconfirmed status labels.
- `components/restaurant/team/team-management.tsx`: matching staff-invitation labels.
- `scripts/test-resend.ts`: new sender variable precedence/help; remains manual-only.
- `tests/integration.test.ts`: ownership submission success/failure and post-commit checks.
- `tests/onboarding.test.ts`: admin-only resend, invalid token and business-email isolation.
- `tests/http.e2e.ts`: updated subjects/labels, hashed reset storage, expiry, generic responses,
  off-site redirect rejection and profile-edit no-email checks.
- `tests/support/app-server.ts`: isolate new environment settings in the mocked HTTP server.
- `tests/support/mail-capture.mjs`: valid mock Resend email IDs.

No dependency versions, package scripts, Prisma schemas, migrations or private
environment files were changed. Existing invitation/tenant tests were retained.

Provider references: [Resend sender restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain),
[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Better Auth verification storage](https://better-auth.com/docs/reference/options).

## Owner invitation audit (2026-09-17)

The existing owner flow was connected; this audit repaired diagnostics and recovery
UX without replacing authentication, invitations, membership or email transport.

### Verified call path and identity

- `RestaurantForm` -> `app/actions/admin.ts::createRestaurant` ->
  `lib/server/admin-service.ts::createRestaurant` -> transaction creating the pending
  restaurant, OWNER invitation and audit -> `deliverInvitation` -> `sendEmail` ->
  Resend `POST /emails`.
- For an existing pending restaurant with no owner, `RestaurantInvitations` ->
  `app/actions/admin.ts::inviteMember` -> `lib/server/invitations.ts::inviteMember`
  creates the same invitation and uses the same delivery path.
- Resend receives `to: [Invitation.email]`. Business email, `ADMIN_EMAIL` and
  `RESEND_TEST_EMAIL` never replace it. `ADMIN_EMAIL` is only optional Reply-To.
- The link is `APP_URL` + `/accept-invitation?token=<raw-token>`, with validated
  `BETTER_AUTH_URL` fallback. No service-hardcoded localhost is needed. Templates
  contain POS-SYSTEM branding, restaurant name, invited email, owner/staff role,
  expiration and an acceptance CTA, with no password, token hash or API key.
- A token uses 32 random bytes and a unique stored SHA-256 hash, expires after
  72 hours, and is consumed transactionally. Invalid, expired, revoked and already
  accepted links cannot establish membership.
- New users create credentials and accept together, then sign in. Passwords use
  Better Auth hashing. Existing users must authenticate as the invited identity;
  no duplicate account is created. A different signed-in identity is rejected.
- Tenant checks reload the active, verified identity and active membership for
  the requested restaurant, enforcing role and restaurant lifecycle. Legitimate
  memberships in other restaurants remain intact. Invitation acceptance grants
  no platform-admin privilege. Pending owners can prepare their restaurant; admin
  activation remains separate.

### Confirmed defects fixed

1. Resend failures previously collapsed into generic diagnostics, and invitation
   delivery discarded their category. The transport now classifies safe static
   messages for missing/invalid keys, invalid addresses, testing-recipient limits,
   unverified domains, provider errors, quotas and uncertain network outcomes.
   Admin create/invite/retry actions expose those static explanations. Server logs
   contain only safe categories, never raw provider bodies or secret values.
2. A database failure while saving submission status could escape after restaurant
   creation had committed. Delivery now preserves the saved result and reports
   uncertainty, including when its failure-status write also fails.
3. The wrong-account switch sent new invitees to login even when they needed to
   create an account. It now returns to the acceptance/setup route after logout.
4. Suspended restaurants displayed sending controls despite server rejection.
   Those controls now match server eligibility; pending invitations remain
   revocable while suspended.

Pending means not accepted/revoked; expiration is derived separately. Email status
is independent: PENDING is awaiting submission confirmation, SENT is provider
acceptance, and FAILED is submission unconfirmed, not proof of non-delivery.
Accepted and revoked links are unusable. Retry keeps the invitation row and email,
rotates its token, renews expiry, enforces a 60-second cooldown and the existing
20-per-300-second actor limit. After revocation use **Send invitation** to create
a fresh OWNER invitation; the revoked record/link remains invalid.

### Audit changes and test coverage

Source files modified: `app/actions/admin.ts`,
`components/admin/restaurant-management.tsx`, `components/auth/invitation-form.tsx`,
`lib/server/admin-service.ts`, `lib/server/email-config.ts`, `lib/server/email.ts`,
and `lib/server/invitations.ts`.

Tests modified: `tests/email.test.ts`, `tests/onboarding.test.ts`,
`tests/http.e2e.ts`, `tests/support/app-server.ts`, and
`tests/support/mail-capture.mjs`. This document was also updated. No new files,
dependencies, migrations, environment changes or manual-test-script changes.

New cases exercise safe provider diagnostics, post-commit status-write failure,
mocked testing-recipient rejection followed by successful recovery, the emailed
link through brand-new credential creation/login/tenant access, wrong-account
rejection, token hashes and reuse, explicit separation from a configured test
recipient, and fresh/retried links after revocation/expiry. Existing identity,
authorization, concurrency, cooldown and business-email independence tests remain.

Final audit validation: `npm test` passed 52 tests; `npm run test:http` passed
22 tests; `npm run lint` and `npm run build` passed. The existing parent-directory
package-lock warning remains. Automated failures labelled `missing_api_key` are
intentional isolated fixtures, not a diagnosis of the real local configuration.
`npm run test:resend` remains unchanged and was not executed.

### Local acceptance checklist and remaining limits

1. Restart `npm run dev`. Check privately that `APP_URL` and `BETTER_AUTH_URL` match
   `http://localhost:3000`, or your actual local origin, and that the sender is
   appropriate for your Resend account. Never put the key in browser code or chat.
2. Open `http://localhost:3000/admin/restaurants/create`, enter an owner email you
   control, and submit once. With `onboarding@resend.dev`, use the actual Resend
   account email for a real inbox test. Use a different business contact email.
3. Inspect the saved invitation and Resend dashboard, then the owner inbox/spam.
   If rejected, preserve that owner email; correct configuration before retrying.
4. Open the latest emailed URL on the computer running the app. Use an incognito
   window for a brand-new owner. Set a name/password, accept, then sign in. Existing
   users should choose **Sign in to accept**. For a wrong account, choose **Use a
   different account** and follow the matching setup/sign-in path.
5. Check `/workspace`, the assigned restaurant and settings. Another tenant and
   `/admin` must remain inaccessible unless separately authorized. Activate the
   pending restaurant in Admin when ready. Confirm the used link cannot be reused.
6. On another pending invitation, wait one minute and retry. Only the newest link
   should work. Revoke it, verify rejection, and use **Send invitation** with role
   Owner for a replacement if that restaurant still has no accepted owner.

Testing-sender rejection is an external Resend configuration restriction, not a
reason to reroute to `RESEND_TEST_EMAIL`. No actual failing request was submitted
in this audit, so the cause of any particular live rejection still needs its safe
diagnostic or Resend dashboard record. Verified-domain sending requires changing
`RESEND_FROM_EMAIL` to that domain and ensuring the key has sending permission;
recipient logic does not change. Deployment also needs matching HTTPS application
origins. Another device's localhost does not point to this development machine.

Automated HTTP tests exercise real production routes/actions with mocked email,
not real inbox delivery or a hydrated-browser click on the account-switch button.
POS, menu, orders and revenue features do not exist yet; their tenant boundaries
cannot be claimed as tested. Production durability still lacks an outbox/worker,
provider-ID persistence and signed delivery/bounce webhooks. Safe failure categories
are returned to Admin and logged, but not persisted per invitation. If status writes
fail, the saved invitation can remain in the awaiting-submission state until retry.
