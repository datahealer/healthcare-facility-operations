# Customization

This guide covers how to customize the application through environment variables, configuration files, theming, branding, and feature flags — all without modifying package source code.

---

## Configuration Architecture

The app uses a three-layer configuration system:

```
┌──────────────────────────┐
│  1. Environment Variables │  (.env, .env.development, .env.production, .env.local)
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│  2. Configuration Layer   │  apps/web/config/*.ts (Zod-validated)
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│  3. Application Layer     │  apps/web/app/*, packages/*
└──────────────────────────┘
```

Zod validation at the config layer means **the build fails fast** if a required variable is missing or invalid — you'll never deploy a misconfigured app.

---

## Environment Variables

### File Organization

| File | Purpose | Git-tracked? |
|------|---------|--------------|
| `.env` | Shared across all environments (public values) | Yes |
| `.env.development` | Dev-only overrides (local Supabase URLs) | Yes |
| `.env.production` | Production-only values | Yes |
| `.env.local` | Local secrets (API keys, DB passwords) | **No** (gitignored) |

### Public vs Private Variables

| Type | Prefix | Accessible In | Example |
|------|--------|---------------|---------|
| Public | `NEXT_PUBLIC_` | Client + Server | `NEXT_PUBLIC_PRODUCT_NAME` |
| Private | (none) | Server only | `STRIPE_SECRET_KEY` |

**Rule:** Never store secrets in `.env`. Use `.env.local` for local development and CI/CD environment variables for production.

### Placement Guide

| Variable Type | Where to Put It |
|---------------|-----------------|
| Shared & public (product name, locale) | `.env` |
| Environment-specific & public (API URLs) | `.env.development` / `.env.production` |
| Secrets (API keys, DB URLs) | `.env.local` or CI/CD env vars |

---

## Core Environment Variables

Update these in `.env` to customize the application identity:

```bash
NEXT_PUBLIC_PRODUCT_NAME="HealthOps"
NEXT_PUBLIC_SITE_TITLE="HealthOps - Streamline Healthcare Bookings"
NEXT_PUBLIC_SITE_DESCRIPTION="Eliminate no-shows, automate follow-ups, and multiply revenue for healthcare professionals."
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_DEFAULT_THEME_MODE=light
NEXT_PUBLIC_THEME_COLOR=#hexvalue
NEXT_PUBLIC_THEME_COLOR_DARK=#hexvalue
```

---

## Configuration Files

All located in `apps/web/config/`:

| File | Controls |
|------|----------|
| `app.config.ts` | Product name, title, description, URL, locale, theme |
| `auth.config.ts` | Auth providers (password, magic link, OAuth), captcha |
| `billing.config.ts` | Billing schema, products, plans, pricing |
| `feature-flags.config.ts` | Feature toggles |
| `paths.config.ts` | Application route paths |
| `personal-account-navigation.config.tsx` | Personal account sidebar menu |
| `team-account-navigation.config.tsx` | Team account sidebar menu |

Each file uses Zod schemas to validate environment variables at build time.

---

## Theming & Colors

The UI is built on Shadcn UI (Radix primitives + Tailwind). Theme colors are defined as CSS variables in:

**File:** `apps/web/styles/shadcn-ui.css`

```css
@layer base {
  :root {
    --background: hsl(0 0% 100%);
    --foreground: hsl(224 71.4% 4.1%);
    --primary: hsl(262.1 83.3% 57.8%);
    --secondary: hsl(220 14.3% 95.9%);
    --destructive: hsl(0 84.2% 60.2%);
    --muted: hsl(220 14.3% 95.9%);
    --muted-foreground: hsl(220 8.9% 46.1%);
    --accent: hsl(220 14.3% 95.9%);
    --border: hsl(220 13% 91%);
    --ring: hsl(262.1 83.3% 57.8%);
    --radius: 0.75rem;
  }

  .dark {
    --background: hsl(224 71% 4%);
    --foreground: hsl(213 31% 91%);
    --primary: hsl(263.4 70% 50.4%);
    /* ... dark mode overrides */
  }
}
```

