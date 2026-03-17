# Payments & Billing

This guide covers the billing architecture, Stripe integration, billing schema configuration, per-seat pricing, feature limit enforcement with database triggers, and UI implementation.

---

## Architecture

The platform uses a **provider-agnostic billing gateway** that separates payment logic from application code:

```
┌──────────────────────┐
│  Billing Schema      │  apps/web/config/billing.config.ts
│  (Products, Plans)   │  Provider-agnostic definition
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Billing Gateway     │  @kit/billing-gateway
│  (Abstraction Layer) │  Unified API
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Stripe              │  @kit/stripe
│  (Provider)          │  Stripe-specific implementation
└──────────────────────┘
```

---

## Billing Schema Configuration

**File:** `apps/web/config/billing.config.ts`

The billing schema defines products, plans, and line items:

```typescript
import { createBillingSchema } from '@kit/billing';

export default createBillingSchema({
  provider: process.env.NEXT_PUBLIC_BILLING_PROVIDER,  // 'stripe'
  products: [
    {
      id: 'starter',
      name: 'Starter Plan',
      description: 'For small practices getting started',
      currency: 'USD',
      badge: 'Popular',
      features: [
        'Up to 1,000 appointments/month',
        '$10/month per provider',
        'Email reminders',
        'Basic analytics',
      ],
      plans: [
        {
          id: 'starter-monthly',
          name: 'Monthly',
          paymentType: 'recurring',
          interval: 'month',
          lineItems: [
            {
              id: process.env.NEXT_PUBLIC_STARTER_PLAN_MONTHLY_VARIANT_ID,
              name: 'Base fee',
              type: 'flat',
              cost: 49.00,
            },
            {
              id: process.env.NEXT_PUBLIC_STARTER_SEAT_MONTHLY_VARIANT_ID,
              name: 'Per provider seat',
              type: 'per_seat',
              cost: 10.00,
            },
          ],
        },
        {
          id: 'starter-yearly',
          name: 'Yearly',
          paymentType: 'recurring',
          interval: 'year',
          lineItems: [
            {
              id: process.env.NEXT_PUBLIC_STARTER_PLAN_YEARLY_VARIANT_ID,
              name: 'Base fee',
              type: 'flat',
              cost: 490.00,
            },
          ],
        },
      ],
    },
    // ... additional products (Pro, Enterprise, etc.)
  ],
});
```

### Key Concepts

| Term | Definition |
|------|-----------|
| **Product** | A high-level offering (e.g., "Starter Plan") |
| **Plan** | A pricing tier within a product (e.g., "Monthly", "Yearly") |
| **Line Item** | An individual charge within a plan (flat fee, per-seat, metered) |
| **Variant ID** | The Stripe Price ID (e.g., `price_1234...`) that maps to the actual charge |

### Line Item Types

| Type | Behavior |
|------|----------|
| `flat` | Fixed charge per billing cycle |
| `per_seat` | Automatically adjusts quantity based on team member count |
| `metered` | Usage-based billing (reported via API) |

### Per-Seat Billing

When `type: 'per_seat'` is used, the platform **automatically** manages subscription quantity:
- Adding a team member → quantity increases by 1
- Removing a team member → quantity decreases by 1

No manual intervention needed.

---

## Environment Variables for Billing

```bash
# Billing provider
NEXT_PUBLIC_BILLING_PROVIDER=stripe

# Stripe keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs from Stripe Dashboard
NEXT_PUBLIC_STARTER_PLAN_MONTHLY_VARIANT_ID=price_...
NEXT_PUBLIC_STARTER_PLAN_YEARLY_VARIANT_ID=price_...
NEXT_PUBLIC_STARTER_SEAT_MONTHLY_VARIANT_ID=price_...
NEXT_PUBLIC_PRO_PLAN_MONTHLY_VARIANT_ID=price_...
NEXT_PUBLIC_PRO_PLAN_YEARLY_VARIANT_ID=price_...
```

### Validate with Zod

```typescript
import { z } from 'zod';

const BillingVariantsSchema = z.object({
  NEXT_PUBLIC_STARTER_PLAN_MONTHLY_VARIANT_ID: z.string().min(1),
  NEXT_PUBLIC_STARTER_PLAN_YEARLY_VARIANT_ID: z.string().min(1),
  NEXT_PUBLIC_PRO_PLAN_MONTHLY_VARIANT_ID: z.string().min(1),
  NEXT_PUBLIC_PRO_PLAN_YEARLY_VARIANT_ID: z.string().min(1),
});

const variants = BillingVariantsSchema.parse(process.env);
```

---

## Stripe Setup

### 1. Create Products in Stripe Dashboard

1. Go to **Product Catalog** → **Add product**
2. Create each product (e.g., "Starter Plan"):
   - Set pricing: Recurring, Monthly, $49.00
   - Copy the **Price ID** (starts with `price_`)
3. For per-seat items, create a separate product:
   - "Per Provider Seat" → Recurring, Monthly, $10.00
   - Copy the Price ID

### 2. Configure Webhooks

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://yourdomain.com/api/billing/webhook`
3. **Events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing Secret** → set as `STRIPE_WEBHOOK_SECRET`

### 3. Local Development with Stripe CLI

```bash
pnpm run stripe:listen
```

