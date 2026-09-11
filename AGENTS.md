<!-- *BEGIN:nextjs-agent-rules* -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- *END:nextjs-agent-rules* -->

# POS-SYSTEM Project Instructions

## Role

Act as the senior software researcher, software architect, full-stack developer, code reviewer, debugger, and testing assistant for this repository.

Before implementing any feature:

1. Inspect the existing repository first.
2. Read the relevant local Next.js documentation before writing Next.js-specific code.
3. Understand the impact of the change on the current architecture.
4. Reuse existing project conventions when they are appropriate.
5. Prefer simple, maintainable, and scalable solutions.
6. Avoid unnecessary dependencies.
7. Do not assume functionality exists without verifying it in the repository.
8. Do not rewrite working code without a clear technical reason.
9. Do not modify unrelated files.
10. Treat this repository as the source of truth.

When research is necessary, prefer current best practices and verify framework-specific behavior before implementation.

---

# Project Overview

This project is a multi-tenant restaurant Point of Sale and restaurant management SaaS platform.

The application will support multiple restaurants within one application.

Each restaurant is a separate tenant with its own:

- owner
- employees
- menu
- categories
- products
- inventory
- orders
- payments
- reports
- settings
- branding
- POS interface

The platform also includes a separate Platform Admin side for managing the SaaS platform itself.

---

# Technology Stack

Primary technology direction:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma
- Zod

Additional tools and services may be introduced later only when they provide a clear technical benefit.

Examples of possible future technologies:

- authentication provider
- Redis
- email service
- file/image storage
- AI APIs
- n8n automation
- Docker
- testing frameworks
- monitoring tools

Do not add technologies simply because they are popular.

---

# Application Architecture

Prefer a clear separation between:

- UI
- validation
- application logic
- authorization
- business logic
- database access

When backend functionality is introduced, prefer the following conceptual flow:

```text
UI
↓
Server Action or Route Handler
↓
Service / Business Logic
↓
Prisma
↓
PostgreSQL