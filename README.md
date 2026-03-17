# HealthOps — Healthcare Facility Operations Platform

> Streamline bookings, eliminate no-shows, automate follow-ups, and multiply revenue for healthcare professionals.

Built for doctors, technicians, pathology labs, radiologists, dental clinics, and physiotherapists.

---

## Prerequisites

Before you begin, make sure you have:

| Tool | Required Version | Check With | Install |
|------|-----------------|------------|---------|
| **Node.js** | >= 20.10.0 | `node -v` | [nodejs.org](https://nodejs.org) |
| **pnpm** | >= 10.x | `pnpm -v` | `npm install -g pnpm` |
| **Git** | Latest | `git --version` | [git-scm.com](https://git-scm.com) |

**Accounts / Access needed:**
- **Supabase** — The project uses a shared cloud Supabase instance. Ask your manager for the Supabase Dashboard login credentials.
- [Stripe](https://stripe.com) — Payments and billing (ask your manager for test-mode keys)
- [Vercel](https://vercel.com) — Hosting and deployment

---

## Version Info

| Package | Version |
|---------|---------|
| Project | 2.24.1 |
| Next.js | 16.1.6 |
| React | 19.2.4 |
| TypeScript | ^5.9.3 |
| Supabase JS | 2.97.0 |
| Supabase CLI | 2.76.15 |
| PostgreSQL | 17 |
| Tailwind CSS | 4.2.1 |
| Stripe SDK | 20.4.0 |
| TanStack Query | 5.90.21 |
| Zod | 3.25.76 |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Database | Supabase Cloud (PostgreSQL 17) |
| Auth | Supabase Auth (email, password, magic link, OAuth, MFA) |
| Payments | Stripe (subscriptions, per-seat billing) |
| Styling | Tailwind CSS 4 + Shadcn UI (Radix primitives) |
| Data Fetching | React Query (TanStack Query) |
| Realtime | Supabase Realtime (WebSockets) |
| Email | Nodemailer / Resend (production only) |
| File Storage | Supabase Storage (S3-compatible) |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Playwright (E2E), pgTAP (database) |
| Deployment | Vercel |

---

## Installation

### 1. Clone the Repository

```bash
git clone git@github-datahealer:datahealer/healthcare-facility-operations.git
cd healthcare-facility-operations
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all packages across the monorepo (apps + packages).

### 3. Environment Setup

The project uses **cloud Supabase** (not a local instance). All configuration lives in `apps/web/.env.development`.

This file is already checked into the repo with the correct Supabase cloud URL and keys. Verify it contains:

```bash
# apps/web/.env.development

# Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLIC_KEY=<anon-key>
SUPABASE_SECRET_KEY=<service-role-key>
```

> **Don't have these values?** Ask your manager for the Supabase project credentials. You can also find them in the Supabase Dashboard under Settings → API.

For **Stripe** (only needed if working on billing features):

```bash
# Also in apps/web/.env.development
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Running Locally

### Start the Dev Server

```bash
pnpm dev
```

That's it. The app connects to the cloud Supabase instance configured in `.env.development`.

### What's Running

| Service | URL | Notes |
|---------|-----|-------|
| **Next.js App** | http://localhost:3000 | The web application |
| **Supabase (Cloud)** | Configured in `.env.development` | Database, Auth, Storage, Realtime |
| **Supabase Studio** | Log in at [supabase.com/dashboard](https://supabase.com/dashboard) | Browse tables, run SQL, manage storage, view auth users |

### Stop the Dev Server

```
Ctrl+C in the terminal running pnpm dev
```

---

## Database Management

The database runs on **Supabase Cloud**. There is no local database. All migrations are written locally and pushed to the cloud instance.

> **Supabase Dashboard:** Log in at [supabase.com/dashboard](https://supabase.com/dashboard) to browse tables, run SQL, view auth users, manage storage, and check logs. Ask your manager for login credentials if you don't have access.

### Commands

| Command | Description |
|---------|-------------|
| `pnpm --filter web supabase migration new <name>` | Create a new migration file locally |
| `cd apps/web && npx supabase db push` | Push migrations to cloud Supabase |
| `pnpm run supabase:web:typegen` | Regenerate TypeScript types from the cloud schema |

### Typical Workflow

```bash
# 1. Create a migration
pnpm --filter web supabase migration new add-appointments-table

# 2. Write SQL in the generated file
#    → apps/web/supabase/migrations/<timestamp>_add-appointments-table.sql

# 3. Push to cloud
cd apps/web && npx supabase db push

# 4. Regenerate TypeScript types
pnpm run supabase:web:typegen
```

### First-Time Setup: Link to Cloud Project

Before you can push migrations, link the CLI to the cloud project (one-time step):

```bash
cd apps/web
npx supabase link --project-ref <your-project-ref>
```

> **Important:** Always run Supabase CLI commands from the `apps/web/` directory, not the repo root. The `supabase/config.toml` and migrations live there.

---

## Essential Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server (http://localhost:3000) |
| `pnpm build` | Production build |
| `pnpm typecheck` | Run TypeScript type checking across all packages |
| `pnpm lint:fix` | Lint and auto-fix all packages |
| `pnpm format:fix` | Format code with Prettier |
| `pnpm run supabase:web:typegen` | Generate TypeScript types from DB schema |
| `pnpm --filter web supabase migration new <name>` | Create a new migration file |
| `cd apps/web && npx supabase db push` | Push migrations to cloud |
| `pnpm run stripe:listen` | Start Stripe webhook listener (for billing dev) |

---

## Verification

After making any changes, always run:

```bash
pnpm typecheck       # Type checking
pnpm lint:fix        # Linting
pnpm format:fix      # Formatting
```

All three must pass before committing.

---

## Developer Documentation

All documentation lives in the [`docs/`](docs/) directory. **Start here:**

### Getting Started

| # | Document | What You'll Learn |
|---|----------|-------------------|
| 1 | [Introduction & Architecture](docs/01-introduction.md) | Project overview, tech stack, monorepo structure, routing, and initial setup |
| 2 | [Customization](docs/02-customization.md) | Environment variables, theming, branding, fonts, feature flags, and configuration |

### Core Concepts (Read Before Building Features)

| # | Document | What You'll Learn |
|---|----------|-------------------|
| 3 | [Database](docs/03-database.md) | Supabase schema design, migrations, RLS policies, triggers, and best practices |
| 3a | [Architecture: Mental Model Shift](docs/03a-architecture-mental-model.md) | Why direct DB access replaces traditional APIs, when you still need server actions |
| 3b | **[RLS Deep Dive](docs/03b-rls-deep-dive.md)** | **MUST READ** — Why RLS is non-negotiable, policy patterns, why the admin client is dangerous |
| 10 | **[Feature Configuration Guide](docs/10-feature-configuration-guide.md)** | **READ BEFORE CODING** — What to toggle, what Supabase handles, what to never reimplement |

### Building Features

| # | Document | What You'll Learn |
|---|----------|-------------------|
| 4 | [Server Components](docs/04-server-components.md) | Server vs client components, service pattern, page building, data tables |
| 5 | [Data Fetching & Mutations](docs/05-data-fetching.md) | React Query, server actions, forms, cache management, optimistic updates |
| 13 | [Data Access & APIs](docs/13-data-access-apis.md) | Auto-generated REST API, RPC functions, GraphQL, Supabase clients, testing |
| 6 | [Embeddable Widget](docs/06-widget.md) | Standalone JavaScript widget with Rollup, iframe isolation, API routes |
| 7 | [Realtime Updates](docs/07-realtime.md) | Supabase Realtime subscriptions, polling, bidirectional messaging |

### Infrastructure & Services

| # | Document | What You'll Learn |
|---|----------|-------------------|
| 8 | [Payments & Billing](docs/08-billing.md) | Stripe setup, billing schema, per-seat pricing, feature limits, enforcement |
| 11 | [Email & Notifications](docs/11-email-notifications.md) | Mailer setup (Nodemailer/Resend), auth emails, templates, production SMTP |
| 12 | [File Storage](docs/12-file-storage.md) | Supabase Storage buckets, upload/download, RLS for files, signed URLs |

### Deployment

| # | Document | What You'll Learn |
|---|----------|-------------------|
| 9 | [Deployment (Vercel)](docs/09-deployment.md) | Production Supabase, Stripe, environment variables, Vercel config, post-launch checklist |

---

## Project Structure

```
healthcare-facility-operations/
├── apps/
│   ├── web/                    # Main Next.js application
│   │   ├── app/                # Routes & pages (App Router)
│   │   │   ├── (marketing)/    # Public pages (/, /pricing, /faq, /blog)
│   │   │   ├── auth/           # Auth pages (sign-in, sign-up, callback)
│   │   │   └── home/           # Authenticated app (personal + team accounts)
│   │   ├── components/         # Shared app components
│   │   ├── config/             # App configuration (Zod-validated)
│   │   ├── lib/                # Shared utilities, services, types
│   │   ├── styles/             # CSS & Shadcn theme variables
│   │   ├── public/             # Static assets, translations, favicons
│   │   └── supabase/           # Migrations, seeds, templates, tests
│   └── e2e/                    # Playwright E2E tests
├── packages/
│   ├── ui/                     # @kit/ui — Shadcn components
│   ├── supabase/               # @kit/supabase — DB clients (server, browser, admin)
│   ├── next/                   # @kit/next — enhanceAction, enhanceRouteHandler
│   ├── billing/                # @kit/billing — Billing schema definition
│   ├── stripe/                 # @kit/stripe — Stripe integration
│   ├── features/               # @kit/features — Feature packages
│   ├── email-templates/        # @kit/email-templates — React Email templates
│   ├── mailers/                # @kit/mailers — Nodemailer + Resend providers
│   ├── i18n/                   # @kit/i18n — Internationalization
│   ├── auth/                   # @kit/auth — Auth utilities
│   ├── accounts/               # @kit/accounts — Personal accounts
│   ├── team-accounts/          # @kit/team-accounts — Team management
│   ├── shared/                 # @kit/shared — Common utilities
│   └── monitoring/             # @kit/monitoring — Observability
├── docs/                       # Developer documentation
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Monorepo workspace definition
└── package.json                # Root package.json (engines, scripts, catalog)
```

---

## Troubleshooting

### `supabase db push` says "Remote database is up to date" but tables are missing
- You probably ran it from the repo root. Always run from `apps/web/`:
  ```bash
  cd apps/web && npx supabase link --project-ref <your-ref> && npx supabase db push
  ```

### TypeScript errors after schema changes
- Regenerate types: `pnpm run supabase:web:typegen`

### Build fails with missing env vars
- Config files use Zod validation. Check `apps/web/config/*.ts` for required variables
- Ensure `apps/web/.env.development` has all Supabase and Stripe keys

### Can't access Supabase Dashboard
- Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- Ask your manager for login credentials if you don't have access

### App shows auth errors or empty data
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` in `apps/web/.env.development` are correct
- Check that your Supabase project is active (not paused) in the Dashboard
