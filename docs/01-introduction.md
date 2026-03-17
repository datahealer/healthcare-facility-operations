# Introduction & Architecture

## Overview

HealthOps is a Next.js SaaS application built on the Turborepo monorepo pattern with Supabase as the backend. This document covers the foundational architecture, project structure, routing system, and initial setup.

---

## Turborepo Monorepo

The project is split into **apps** (deployable applications) and **packages** (shared libraries).

### Apps

| Directory | Purpose |
|-----------|---------|
| `apps/web` | Main Next.js application |
| `apps/e2e` | Playwright end-to-end tests |

### Packages

| Package | Import As | Purpose |
|---------|-----------|---------|
| `packages/ui` | `@kit/ui` | Shadcn UI components + custom components |
| `packages/shared` | `@kit/shared` | Utilities and shared code |
| `packages/supabase` | `@kit/supabase` | Database schema and client management |
| `packages/i18n` | `@kit/i18n` | Internationalization utilities |
| `packages/billing` | `@kit/billing` | Subscription management schema |
| `packages/email-templates` | `@kit/email-templates` | React Email templates |
| `packages/mailers` | `@kit/mailers` | Email provider abstraction |
| `packages/monitoring` | `@kit/monitoring` | Third-party monitoring integration |
| `packages/auth` | `@kit/auth` | Supabase authentication utilities |
| `packages/accounts` | `@kit/accounts` | Personal account management |
| `packages/team-accounts` | `@kit/team-accounts` | Team management components |
| `packages/stripe` | `@kit/stripe` | Stripe API integration |
| `packages/next` | `@kit/next` | Next.js server action/route utilities |

### pnpm Workspace Commands

Run commands scoped to a specific package with `--filter`:

```bash
# Run dev server for the web app only
pnpm --filter web dev

# Add a dependency to a specific package
pnpm add openai --filter web

# Run a script in a specific package
pnpm --filter '@kit/stripe' build
```

Turborepo caches unchanged packages. Run `pnpm typecheck` twice to see caching in action — the second run is near-instant.

---

## Routing Architecture

### Next.js App Router Fundamentals

| Concept | File | Example |
|---------|------|---------|
| Page | `page.tsx` | `app/home/page.tsx` → `/home` |
| Layout | `layout.tsx` | Wraps child pages with shared UI |
| Pathless Route | `(folder)` | `(marketing)` doesn't appear in URL |
| Dynamic Route | `[param]` | `[account]` captures URL segment |
| Loading State | `loading.tsx` | Shown while page loads |
| Error Boundary | `error.tsx` | Shown when page throws |

### Application Route Map

```
app/
├── (marketing)/              # Public pages (renders at /)
│   ├── page.tsx              # Homepage (/)
│   ├── pricing/page.tsx      # /pricing
│   ├── faq/page.tsx          # /faq
│   ├── blog/                 # /blog/*
│   ├── docs/                 # /docs/*
│   └── (legal)/              # /privacy-policy, /terms-of-service, /cookie-policy
│
├── auth/                     # Authentication pages
│   ├── sign-in/              # /auth/sign-in
│   ├── sign-up/              # /auth/sign-up
│   └── callback/             # /auth/callback (OAuth redirect)
│
├── home/                     # Authenticated dashboard
│   ├── (user)/               # Personal account pages (/home)
│   └── [account]/            # Team account pages (/home/<team-slug>)
│       └── tickets/          # /home/<team-slug>/tickets
│
├── join/                     # Team invitation acceptance
├── admin/                    # Super admin panel
├── update-password/          # Password reset redirect
├── api/                      # API routes
└── server-sitemap.xml/       # Dynamic sitemap
```

### Route Groups Explained

**`(marketing)`** — Pathless group. Files inside render at the root (`/`) but share a marketing-specific layout without the path segment appearing in URLs.

**`(user)`** — Personal account routes inside `/home`. These are for individual user dashboards.

**`[account]`** — Dynamic segment for team accounts. The value is the team **slug** (not UUID). Used for all team-scoped features like tickets, billing, settings.

### B2B vs B2C

- **B2B (team-focused):** Build features under `home/[account]/`
- **B2C (individual-focused):** Build features under `home/(user)/`
- **Both:** Use both route groups

---

## Initial Setup

### Step 1: Install Dependencies

```bash
npm install -g pnpm
pnpm i
```

### Step 2: Start Local Supabase

Requires Docker to be running:

```bash
pnpm run supabase:web:start
```

This starts PostgreSQL, Auth, Storage, Realtime, and the Studio UI.

### Step 3: Start Dev Server

```bash
pnpm run dev
```

Open http://localhost:3000

### Step 4: Email Testing

Local Supabase routes all emails to Mailpit at http://localhost:54324. Use this to confirm sign-up emails, password resets, and invitation emails during development.

### Default Test Credentials

| Field | Value |
|-------|-------|
| Email | `1993thakurvikas@gmail.com` |
| Password | `1q2w3e4r5t6y` |

---

## Multi-Tenant Architecture

The platform uses a multi-tenant model centered on the `public.accounts` table:

```
┌─────────────────┐
│   auth.users    │  (Supabase Auth)
└────────┬────────┘
         │ id = accounts.id (for personal accounts)
         ▼
┌─────────────────┐
│ public.accounts │  (Central entity)
├─────────────────┤
│ - Personal      │ ◄── auth.users.id = accounts.id
│ - Team          │ ◄── Shared workspace with members
└────────┬────────┘
         │ account_id (FK)
         ▼
┌─────────────────┐
│  Your Tables    │  (tickets, messages, etc.)
│  account_id FK  │
└─────────────────┘
```

- **Personal Accounts:** Created automatically when a user signs up. `accounts.id = auth.users.id`
- **Team Accounts:** Shared workspaces with members, roles, and permissions
- **All data** links to accounts via an `account_id` foreign key

### Core System Tables

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase-managed user authentication |
| `public.accounts` | Personal or team accounts |
| `public.accounts_memberships` | User ↔ Account membership |
| `public.roles` | Role definitions (owner, member, etc.) |
| `public.role_permissions` | Permission assignments per role |
| `public.invitations` | Pending team invitations |
| `public.billing_customers` | Billing provider customer IDs |
| `public.subscriptions` | Active/past subscriptions |
| `public.subscription_items` | Line items within subscriptions |
| `public.orders` | One-time purchases |
| `public.order_items` | Line items within orders |
| `public.notifications` | In-app notifications |

---

## File Structure: `apps/web`

```
apps/web/
├── app/                  # Next.js App Router pages & layouts
├── components/           # Shared app-level components (logo, etc.)
├── config/               # Zod-validated configuration files
│   ├── app.config.ts
│   ├── auth.config.ts
│   ├── billing.config.ts
│   ├── feature-flags.config.ts
│   ├── paths.config.ts
│   ├── personal-account-navigation.config.tsx
│   └── team-account-navigation.config.tsx
├── lib/                  # Shared library code & services
│   ├── i18n/             # i18n setup
│   └── server/           # Server-only utilities
├── content/              # Markdoc content (blog, docs, changelog)
├── styles/               # Global CSS & Shadcn theme variables
├── public/               # Static assets (images, favicons)
│   └── locales/          # Translation JSON files
└── supabase/             # Database
    ├── config.toml       # Local Supabase configuration
    ├── migrations/       # SQL migration files
    ├── schemas/          # Schema definition files
    ├── seed.sql          # Seed data
    └── tests/            # pgTAP database tests
```

---

## Next Steps

- [Customization](./02-customization.md) — Configure branding, theme, and feature flags
- [Database](./03-database.md) — Create tables, write migrations, set up RLS
