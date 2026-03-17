# Feature Configuration Guide

> **Know what to toggle, what to configure externally, and what to never build yourself.**

This document categorizes every configurable feature by **how** it should be managed. Mismanaging these — hard-disabling a soft feature, re-implementing a Supabase-native capability, or using the wrong toggle — leads to bugs, security holes, and wasted effort.

---

## Three Categories of Features

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FEATURE CONFIGURATION MAP                          │
│                                                                         │
│  ┌───────────────┐  ┌────────────────────┐  ┌───────────────────────┐  │
│  │  SOFT TOGGLE   │  │  SUPABASE DASHBOARD │  │  NEVER REIMPLEMENT   │  │
│  │  (env vars)    │  │  (external config)  │  │  (built-in / infra)  │  │
│  │                │  │                     │  │                      │  │
│  │  Set true/false│  │  Toggle in UI       │  │  Already handled     │  │
│  │  in .env files │  │  No code changes    │  │  Don't write code    │  │
│  │  Code stays    │  │  Supabase handles   │  │  for these           │  │
│  │  intact        │  │  everything         │  │                      │  │
│  └───────────────┘  └────────────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Category 1: Soft-Toggle Features (Environment Variables)

These features are controlled by `NEXT_PUBLIC_*` environment variables. The code for each feature **always exists** in the codebase — the toggle only controls whether the UI is shown and the feature is active.

**NEVER hard-disable these by deleting code.** If you remove the code for a soft-toggle feature, you lose the ability to re-enable it without rebuilding.

### Feature Flag Reference

| Feature | Environment Variable | Default | What It Controls |
|---------|---------------------|---------|------------------|
| Theme toggle | `NEXT_PUBLIC_ENABLE_THEME_TOGGLE` | `true` | Light/dark mode switcher in the UI |
| Personal account deletion | `NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION` | `false` | "Delete my account" button on settings page |
| Personal account billing | `NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING` | `false` | Billing page and payment flows for individual users |
| Team accounts | `NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS` | `true` | Entire team/organization functionality |
| Team account creation | `NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION` | `true` | "Create team" button (only if team accounts enabled) |
| Team account deletion | `NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_DELETION` | `false` | "Delete team" button on team settings |
| Team account billing | `NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING` | `false` | Billing page and payment flows for teams |
| Notifications | `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | `true` | Notification bell and notification system |
| Realtime notifications | `NEXT_PUBLIC_REALTIME_NOTIFICATIONS` | `false` | WebSocket-based live notification updates |
| Version updater | `NEXT_PUBLIC_ENABLE_VERSION_UPDATER` | `false` | "New version available" banner |

**Config file:** `apps/web/config/feature-flags.config.ts`

### How Soft Toggles Work

The config file reads environment variables with Zod validation:

```typescript
// apps/web/config/feature-flags.config.ts
const featuresFlagConfig = FeatureFlagsSchema.parse({
  enableThemeToggle: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_THEME_TOGGLE, true
  ),
  // ... other flags
});
```

Components conditionally render based on the flag:

```tsx
// The code always exists — the flag just hides/shows it
{featuresFlagConfig.enableNotifications && <NotificationBell />}
```

### Why Soft-Disable, Never Hard-Disable

| Approach | What Happens | Problem |
|----------|-------------|---------|
| Soft-disable (`NEXT_PUBLIC_ENABLE_X=false`) | Feature hidden, code intact | None — can re-enable anytime |
| Hard-disable (delete code) | Feature gone permanently | Must rewrite to bring it back; may break imports/types |
| Comment out code | Messy, unclear intent | Gets stale, confuses other developers |

**Rule: Set the env var to `false`. Never delete the feature code.**

### Common Presets

**Healthcare B2B (clinics with staff):**
```bash
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION=true
NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING=false
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_REALTIME_NOTIFICATIONS=true
```

**Solo practitioner (individual doctors):**
```bash
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS=false
NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

---

## Category 2: Supabase Dashboard Features (Never Implement Yourself)

These features are **built into Supabase** and configured through the Supabase Dashboard (cloud) or `supabase/config.toml` (local). The application already integrates with them. **Do not write custom code for these capabilities.**

### Authentication Providers

