# Database

This guide covers Supabase PostgreSQL schema design, migrations, Row-Level Security (RLS), triggers, storage, and best practices.

> **Before reading this:** If you're coming from a traditional API background (Express, Django, Rails, etc.), read [Architecture: Mental Model Shift](./03a-architecture-mental-model.md) first to understand why we use direct database access instead of API endpoints.
>
> **After reading this:** Read [RLS Deep Dive](./03b-rls-deep-dive.md) for the complete guide on writing policies, common patterns, debugging, and why the admin client should almost never be used.

---

## Core Concepts

- **Schema** — The blueprint of your database: tables, columns, types, relationships, and constraints.
- **Migrations** — Versioned SQL scripts that evolve the schema over time. Each migration runs once, in order.
- **RLS (Row-Level Security)** — PostgreSQL policies that control which rows a user can read, insert, update, or delete. This is the **primary authorization mechanism**. RLS is not optional — it is the security foundation of the entire application. See [RLS Deep Dive](./03b-rls-deep-dive.md) for the full rationale.

---

## Database Workflow

```
1. Create migration file
   └─► pnpm --filter web supabase migration new <name>

2. Write SQL in the generated file
   └─► apps/web/supabase/migrations/<timestamp>_<name>.sql

3. Apply migrations locally
   └─► pnpm run supabase:web:reset

4. Generate TypeScript types
   └─► pnpm run supabase:web:typegen

5. Push to cloud (production)
   └─► pnpm --filter web supabase db push
```

---

## Creating a New Table

### Step 1: Generate Migration File

```bash
pnpm --filter web supabase migration new support-schema
```

This creates: `apps/web/supabase/migrations/<timestamp>_support-schema.sql`

### Step 2: Define Enum Types

```sql
create type public.ticket_status as enum (
  'open', 'closed', 'resolved', 'in_progress'
);

create type public.ticket_priority as enum (
  'low', 'medium', 'high'
);
```

### Step 3: Create the Table

```sql
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title varchar(255) not null,
  category varchar(100) not null default 'general',
  assigned_to uuid references public.accounts(id) on delete set null,
  priority public.ticket_priority not null default 'medium',
  status public.ticket_status not null default 'open',
  customer_email varchar(255),
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid references public.accounts(id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_tickets_account_id on public.tickets(account_id);
```

**Key patterns:**
- `uuid primary key default gen_random_uuid()` — Auto-generated UUID
- `account_id references public.accounts(id) on delete cascade` — Ties data to the multi-tenant account model
- `varchar(N)` — Use size constraints to enforce data integrity
- Indexes on frequently-queried foreign keys

### Step 4: Add Custom Permissions

If you need role-based permissions beyond basic RLS:

```sql
alter type public.app_permissions add value 'tickets.update';
alter type public.app_permissions add value 'tickets.delete';
commit;

insert into public.role_permissions(role, permission)
values
  ('owner', 'tickets.update'),
  ('owner', 'tickets.delete');
```

---

## Row-Level Security (RLS)

RLS is **mandatory** for all new tables. It ensures that users can only access data they're authorized to see, enforced at the database level.

### Step 1: Revoke Default Access

```sql
revoke all on public.tickets from public, service_role;
```

This removes **all** default permissions. You then grant back only what's needed.

### Step 2: Grant Specific Permissions

```sql
grant select, insert, update, delete on public.tickets to authenticated;
grant select, insert on public.tickets to service_role;
```

### Step 3: Enable RLS

```sql
alter table public.tickets enable row level security;
```

### Step 4: Create Policies

**SELECT — Any team member can read tickets:**
```sql
create policy select_tickets
  on public.tickets
  for select
  to authenticated
  using (
    public.has_role_on_account(account_id)
  );
```

**DELETE — Only users with `tickets.delete` permission:**
```sql
create policy delete_tickets
  on public.tickets
  for delete
  to authenticated
  using (
    public.has_permission(
      (select auth.uid()),
      account_id,
      'tickets.delete'::app_permissions
    )
  );
```

**UPDATE — Only users with `tickets.update` permission:**
```sql
create policy update_tickets
  on public.tickets
  for update
  to authenticated
  using (
    public.has_permission(
      (select auth.uid()),
      account_id,
      'tickets.update'::app_permissions
    )
  )
  with check (
    public.has_permission(
      (select auth.uid()),
      account_id,
      'tickets.update'::app_permissions
    )
  );
```

### Built-in Helper Functions

| Function | Purpose |
|----------|---------|
| `public.has_role_on_account(account_id)` | Returns `true` if current user is a member of the account |
| `public.has_permission(user_id, account_id, permission)` | Returns `true` if user has the specific permission on the account |
| `auth.uid()` | Returns the current authenticated user's UUID |

---

## Related Tables

### Messages Table Example

