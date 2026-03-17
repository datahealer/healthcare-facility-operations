# Deployment (Vercel)

This guide covers deploying the application to production using Vercel, with Supabase as the cloud database and Stripe for payments.

---

## Prerequisites

- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) account (free tier works)
- [Stripe](https://stripe.com) account
- SMTP server for transactional emails (e.g., [Resend](https://resend.com), [Postmark](https://postmarkapp.com))

---

## Step 1: Supabase Cloud Setup

### 1.1 Create a Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose an organization, name, and region
4. Set a **Database Password** — save it securely, you'll need it later

### 1.2 Retrieve API Keys

Go to **Project Settings** → **API**:

| Key | Environment Variable | Purpose |
|-----|---------------------|---------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Public API endpoint |
| Anon Key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key (RLS-enforced) |
| Service Role Key | `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypasses RLS) |

### 1.3 Configure Authentication URLs

Go to **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `https://yourdomain.com` |
| Redirect URLs | `https://yourdomain.com/auth/callback` |

### 1.4 Configure SMTP (Email)

Go to **Project Settings** → **Authentication** → **SMTP Settings**:

Enter your SMTP provider credentials (host, port, username, password, sender email).

> Supabase's built-in email service is **only for development**. You must configure a real SMTP provider for production to ensure reliable delivery of auth confirmations, password resets, and invitation emails.

### 1.5 Push Migrations to Cloud

```bash
# Navigate to the web app directory
cd apps/web

# Login to Supabase CLI
npx supabase login

# Link to your cloud project
npx supabase link --project-ref <your-project-ref>

# Push all migrations
npx supabase db push
```

The CLI will prompt for your Database Password during the link step.

> **Important:** Always run `supabase link` and `supabase db push` from the `apps/web/` directory (where `supabase/config.toml` lives), not the repo root.

### 1.6 Configure Database Webhooks

In the Supabase Dashboard, set up webhooks pointing to your Vercel deployment URL. These handle:
- Subscription lifecycle events
- Invitation email triggers
- Other automated tasks from database changes

### 1.7 (Optional) Google OAuth

If using Google Auth:
1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Configure the provider in **Supabase Dashboard** → **Authentication** → **Providers** → **Google**

---

## Step 2: Stripe Production Setup

### 2.1 Get API Keys

Go to **Developers** → **API keys** in the Stripe Dashboard:

| Key | Environment Variable |
|-----|---------------------|
| Publishable key | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Secret key | `STRIPE_SECRET_KEY` |

### 2.2 Create Products & Prices

1. Go to **Product Catalog** → **Add product**
2. Create each plan (see [Billing docs](./08-billing.md) for schema details)
3. Copy each **Price ID** (starts with `price_`)
4. Map them to environment variables:

```bash
NEXT_PUBLIC_STARTER_PLAN_MONTHLY_VARIANT_ID=price_...
NEXT_PUBLIC_STARTER_PLAN_YEARLY_VARIANT_ID=price_...
NEXT_PUBLIC_PRO_PLAN_MONTHLY_VARIANT_ID=price_...
NEXT_PUBLIC_PRO_PLAN_YEARLY_VARIANT_ID=price_...
```

### 2.3 Configure Production Webhook

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://yourdomain.com/api/billing/webhook`
3. **Events:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing Secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 3: Environment Variables

### Generate with the Built-In Tool

```bash
pnpm turbo gen env
pnpm turbo gen validate-env
```

This creates a `.env.local` file with all required variables. You'll copy these into Vercel.

### Complete Variable Reference

| Variable | Source | Public? |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API keys | Yes |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks | No |
| `NEXT_PUBLIC_BILLING_PROVIDER` | `stripe` | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your production domain | Yes |
| `NEXT_PUBLIC_PRODUCT_NAME` | Your product name | Yes |
| `NEXT_PUBLIC_SITE_TITLE` | Page title | Yes |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Meta description | Yes |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en` | Yes |
| `NEXT_PUBLIC_DEFAULT_THEME_MODE` | `light` or `dark` | Yes |
| `NEXT_PUBLIC_STARTER_PLAN_MONTHLY_VARIANT_ID` | Stripe Price ID | Yes |
| `NEXT_PUBLIC_STARTER_PLAN_YEARLY_VARIANT_ID` | Stripe Price ID | Yes |
| `NEXT_PUBLIC_PRO_PLAN_MONTHLY_VARIANT_ID` | Stripe Price ID | Yes |
| `NEXT_PUBLIC_PRO_PLAN_YEARLY_VARIANT_ID` | Stripe Price ID | Yes |

---

## Step 4: Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

## Step 5: Deploy to Vercel

### 5.1 Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → Select your GitHub repo
3. Configure project settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | (leave default) |
| Output Directory | (leave default) |

### 5.2 Add Environment Variables

1. In the Vercel project settings, go to **Settings** → **Environment Variables**
2. Add every variable from your `.env.local` file
3. Ensure secrets (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`) are **not** prefixed with `NEXT_PUBLIC_`

### 5.3 Deploy

Click **Deploy**. Vercel will:
1. Install dependencies with pnpm
2. Build the Next.js app from `apps/web`
3. Deploy to their edge network

### 5.4 Set Custom Domain

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. After DNS propagates, update:
   - **Supabase** → Authentication → URL Configuration → Site URL
   - **Stripe** → Webhook endpoint URL

---

## Post-Deployment Checklist

### Content Updates

- [ ] Update **Privacy Policy** at `apps/web/app/(marketing)/(legal)/privacy-policy/`
- [ ] Update **Terms of Service** at `apps/web/app/(marketing)/(legal)/terms-of-service/`
- [ ] Update **Cookie Policy** at `apps/web/app/(marketing)/(legal)/cookie-policy/`
- [ ] Update **FAQ** at `apps/web/app/(marketing)/faq/page.tsx`
- [ ] Replace placeholder blog and documentation content

### Functional Testing

- [ ] **Sign up** with a new account → Check email confirmation arrives
- [ ] **Sign in** with email/password
- [ ] **Password reset** flow works end-to-end
- [ ] **Create a team** account
- [ ] **Invite a team member** → Check invitation email arrives
- [ ] **Subscribe to a plan** via Stripe Checkout
- [ ] **Verify webhook** — subscription appears in dashboard after checkout
- [ ] **Create/view data** (tickets, etc.) as team member
- [ ] **Realtime updates** — changes appear without refresh
- [ ] **Widget** — Embeddable widget sends/receives messages

### Infrastructure Verification

- [ ] Stripe webhook returns `200` for test events
- [ ] Supabase SMTP sends emails reliably
- [ ] Google Auth works (if configured)
- [ ] Custom domain has SSL certificate active
- [ ] Environment variables are all set in Vercel

---

## Redeployment

After the initial deployment, subsequent pushes to `main` trigger automatic redeployments on Vercel.

For database changes:

```bash
# Create migration
cd apps/web
pnpm --filter web supabase migration new <name>

# Edit the migration file, then push to cloud
npx supabase db push

# Regenerate types
pnpm run supabase:web:typegen

# Commit and push
git add .
git commit -m "Add migration: <description>"
git push origin main
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails on Vercel | Check that Root Directory is `apps/web` |
| Environment variable missing | Verify in Vercel Settings → Environment Variables |
| Auth emails not arriving | Configure SMTP in Supabase (don't rely on built-in) |
| Stripe webhook 400/500 | Check `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret |
| `supabase db push` says "up to date" | Ensure you're running from `apps/web/`, not repo root |
| RLS blocking queries | Check policies in Supabase Studio; use impersonation to test |
| Types out of date | Run `pnpm run supabase:web:typegen` after schema changes |