| Provider | Where to Configure | What to Do |
|----------|--------------------|------------|
| **Email/Password** | Dashboard → Authentication → Providers → Email | Enable/disable, configure confirmation emails |
| **Magic Links** | Dashboard → Authentication → Providers → Email | Toggle "Enable Magic Link" |
| **Google OAuth** | Dashboard → Authentication → Providers → Google | Add Client ID + Secret from Google Cloud Console |
| **Apple OAuth** | Dashboard → Authentication → Providers → Apple | Add Service ID + Secret from Apple Developer |
| **GitHub OAuth** | Dashboard → Authentication → Providers → GitHub | Add Client ID + Secret from GitHub Developer Settings |
| **Other OAuth** | Dashboard → Authentication → Providers | Azure, Discord, Facebook, LinkedIn, Slack, Twitter, etc. |

**In the codebase**, you only need to list which OAuth providers to show on the login page:

```typescript
// apps/web/config/auth.config.ts
providers: {
  password: process.env.NEXT_PUBLIC_AUTH_PASSWORD === 'true',
  magicLink: process.env.NEXT_PUBLIC_AUTH_MAGIC_LINK === 'true',
  oAuth: ['google'],  // Add provider names here after enabling in Dashboard
},
```

**What NOT to do:**
- Do not write OAuth callback handlers — Supabase handles the entire OAuth flow
- Do not store OAuth tokens — Supabase manages sessions
- Do not build a "Sign in with Google" from scratch — just add `'google'` to the `oAuth` array after enabling it in the Dashboard

### Multi-Factor Authentication (MFA / TOTP)

| Setting | Where | Notes |
|---------|-------|-------|
| Enable TOTP enrollment | Dashboard → Authentication → Multi Factor | Toggle on |
| Enable TOTP verification | Dashboard → Authentication → Multi Factor | Toggle on |
| Local development | `supabase/config.toml` → `[auth.mfa.totp]` | `enroll_enabled` and `verify_enabled` |

```toml
# apps/web/supabase/config.toml
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

**What NOT to do:**
- Do not build your own TOTP generation/verification logic
- Do not create a custom MFA database table
- Do not write QR code generation for authenticator apps — Supabase provides the enrollment URL

The app already has MFA UI components built in. Simply enable MFA in the Dashboard and it works.

### Email Configuration

| Setting | Where to Configure | What It Controls |
|---------|-------------------|-----------------|
| SMTP provider | Dashboard → Settings → Auth → SMTP | Production email delivery |
| Email templates | Dashboard → Authentication → Email Templates | Confirmation, invite, reset, magic link HTML |
| Confirmation behavior | Dashboard → Authentication → Providers → Email | Whether to require email confirmation |
| Rate limiting | Dashboard → Authentication → Rate Limits | Login/signup attempt throttling |

**Local development uses Inbucket** (built into Supabase CLI) for email testing — no SMTP setup needed.

**Email templates for local dev** are in `apps/web/supabase/templates/`:
- `invite-user.html`
- `confirm-email.html`
- `reset-password.html`
- `change-email-address.html`
- `magic-link.html`

### Auth Settings

| Setting | Where | What It Controls |
|---------|-------|-----------------|
| JWT expiry | Dashboard → Settings → Auth | How long access tokens last (default: 3600s) |
| Site URL | Dashboard → Authentication → URL Configuration | Where auth redirects go after login |
| Redirect URLs | Dashboard → Authentication → URL Configuration | Allowed post-auth redirect targets |
| Enable signups | Dashboard → Authentication → Settings | Whether new users can register |
| Identity linking | Dashboard → Authentication → Settings | Whether users can link multiple auth methods |

**What NOT to do:**
- Do not write JWT validation/refresh logic — the Supabase client SDK handles this
- Do not build session management — Supabase manages sessions automatically
- Do not create a custom "forgot password" flow — use `supabase.auth.resetPasswordForEmail()`

### Storage

| Setting | Where | What It Controls |
|---------|-------|-----------------|
| Storage buckets | Dashboard → Storage | Create/manage file storage buckets |
| File size limits | Dashboard → Storage → Bucket settings | Max upload size per bucket |
| Allowed MIME types | Dashboard → Storage → Bucket settings | Which file types can be uploaded |
| Storage policies | Dashboard → Storage → Policies | RLS for file access (who can read/write) |

**Local config** (`supabase/config.toml`):
```toml
[storage]
file_size_limit = "50MiB"
```

### Realtime

| Setting | Where | What It Controls |
|---------|-------|-----------------|
| Realtime enabled | Dashboard → Database → Replication | Which tables broadcast changes |
| Realtime policies | SQL (RLS policies) | Who can subscribe to which changes |

**What NOT to do:**
- Do not build WebSocket servers — Supabase Realtime is built in
- Do not write polling logic for "live updates" when Realtime can handle it

---

## Category 3: Features You Must Never Reimplement

These are handled by the framework, infrastructure, or Supabase. Writing custom code for these will create maintenance burden, security risks, and conflicts.

### Authentication & Session Management

| Capability | Handled By | Why Not to Reimplement |
|-----------|------------|----------------------|
| User registration | Supabase Auth | Handles email verification, rate limiting, bot protection |
| Login / logout | Supabase Auth | Manages JWT issuance, refresh tokens, cookie sessions |
| Password hashing | Supabase Auth (bcrypt) | Rolling your own is a security liability |
| Session refresh | Supabase JS Client | Automatic token refresh before expiry |
| Password reset | Supabase Auth | Secure token-based flow with email |
| Email verification | Supabase Auth | Handles token generation, expiry, and validation |
| OAuth flows | Supabase Auth | PKCE, state validation, token exchange |
| MFA / TOTP | Supabase Auth | Enrollment, verification, recovery codes |

### Row Level Security

| Capability | Handled By | Why Not to Reimplement |
|-----------|------------|----------------------|
| Data access control | PostgreSQL RLS | Cannot be bypassed from client — see [RLS Deep Dive](./03b-rls-deep-dive.md) |
| Tenant isolation | RLS + `account_id` FK | Every query auto-filtered by account |
| Role-based access | RLS + membership table | Policies check roles via `has_role_on_account()` |

**Do not write middleware or API-layer authorization checks as a substitute for RLS.** RLS is the authorization layer. See [Architecture: Mental Model Shift](./03a-architecture-mental-model.md).

### Auto-Generated APIs

| Capability | Handled By | Why Not to Reimplement |
|-----------|------------|----------------------|
| REST API for all tables | PostgREST (built into Supabase) | Auto-generated from schema, respects RLS |
| GraphQL API | pg_graphql (built into Supabase) | Optional, auto-generated |
| Realtime subscriptions | Supabase Realtime | WebSocket channels, respects RLS |

**Do not write CRUD API routes** for basic data operations. Use the Supabase client directly:

```typescript
// This is all you need — no API route required
const { data } = await supabase
  .from('appointments')
  .select('*, patient:patients(*), doctor:staff(*)')
  .eq('status', 'scheduled');
