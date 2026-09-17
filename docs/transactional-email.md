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
