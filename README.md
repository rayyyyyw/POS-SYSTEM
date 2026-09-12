# POS System

Multi-tenant restaurant POS SaaS. Phase 1 implements the Platform Admin interface using static, fictional data. The existing PostgreSQL/Prisma connection is separate and is not used by these pages.

## Platform Admin foundation

Open `/admin` after starting the application. The root `/` starter page is preserved.

- `/admin`: overview, account counts, gross restaurant sales and activity.
- `/admin/restaurants`: search, status filter and paginated directory.
- `/admin/restaurants/create`: restaurant and initial owner form preview.
- `/admin/restaurants/[id]`: platform account details.
- `/admin/restaurants/[id]/edit`: prefilled form preview.
- `/admin/restaurants/[id]/activity`: sample lifecycle events.
- `/admin/users`: search, role/restaurant filters and pagination.
- `/admin/users/[id]`: individual user and associated restaurant.
- `/admin/reports`: consolidated sample restaurant sales and account reporting.
- `/admin/settings`: platform preferences preview.

Example records: `/admin/restaurants/rst-001` and `/admin/users/usr-001`. Unknown IDs use the admin not-found boundary.

### Boundaries

Pages and the admin layout are Server Components. Client components handle navigation, filtering, pagination, and local form state. `components/ui` contains the selected official shadcn New York / Tailwind 4 primitives. `components/admin` contains reusable admin UI. `lib/admin` contains presentation types and deterministic formatting. `lib/mock-data/admin.ts` is the server-only source of fixtures and derived totals; only the required view data is passed to interactive components.

The UI uses `cn`, `class-variance-authority`, `radix-ui`, `lucide-react`, and `tw-animate-css`. Registry setup is in `components.json`. Theme tokens are centralized in `app/globals.css`; the current admin design is light, including on devices with dark-mode preferences. Native selects keep filtering and forms lightweight. Charts use HTML/CSS without a chart library.

### Sample data and limitations

All names, emails, statuses, events, and figures are fictional. Account counts reflect the September 11, 2026 snapshot. Sales cover September 1–10, 2026 in PHP; amounts are represented in centavos and summaries derive from one performance dataset. These are **gross restaurant sales**, not platform revenue. No platform monetization model is assumed.

Restaurant forms perform local field and sample-slug validation, then show an explicit preview. Editing an owner previews that individual user's identity; it is not an ownership-transfer workflow. Settings also preview locally. Navigating away or refreshing discards previews. There is no localStorage, API persistence, database access, or saving Server Action. Logout, suspend, archive, branding uploads, and security controls are intentionally unavailable.

Authentication and authorization are not implemented. `/admin` is publicly reachable and must not be connected to real private data until those boundaries exist. Sample `restaurantId` values are record associations, not trusted tenant context. Future tenant context must be resolved from authenticated server-side identity and membership; browser-supplied IDs must never authorize access. Do not treat the robots metadata as access control.

The existing `.env`, `prisma7.config.ts`, `prisma/schema.prisma`, migrations, and generated agent/skill files are intentionally preserved. Never print database credentials or run destructive database commands as part of UI work.

### Validation

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Next.js generates route types during development/build. On a fresh clone, run `npx next typegen` before standalone TypeScript validation. The existing `next/font/google` setup requires font downloads on an uncached build. No database is needed to render the admin fixtures.

Next phase: agree on authentication and server-side platform authorization, then design the smallest restaurant/owner persistence slice with validation and audit events. Keep restaurant operations and POS workflows in a later phase.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