```

### Framework Features

| Capability | Handled By | Why Not to Reimplement |
|-----------|------------|----------------------|
| Form validation | Zod schemas + `enhanceAction` | Server-side validation with type safety |
| CSRF protection | Next.js Server Actions | Built into the framework |
| Route protection | Middleware + auth guards | Already configured in `apps/web/middleware.ts` |
| i18n / translations | `@kit/ui/trans` + locale files | Full i18n infrastructure in place |
| Image optimization | `next/image` | Automatic format conversion, lazy loading |
| Code splitting | Next.js App Router | Automatic per-route code splitting |

---

## Authentication Configuration: The Full Picture

Since auth spans both the codebase and the Supabase Dashboard, here's the complete picture:

### Step 1: Enable in Supabase Dashboard

Go to Dashboard → Authentication → Providers and enable the providers you want (e.g., Google, Email).

### Step 2: Configure OAuth Credentials (if applicable)

For each OAuth provider, add the Client ID and Secret from the provider's developer console.

### Step 3: Update the Codebase Config

```typescript
// apps/web/config/auth.config.ts
export const authConfig = AuthConfigSchema.parse({
  captchaTokenSiteKey: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
  displayTermsCheckbox:
    process.env.NEXT_PUBLIC_DISPLAY_TERMS_AND_CONDITIONS_CHECKBOX === 'true',
  providers: {
    password: process.env.NEXT_PUBLIC_AUTH_PASSWORD !== 'false',
    magicLink: process.env.NEXT_PUBLIC_AUTH_MAGIC_LINK === 'true',
    otp: process.env.NEXT_PUBLIC_AUTH_OTP === 'true',
    oAuth: ['google'],  // ← Add/remove provider names here
  },
});
```

### Step 4: Set Environment Variables

```bash
# apps/web/.env
NEXT_PUBLIC_AUTH_PASSWORD=true
NEXT_PUBLIC_AUTH_MAGIC_LINK=true
NEXT_PUBLIC_AUTH_OTP=false
```

### What You Configure Where

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION SETUP                         │
│                                                                   │
│  Supabase Dashboard                    Codebase                  │
│  ─────────────────                    ────────                   │
│  [x] Enable Google OAuth              oAuth: ['google']         │
│  [x] Client ID: abc123               (just list the name)      │
│  [x] Client Secret: xyz789                                      │
│  [x] Enable Email/Password            AUTH_PASSWORD=true         │
│  [x] Enable Magic Link                AUTH_MAGIC_LINK=true       │
│  [x] Enable MFA (TOTP)                (no code change needed)   │
│  [x] SMTP settings                    (no code change needed)   │
│  [x] Rate limiting                    (no code change needed)   │
│                                                                   │
│  Dashboard handles the HOW            Code handles the WHAT      │
│  (OAuth flow, token exchange,         (which buttons to show     │
│   email delivery, MFA verify)          on the login page)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: "Where Do I Configure X?"

| I want to... | Where |
|--------------|-------|
| Enable/disable dark mode toggle | `.env` → `NEXT_PUBLIC_ENABLE_THEME_TOGGLE` |
| Add Google login | Supabase Dashboard → Providers → Google, then add `'google'` to `auth.config.ts` |
| Enable MFA | Supabase Dashboard → Multi Factor (no code change) |
| Allow team creation | `.env` → `NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION` |
| Enable billing | `.env` → `NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING` + configure Stripe |
| Change email templates | Supabase Dashboard → Email Templates (cloud) or `supabase/templates/` (local) |
| Add file uploads | Supabase Dashboard → Storage → Create bucket + set policies |
| Enable realtime for a table | Supabase Dashboard → Database → Replication → Toggle table |
| Change JWT expiry | Supabase Dashboard → Settings → Auth |
| Add a CAPTCHA to signup | Get site key, set `NEXT_PUBLIC_CAPTCHA_SITE_KEY` in `.env` |
| Restrict signups | Supabase Dashboard → Authentication → Settings → Disable sign ups |
| Change the max upload size | Supabase Dashboard → Storage → Bucket settings |
| Add Apple login | Supabase Dashboard → Providers → Apple, then add `'apple'` to `auth.config.ts` |
| Enable email confirmations | Supabase Dashboard → Providers → Email → Confirm email |
| Set up SMTP for production | Supabase Dashboard → Settings → Auth → SMTP Settings |

---

## Anti-Patterns to Avoid

### 1. Don't build auth flows from scratch

```typescript
// WRONG — reimplementing what Supabase already provides
app.post('/api/login', async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  const valid = await bcrypt.compare(password, user.password_hash);
  const token = jwt.sign({ id: user.id }, SECRET);
  // ... session management, refresh tokens, etc.
});