**Never use hardcoded colors** like `bg-white` or `text-black`. Always use semantic tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, etc.

To generate a complete theme, use the [Shadcn UI Themes tool](https://ui.shadcn.com/themes) and paste the generated CSS variables into this file.

---

## Logo

**File:** `apps/web/components/app-logo.tsx`

The `AppLogo` component is used everywhere (navbar, sidebar, auth pages). Update the SVG and text inside `LogoImage` to change the logo globally.

Supports:
- Inline SVG
- `<Image>` from `next/image`
- Text-based logos

---

## Favicons

**Location:** `apps/web/public/images/favicon/`

1. Generate favicons using a tool like [Favicon Generator](https://realfavicongenerator.net/)
2. Replace all files in the favicon directory
3. Keep the same filenames for automatic pickup

---

## Fonts

**File:** `apps/web/lib/fonts.ts`

```typescript
import { Inter as SansFont, Quicksand as HeadingFont } from 'next/font/google';

const sans = SansFont({
  subsets: ['latin'],
  variable: '--font-sans',
  fallback: ['system-ui', 'Helvetica Neue'],
  weight: ['300', '400', '500', '600', '700'],
});

const heading = HeadingFont({
  subsets: ['latin'],
  variable: '--font-heading',
  fallback: ['system-ui', 'Helvetica Neue'],
  weight: ['500', '700'],
});

export { sans, heading };
```

- `--font-sans` is used for body text
- `--font-heading` is used for headings
- Both CSS variables are injected into the root layout

To change fonts, swap the imports from `next/font/google` with your preferred fonts.

---

## Feature Flags

**File:** `apps/web/config/feature-flags.config.ts`

Feature flags are controlled via environment variables with boolean defaults:

```typescript
const featuresFlagConfig = FeatureFlagsSchema.parse({
  enableThemeToggle: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_THEME_TOGGLE, true
  ),
  enableAccountDeletion: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION, false
  ),
  enableTeamDeletion: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_DELETION, false
  ),
  enableTeamAccounts: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS, true
  ),
  enableTeamCreation: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION, true
  ),
  enablePersonalAccountBilling: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING, false
  ),
  enableTeamAccountBilling: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING, false
  ),
  enableNotifications: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS, true
  ),
  realtimeNotifications: getBoolean(
    process.env.NEXT_PUBLIC_REALTIME_NOTIFICATIONS, false
  ),
  enableVersionUpdater: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_VERSION_UPDATER, false
  ),
});
```

### Common Configurations

**B2B SaaS (team-focused):**
```bash
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING=true
NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING=false
```

**B2C SaaS (individual-focused):**
```bash
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS=false
NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING=true
```

---

## Navigation Configuration

### Team Account Sidebar

**File:** `apps/web/config/team-account-navigation.config.tsx`

Add menu items for team-scoped features:

```tsx
import { MessageCircle } from 'lucide-react';

const getRoutes = (account: string) => [
  {
    label: 'Support Tickets',
    path: `/home/${account}/tickets`,
    Icon: <MessageCircle className={iconClasses} />,
  },
];
```

### Personal Account Sidebar

**File:** `apps/web/config/personal-account-navigation.config.tsx`

Same pattern as team navigation, but paths are under `/home` (no account slug).

---

## Marketing Pages

**Location:** `apps/web/app/(marketing)/`

- **Homepage:** `page.tsx`
- **Pricing:** `pricing/page.tsx`
- **FAQ:** `faq/page.tsx`
- **Blog:** `blog/`
- **Docs:** `docs/`
- **Legal:** `(legal)/privacy-policy/`, `terms-of-service/`, `cookie-policy/`

These use pathless routing — the `(marketing)` folder doesn't appear in URLs.

---

## Internationalization

All user-facing strings should use the `Trans` component:

```tsx
import { Trans } from '@kit/ui/trans';

<Trans i18nKey="namespace:key" values={{ name }} />
```

Translation files: `apps/web/public/locales/en/*.json`

---

## Next Steps

- [Database](./03-database.md) — Create tables and migrations
- [Server Components](./04-server-components.md) — Build pages with data fetching
