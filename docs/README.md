# HealthOps Developer Documentation

> The single source of truth for developing, customizing, and deploying the HealthOps platform.

## Table of Contents

1. [Introduction & Architecture](./01-introduction.md) - Project overview, tech stack, monorepo structure, routing, and setup
2. [Customization](./02-customization.md) - Environment variables, theming, branding, fonts, feature flags, and configuration
3. [Database](./03-database.md) - Supabase schema design, migrations, RLS policies, triggers, and best practices
   - [Architecture: Mental Model Shift](./03a-architecture-mental-model.md) - Why direct DB access replaces traditional APIs, and when you still need server actions
   - [RLS Deep Dive](./03b-rls-deep-dive.md) - **MUST READ** — Why RLS is non-negotiable, `USING` vs `WITH CHECK`, common patterns, why the admin client is dangerous, and debugging
4. [Server Components](./04-server-components.md) - Server vs client components, service pattern, page building, and data tables
5. [Data Fetching & Mutations](./05-data-fetching.md) - React Query, server actions, forms, cache management, and optimistic updates
6. [Embeddable Widget](./06-widget.md) - Building a standalone JavaScript widget with Rollup, iframe isolation, and API routes
7. [Realtime Updates](./07-realtime.md) - Supabase Realtime subscriptions, polling, and bidirectional messaging
8. [Payments & Billing](./08-billing.md) - Stripe setup, billing schema, per-seat pricing, feature limits, and enforcement
9. [Deployment (Vercel)](./09-deployment.md) - Production Supabase, Stripe, environment variables, Vercel config, and post-launch checklist

---

## Quick Start

```bash
# 1. Install dependencies
npm install -g pnpm
pnpm i

# 2. Start local Supabase (requires Docker)
pnpm run supabase:web:start

# 3. Start the dev server
pnpm run dev

# 4. Open the app
open http://localhost:3000
```

**Local email testing:** http://localhost:54324 (Mailpit inbox for auth confirmations)

---

## Essential Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm run supabase:web:start` | Start local Supabase services |
| `pnpm run supabase:web:reset` | Reset local database & re-apply migrations |
| `pnpm run supabase:web:typegen` | Generate TypeScript types from DB schema |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint:fix` | Lint and auto-fix |
| `pnpm format:fix` | Format code with Prettier |
| `pnpm --filter web supabase migration new <name>` | Create a new migration file |
| `pnpm --filter web supabase db push` | Push migrations to cloud Supabase |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Styling | Tailwind CSS 4 + Shadcn UI (Radix primitives) |
| Data Fetching | React Query (TanStack Query) |
| Realtime | Supabase Realtime (Phoenix Channels / WebSockets) |
| Monorepo | Turborepo + pnpm |
| Testing | Playwright (E2E), pgTAP (DB) |
| Deployment | Vercel |

---

## Project Structure (High Level)

```
healthcare-facility-operations/
├── apps/
│   ├── web/                    # Main Next.js application
│   │   ├── app/                # Routes & pages
│   │   ├── components/         # Shared app components
│   │   ├── config/             # App configuration (Zod-validated)
│   │   ├── lib/                # Shared utilities & services
│   │   ├── content/            # Markdoc content files
│   │   ├── styles/             # CSS & theme variables
│   │   ├── public/             # Static assets
│   │   └── supabase/           # Migrations, seeds, tests
│   └── e2e/                    # Playwright E2E tests
├── packages/
│   ├── ui/                     # @kit/ui - Shadcn components
│   ├── supabase/               # @kit/supabase - DB clients
│   ├── next/                   # @kit/next - Server action/route utilities
│   ├── billing/                # @kit/billing - Billing schema
│   ├── stripe/                 # @kit/stripe - Stripe integration
│   ├── features/               # @kit/features - Feature packages
│   ├── shared/                 # @kit/shared - Utilities
│   ├── i18n/                   # @kit/i18n - Internationalization
│   ├── email-templates/        # @kit/email-templates - React Email
│   ├── mailers/                # @kit/mailers - Email providers
│   ├── monitoring/             # @kit/monitoring - Observability
│   ├── auth/                   # @kit/auth - Auth utilities
│   ├── accounts/               # @kit/accounts - Personal accounts
│   └── team-accounts/          # @kit/team-accounts - Team management
└── docs/                       # This documentation
```

---

## Prerequisites

- **Git**
- **Node.js** (LTS) with **pnpm** (`npm install -g pnpm`)
- **Docker** (Docker Desktop or OrbStack) for local Supabase
- Accounts: [Supabase](https://supabase.com), [Stripe](https://stripe.com), [Vercel](https://vercel.com)