```sql
create type public.message_author as enum ('support', 'customer');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author public.message_author not null,
  author_account_id uuid references public.accounts(id) on delete set null,
  content varchar(5000) not null,
  attachment_url varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_messages_ticket_id on public.messages(ticket_id);
```

### RLS for Related Tables

For tables that reference a parent (e.g., messages → tickets), create a helper function:

```sql
create or replace function public.has_role_on_ticket_account(ticket_id uuid)
  returns boolean
  set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.tickets ticket
    where ticket.id = ticket_id
    and public.has_role_on_account(ticket.account_id)
  );
end;
$$ language plpgsql stable;

grant execute on function public.has_role_on_ticket_account(uuid) to authenticated;
```

Then use it in policies:

```sql
create policy select_messages
  on public.messages
  for select
  to authenticated
  using (public.has_role_on_ticket_account(ticket_id));

create policy insert_messages
  on public.messages
  for insert
  to authenticated
  with check (public.has_role_on_ticket_account(ticket_id));
```

---

## Storage Buckets

### Create a Private Bucket

```sql
insert into storage.buckets (id, name, PUBLIC)
values ('attachments', 'attachments', false);
```

### Storage RLS Policy

```sql
create or replace function public.can_read_message(message_id uuid)
  returns boolean
  set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.messages message
    where message.id = message_id
    and public.has_role_on_ticket_account(message.ticket_id)
  );
end;
$$ language plpgsql stable;

grant execute on function public.can_read_message(uuid) to authenticated;

create policy message_attachments
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and public.can_read_message(
      kit.get_storage_filename_as_uuid(name)
    )
  );
```

---

## Database Triggers

Triggers run SQL functions automatically in response to table events.

### Auto-Update Timestamps on Status Change

```sql
create or replace function public.handle_ticket_status_change()
returns trigger
set search_path = ''
as $$
begin
  if NEW.status = 'closed' and OLD.status != 'closed' then
    NEW.closed_at = now();
    NEW.closed_by = (select auth.uid());
  end if;

  if NEW.status = 'resolved' and OLD.status != 'resolved' then
    NEW.resolved_at = now();
    NEW.resolved_by = (select auth.uid());
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger on_ticket_status_change
  before update on public.tickets
  for each row
  execute function public.handle_ticket_status_change();
```

---

## Seed Data

**File:** `apps/web/supabase/seed.sql`

```sql
INSERT INTO public.tickets
  (account_id, status, title, priority, category, customer_email, updated_at)
VALUES
  ('5deaa894-2094-4da3-b4fd-1fada0809d1c', 'in_progress',
   'Cannot access account', 'high', 'Login Issues',
   'john.doe@example.com', NOW() + INTERVAL '1 day'),
  ('5deaa894-2094-4da3-b4fd-1fada0809d1c', 'open',
   'Billing discrepancy', 'medium', 'Billing',
   'jane.smith@example.com', NOW() + INTERVAL '2 days');
```

> Replace the UUID with an actual `account_id` from your local database. Check Supabase Studio at http://localhost:54323.

---

## Applying Changes

```bash
# Reset local DB and re-run all migrations + seeds
pnpm run supabase:web:reset

# Generate TypeScript types from current schema
pnpm run supabase:web:typegen

# Push migrations to cloud Supabase
pnpm --filter web supabase db push
```

---

## Best Practices

1. **Always enable RLS** on every new table
2. **Revoke all, then grant** only the specific permissions needed
3. **Use `varchar(N)` constraints** to enforce max lengths at the DB level
4. **Create indexes** on foreign keys and frequently-queried columns
5. **Use `set search_path = ''`** in all custom functions for security
6. **Never use `SECURITY DEFINER`** without explicit access controls
7. **Use helper functions** (`has_role_on_account`, `has_permission`) for policy logic
8. **Test RLS policies** using Supabase Studio's impersonation feature
9. **Write pgTAP tests** for critical business logic
10. **Use transactions** (`begin; ... commit;`) for multi-step operations

---

## Table Template

Copy this template when creating new tables:

```sql
create table if not exists public.your_table (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  -- your columns here
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_your_table_account_id on public.your_table(account_id);

-- Security
revoke all on public.your_table from public, service_role;
grant select, insert, update, delete on public.your_table to authenticated;
grant select, insert on public.your_table to service_role;
alter table public.your_table enable row level security;

-- Policies
create policy select_your_table
  on public.your_table
  for select
  to authenticated
  using (public.has_role_on_account(account_id));
```

---

## Next Steps

- [RLS Deep Dive](./03b-rls-deep-dive.md) — **Read this next.** Complete guide to RLS patterns, debugging, and why the admin client is dangerous
- [Architecture: Mental Model Shift](./03a-architecture-mental-model.md) — Understanding direct DB access vs traditional APIs
- [Server Components](./04-server-components.md) — Build pages that fetch from these tables
- [Data Fetching & Mutations](./05-data-fetching.md) — Write data with server actions