First run requires `stripe login`. After authentication, it outputs a webhook secret.

Add to `.env.development`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Feature Limit Enforcement

### Step 1: Plans Table

```sql
create table if not exists public.plans (
  variant_id varchar(255) primary key,
  name varchar(255) not null,
  max_tickets int not null  -- -1 means unlimited
);

revoke all on public.plans from public, service_role;
grant select on public.plans to authenticated, service_role;
alter table public.plans enable row level security;

create policy select_plans
  on public.plans
  for select
  to authenticated
  using (true);
```

### Step 2: Seed Plan Data

```sql
insert into public.plans (variant_id, name, max_tickets)
values
  ('starter-plan', 'Starter Plan', 1000),
  ('pro-plan', 'Pro Plan', -1);  -- unlimited
```

### Step 3: Subscription Details Function

```sql
create or replace function public.get_subscription_details(
  target_account_id uuid
)
returns table (
  variant_id varchar,
  period_starts_at timestamptz,
  period_ends_at timestamptz
)
set search_path = ''
as $$
begin
  return query
    select
      item.variant_id,
      subscription.period_starts_at,
      subscription.period_ends_at
    from public.subscription_items as item
    join public.subscriptions as subscription
      on subscription.id = item.subscription_id
    where subscription.account_id = target_account_id
      and subscription.active = true
      and item.type = 'flat';
end;
$$ language plpgsql;

grant execute on function
  public.get_subscription_details(uuid)
  to authenticated, service_role;
```

### Step 4: Enforcement Trigger

This trigger runs **before every INSERT** on the tickets table:

```sql
create or replace function public.check_ticket_limit()
returns trigger
set search_path = ''
as $$
declare
  subscription record;
  ticket_count int;
  max_tickets int;
begin
  -- Get active subscription
  select * into subscription
    from public.get_subscription_details(NEW.account_id);

  -- No subscription = free tier (50 tickets/30 days)
  if subscription is null then
    select count(*) into ticket_count
      from public.tickets
      where account_id = NEW.account_id
        and created_at >= now() - interval '30 days';

    if ticket_count >= 50 then
      raise exception 'Maximum tickets allowed for your plan exceeded';
    end if;

    return NEW;
  end if;

  -- Check plan limit
  select p.max_tickets into max_tickets
    from public.plans p
    where p.variant_id = subscription.variant_id;

  -- Unlimited plan
  if max_tickets = -1 then
    return NEW;
  end if;

  -- Count tickets in current billing period
  select count(*) into ticket_count
    from public.tickets
    where account_id = NEW.account_id
      and created_at >= subscription.period_starts_at
      and created_at <= subscription.period_ends_at;

  if ticket_count >= max_tickets then
    raise exception 'Maximum tickets allowed for your plan exceeded';
  end if;

  return NEW;
end;
$$ language plpgsql;

create or replace trigger check_ticket_limit
  before insert on public.tickets
  for each row
  execute function public.check_ticket_limit();
```

### Step 5: Remaining Count Function

```sql
create or replace function public.get_remaining_tickets(
  target_account_id uuid
)
returns int
set search_path = ''
as $$
declare
  subscription record;
  ticket_count int;
  max_tickets int;
begin
  select * into subscription
    from public.get_subscription_details(target_account_id);

  if subscription is null then
    select count(*) into ticket_count
      from public.tickets
      where account_id = target_account_id
        and created_at >= now() - interval '30 days';
    return 50 - ticket_count;
  end if;

  select p.max_tickets into max_tickets
    from public.plans p
    where p.variant_id = subscription.variant_id;

  if max_tickets = -1 then
    return -1;  -- unlimited
  end if;

  select count(*) into ticket_count
    from public.tickets
    where account_id = target_account_id
      and created_at >= subscription.period_starts_at
      and created_at <= subscription.period_ends_at;

  return max_tickets - ticket_count;
end;
$$ language plpgsql;

grant execute on function
  public.get_remaining_tickets(uuid)
  to authenticated, service_role;
```

---

## UI: Displaying Remaining Quota

### Server-Side Fetch

```typescript
async function getRemainingTickets(accountId: string) {
  const client = getSupabaseServerClient();

  const { data } = await client.rpc('get_remaining_tickets', {
    target_account_id: accountId,
  });

  return data ?? 0;
}
```

### Warning Banner

```tsx
import { If } from '@kit/ui/if';
import Link from 'next/link';

function QuotaWarning({ remaining }: { remaining: number }) {
  return (
    <If condition={remaining >= 0 && remaining < 10}>
      <div className="bg-destructive py-1 text-center text-xs font-medium text-white">
        You have {remaining} appointments remaining.{' '}
        <Link className="underline" href="billing">
          Please upgrade your plan to continue
        </Link>
        .
      </div>
    </If>
  );
}
```

Place this in the team account layout so it's visible across all pages.

---

## Additional Considerations

| Scenario | Recommendation |
|----------|----------------|
| **Grace periods** | Allow temporary overage before hard enforcement |
| **Downgrade handling** | Gracefully manage when usage exceeds new plan limits |
| **Proactive notifications** | Use Postgres crons to check usage and send warnings |
| **Partial enforcement** | Allow replies to existing items but block new creation |

---

## Next Steps

- [Deployment](./09-deployment.md) — Take everything to production
