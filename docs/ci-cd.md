# CI/CD: GitHub Actions and Vercel

## Scope and architecture

The repository had no `.github` workflows, `vercel.json` or local `.vercel`
linkage. The Git remote is `rayyyyyw/POS-SYSTEM`, with `main` checked out.
Account-side Vercel linkage, secrets and GitHub rules were not accessible/verified.
Existing Prisma 7 scripts, three migrations, Better Auth, email and tests are reused.

One workflow, `.github/workflows/ci.yml` (**CI and Release**), contains two jobs:

- **CI**: PRs targeting main and pushes to main, on a disposable hosted runner.
- **Production release**: only a main push whose same-run CI succeeds, and only
  when repository variable `PRODUCTION_DEPLOY_ENABLED` equals `true`. It uses the
  protected GitHub Environment `production`. No PR deployment or manual bypass
  trigger is provided. Leave the variable unset until setup is complete.

An explicit job dependency avoids cross-workflow artifact/event trust problems.
Vercel CLI deploys the checked-out, CI-validated SHA, not a moving branch.
`vercel.json` disables native Git deployment for every branch, preventing a second
automatic production path. Disconnect any existing Vercel Git integration and
remove external deploy hooks if they would bypass this workflow. Repository config
cannot stop authorized humans from manually deploying through Vercel or another token.

## CI setup and commands

CI uses Ubuntu 24.04, Node **22.x**, and a PostgreSQL **17** service. Node 22 matches
the tested local major (22.19.0) and satisfies locked Prisma's >=22.12 requirement.
Official checkout/setup-node actions are pinned to release commit SHAs (v7.0.1 /
v7.0.0). Review action/CLI pins periodically; do not force dependency downgrades.
Only npm's dependency cache is shared in CI; no production cache/artifacts are used.

PostgreSQL has database/user `pos_ci`, a throwaway password defined in the workflow,
port 5432 on loopback, and `pg_isready` health checks every 5 seconds (12 retries).
The CI-only DATABASE_URL points solely to this container. No DB secret is referenced.
The entire database disappears with the runner. Tests additionally create and remove
their own random `pos_test_*` schemas and never use application/public tables.