// RIGHT — use Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### 2. Don't write authorization middleware as a substitute for RLS

```typescript
// WRONG — authorization in application code
export async function GET(req: Request) {
  const user = await getUser(req);
  const appointments = await db.query(
    'SELECT * FROM appointments WHERE doctor_id = $1',
    [user.id]
  );
  return Response.json(appointments);
}

// RIGHT — let RLS handle it
const { data } = await supabase.from('appointments').select('*');
// RLS automatically filters to only what this user can see
```

### 3. Don't hard-delete feature code

```typescript
// WRONG — deleting the notification system because "we don't need it yet"
// (6 months later: "Can we add notifications?" → rewrite from scratch)

// RIGHT — soft-disable via environment variable
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=false
// Code stays, feature is hidden, can be re-enabled in seconds
```

### 4. Don't build WebSocket servers for live updates

```typescript
// WRONG — custom WebSocket server
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  // custom pub/sub, heartbeats, reconnection logic...
});

// RIGHT — use Supabase Realtime
supabase
  .channel('appointments')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
    (payload) => handleChange(payload)
  )
  .subscribe();
```

### 5. Don't reimplement file storage

```typescript
// WRONG — custom S3 integration with signed URLs
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// RIGHT — use Supabase Storage
const { data, error } = await supabase.storage
  .from('documents')
  .upload('path/to/file', file);
```

---

## Next Steps

- [Customization](./02-customization.md) — Detailed configuration for theming, branding, and env vars
- [Database](./03-database.md) — Schema design and migrations
- [RLS Deep Dive](./03b-rls-deep-dive.md) — Why RLS is your authorization layer
- [Payments & Billing](./08-billing.md) — Stripe setup and billing configuration