Exact order after checkout/Node setup:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:status
npm test
npm run lint
npm run build
npm run test:http
```

`db:migrate` is `prisma migrate deploy --config prisma7.config.ts`. CI applies all
checked-in migrations to its disposable public schema, independently of isolated
test schemas. The existing test fixture lists the three current migrations explicitly;
when adding a migration, update that fixture list too. No `db push`, reset, shadow
database, seed or development migration command is needed.

The HTTP suite MUST follow build: it starts `next start` and uses the current action
manifest. Build also regenerates Prisma. ESLint and build/type failures gate release.
Uncached builds need outbound access for existing Next.js font downloads.

CI supplies a public throwaway Better Auth secret and localhost origins. The HTTP
harness replaces these with its random secret/loopback port. Resend variables are
empty; email unit tests mock transport, database tests exercise missing-key failures,
and HTTP tests intercept mail with dummy credentials and `@example.test` recipients.
Expected `missing_api_key` diagnostics are not deployment-configuration failures.
`npm run test:resend` is NEVER executed by CI. Do not add a real email key to CI.

`contents: read`, non-persistent checkout credentials and isolated hosted runners
limit PR privileges. No `pull_request_target`, PR-text shell interpolation, secret
inheritance or production environment is used in CI. PR code is necessarily executed
as tests, but without deployment secrets. Require workflow review before merging.
Newer runs cancel only obsolete CI for the same PR/ref. Production uses a separate
non-cancelling concurrency lock; queued releases check current main HEAD before
migrating. GitHub concurrency is not a FIFO deployment queue.

## Connect Vercel without deploying yet

Use your actual Vercel account/team; do not create tokens or link accounts in chat.
These commands are for you to execute, not automatic deployment steps:

```bash
npx vercel@59.20.0 login
npx vercel@59.20.0 link
```

Choose/create the intended project and repository root. `link` records identifiers
in ignored `.vercel/project.json`; copy `orgId`/`projectId` into the matching GitHub
environment secrets below. It does not deploy. Do not run bare `vercel` or import
through a flow that immediately deploys before setup. If already linked, inspect
Vercel Project Settings -> Git and disconnect independent Git deployment.

In Vercel Project Settings -> Build and Deployment, select Next.js, repository root,
and Node **22.x**. `vercel.json` sets Install Command `npm ci` and Build Command
`npm run build`. Never add migrations to either command. Confirm the project's
assigned production `vercel.app` domain under Settings -> Domains; do not guess it.
That URL suffices for hosting/auth; a custom application domain is optional.

## Environment separation

Local uses ignored `.env.local`/`.env`, local PostgreSQL and a local application
origin. Nothing here edits those files. The unchanged `.env.example` already lists
the application's variables. All are server-side; none should use `NEXT_PUBLIC_`.

CI uses only its container connection, dummy auth secret, localhost origins and
empty email settings described above. It has no GitHub environment attachment.

Preview deployments are deliberately **disabled**. Before enabling them, provision
a separate staging database, independent auth secret, stable preview HTTPS origin,
and disabled/restricted email. Do not copy production environment values into Preview.
A future preview release must follow CI and trusted approval before any preview
secrets are exposed; fork PRs must not obtain them. Existing HTTP tests always run
against their disposable local app, never a deployed preview or production site.

In Vercel -> Project Settings -> Environment Variables, select **Production only**:

- `DATABASE_URL`: real hosted PostgreSQL runtime connection, including provider TLS
  requirements and intended schema. Use a suitably restricted runtime role and a
  provider-supported pooler if needed. The current app allows 5 connections per
  instance, not 5 globally; size limits for serverless concurrency.
- `BETTER_AUTH_SECRET`: a newly generated high-entropy production secret (at least
  32 characters), distinct from local/CI/preview. Store privately; rotation can
  invalidate sessions. Never copy the workflow's dummy secret.
- `APP_URL`: the actual production HTTPS origin, without a path/query.
- `BETTER_AUTH_URL`: exactly the same origin. APP_URL currently takes precedence.
- `RESEND_API_KEY`: private production sending key, only if email is enabled.
- `RESEND_FROM_EMAIL`: sender on your verified Resend domain. For limited initial
  testing, explicitly using `onboarding@resend.dev` retains its recipient restrictions;
  it is not ready for arbitrary restaurant owners. Leave the key absent to keep
  sending disabled while validating hosting. Saved invitations remain recoverable.
- `ADMIN_EMAIL`: optional valid contact/Reply-To address, not a recipient override.

Do not set `RESEND_TEST_EMAIL` in production. `EMAIL_FROM` is legacy fallback only;
prefer RESEND_FROM_EMAIL. Do not set fixture variables such as POS_TEST_MAIL_CAPTURE.
Vercel supplies NODE_ENV itself. Redeploy after environment changes; update both
application origins together when moving domains. A Vercel-provided subdomain is
not a Resend sending domain you own/control for DNS verification.

## GitHub configuration (required before enabling CD)

1. Settings -> Actions -> General: allow the official pinned actions and use
   read-only default workflow permissions. Require approval for external contributors.
2. Settings -> Environments -> New environment: name it **production**. Restrict
   deployment branches/tags to **main only**, not all protected branches. Add required
   reviewers and prevent self-review/bypass where your GitHub plan permits. Approval
   must include migration/backups review. If unavailable, document the limitation
   and use a maintainer-controlled release process before enabling unattended CD.
3. Add these **environment secrets**, not workflow literals or CI secrets:
   - `VERCEL_TOKEN`: appropriately scoped token for the intended Vercel team/project.
   - `VERCEL_ORG_ID`: actual linked org/team identifier.
   - `VERCEL_PROJECT_ID`: actual linked project identifier.
   - `PRODUCTION_DATABASE_URL`: a migration-capable direct PostgreSQL connection.
     It MUST address the same database/schema as Vercel's runtime DATABASE_URL.
     Host/role may differ for pooling; verify the mapping yourself. This is not a
     local URL, a CI URL, or a new application runtime variable.
4. After the first PR CI run, Settings -> Rules -> Rulesets -> New branch ruleset:
   target main, enforce pull requests/review, require the **CI** status check from
   GitHub Actions (select the actual emitted job check), require branches up to date,
   block force pushes/deletion, restrict bypasses. Require review for workflow and
   migration edits. Do not require Production release for merging; it runs after merge.
   Merge queue is not configured: add `merge_group` CI support before enabling it.
5. Only after Vercel, database, backups and environment protections are ready, set
   Settings -> Secrets and variables -> Actions -> **Variables** -> repository variable
   `PRODUCTION_DEPLOY_ENABLED` to `true`. Keep it unset/false otherwise. This must be
   a repository variable, not environment-only, because job eligibility is evaluated
   before entering the production environment.

## Production process and failure handling

After a main push passes CI and any environment approval:

1. Check out that exact SHA on a fresh runner; check required secrets without values.
2. `npm ci` installs locked migration tooling without application secrets.
3. Install pinned CLI `npm install --global vercel@59.20.0` (not an app dependency).
4. Reject obsolete queued commits before DB changes.
5. `npm run db:migrate`, then `npm run db:status`, using the migration connection
   only in that step. The Prisma reference informed use of deploy rather than dev.
   Connection diagnostics are not printed/uploaded; failures yield a safe message.
6. `vercel deploy --prod --yes --token "$VERCEL_TOKEN"` sends validated source to
   the linked project. Vercel runs npm ci/build using its Production environment.

This intentionally does NOT download production application secrets with
`vercel pull` or reuse CI's ordinary `.next` directory as a Vercel prebuilt artifact.
The CI build validates code; Vercel's second build produces deployment-specific
output. Application production secrets stay on Vercel; GitHub holds only release
credentials and the migration connection. No production dependency/build cache or
secret-bearing logs are uploaded as GitHub artifacts.

Any CI failure prevents release. Missing secrets or migration/status failure stop
before Vercel deploy. A Vercel build/deploy failure normally leaves the previous
deployment serving, but successful DB migrations are NOT rolled back. A timeout or
manual cancellation may be ambiguous: inspect Vercel/database state before rerunning.
The job timeout is not proof a migration/deployment did nothing.

Migrations must be reviewed, rehearsed on staging, and backed up before approval.
Use expand/contract releases for drops/renames, new required fields, type conversions
and large backfills: the old app remains live while migrations run. Existing
migrations are additive; do not rewrite applied history. No automatic DB rollback,
force reset or `db push` is provided. Repair failed migrations through a reviewed
operator procedure; never blindly mark a failed migration applied.
The migration endpoint must be reachable securely from GitHub hosted runners;
private-network databases need an approved networking/runner solution, not disabled TLS.

## First run and safe verification

In GitHub -> Actions expect **CI and Release**, with CI steps for install, Prisma,
tests, lint, build and HTTP tests. PR runs show Production release skipped. Main
runs also skip release while the enable variable is unset; after setup, they wait
for production approval if configured, then migrate and deploy. A failing CI job
must leave Production release skipped.

After you authorize the first release, verify the Vercel deployment shows Ready,
the intended project/SHA and correct Production URL. Inspect migration success and
check the public landing page, login page, and unauthorized Admin redirect without
creating data. For an empty production DB, use the existing interactive
`npm run admin:bootstrap` from a trusted operator environment deliberately pointed
at production; never seed/demo/bootstrap in CI. Then use accounts you control to
check login, invitation, recovery and tenant isolation. Those are intentional manual
production operations, not permission to run automated suites against production.
Check Resend separately for submission/delivery; do not mass-invite real owners.

Local validation cannot prove GitHub service-container execution, environment
protection, Vercel account linkage, remote build compatibility or real DB reachability.
No push, merge, account configuration, production migration or deployment is performed
by implementing these files. npm audit is not a blocking step; Prisma transitive
advisory remediation remains a separate task. No `npm audit fix --force` is used.

Validation on 2026-09-17: 52/52 unit/service tests and 22/22 HTTP tests passed;
lint, production build, actionlint 1.7.12, YAML/JSON parsing and pipeline-safety
assertions passed. The existing machine-specific parent lockfile warning remains.
Docker is not available here, so the hosted PostgreSQL service and clean-runner
`npm ci`/migration sequence still need their first GitHub run. No dependency files
or tests were changed; local verification used the existing installed dependencies.

References: [Vercel CLI deploy](https://vercel.com/docs/cli/deploy),
[disable Git deployment](https://vercel.com/docs/project-configuration/git-configuration),
[GitHub deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[GitHub PostgreSQL services](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers).
