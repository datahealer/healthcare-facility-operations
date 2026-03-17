# Data Access & APIs

> How to read and write data using the auto-generated REST API, RPC functions, and GraphQL — and when to use each.

---

## Overview

When you create a table in PostgreSQL, Supabase **automatically generates** a full REST API for it via PostgREST. You don't write API routes for CRUD operations. Instead, you use the Supabase client, which maps method calls to HTTP requests against the auto-generated API.

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYERS                              │
│                                                                    │
│  ┌──────────────────┐                                             │
│  │  Supabase Client  │  ← What you use in code                    │
│  │  .from().select() │                                             │
│  └────────┬─────────┘                                             │
│           │                                                        │
│           ▼                                                        │
│  ┌──────────────────┐                                             │
│  │    PostgREST      │  ← Auto-generated REST API                  │
│  │  (HTTP → SQL)     │     Every table gets GET/POST/PUT/DELETE    │
│  └────────┬─────────┘                                             │
│           │                                                        │
│           ▼                                                        │
│  ┌──────────────────┐                                             │
│  │   PostgreSQL      │  ← RLS policies filter every query          │
│  │   + RLS           │                                             │
│  └──────────────────┘                                             │
│                                                                    │
│  Also available:                                                   │
│  ┌──────────────────┐   ┌──────────────────┐                     │
│  │  RPC Functions    │   │  GraphQL API      │                     │
│  │  .rpc('fn_name')  │   │  (pg_graphql)     │                     │
│  └──────────────────┘   └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Supabase Clients

### Which Client to Use

| Client | Where | RLS | Import |
|--------|-------|-----|--------|
| **Server Client** | Server Components, Server Actions, API Routes | Enforced | `import { getSupabaseServerClient } from '@kit/supabase/server-client'` |
| **Browser Client** | Client Components (`'use client'`) | Enforced | `import { useSupabase } from '@kit/supabase/hooks/use-supabase'` |
| **Admin Client** | Webhooks, cron jobs only | **Bypassed** | `import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client'` |

### Server Client (Most Common)

```typescript
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// In a Server Component or server action
const client = getSupabaseServerClient();
const { data, error } = await client.from('appointments').select('*');
// RLS automatically filters to only what this user can see
```

### Browser Client (Client Components)

```tsx
'use client';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';

function AppointmentsList() {
  const supabase = useSupabase();
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    supabase
      .from('appointments')
      .select('*')
      .then(({ data }) => setAppointments(data ?? []));
  }, [supabase]);

  return <ul>{appointments.map(a => <li key={a.id}>{a.status}</li>)}</ul>;
}
```

### Admin Client (Restricted Use)

```typescript
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// ONLY in webhooks, cron jobs, or system-level operations
// See docs/03b-rls-deep-dive.md for why this is dangerous
const adminClient = getSupabaseServerAdminClient();
```

---

## REST API: CRUD Operations

Every table automatically gets full CRUD. Here are the patterns.

### SELECT (Read)

**Basic select:**
```typescript
const { data, error } = await client
  .from('appointments')
  .select('*');
```

**Select specific columns:**
```typescript
const { data, error } = await client
  .from('appointments')
  .select('id, scheduled_at, status');
```

**Select with related data (joins):**
```typescript
const { data, error } = await client
  .from('appointments')
  .select(`
    id,
    scheduled_at,
    status,
    patient:patients (
      id,
      full_name,
      date_of_birth
    ),
    doctor:staff (
      id,
      user_id,
      role
    )
  `);
```

This automatically joins through foreign keys. The result:
```json
{
  "id": "abc-123",
  "scheduled_at": "2026-03-20T10:00:00Z",
  "status": "scheduled",
  "patient": {
    "id": "pat-456",
    "full_name": "John Doe",
    "date_of_birth": "1990-05-15"
  },
  "doctor": {
    "id": "doc-789",
    "user_id": "user-uuid",
    "role": "doctor"
  }
}
```

**Filtering:**
```typescript
const { data, error } = await client
  .from('appointments')
  .select('*')
  .eq('status', 'scheduled')                    // Equal
  .neq('status', 'cancelled')                   // Not equal
  .gt('scheduled_at', '2026-03-01')             // Greater than
  .lt('scheduled_at', '2026-04-01')             // Less than
  .gte('scheduled_at', '2026-03-01')            // Greater than or equal
  .lte('scheduled_at', '2026-03-31')            // Less than or equal
  .in('status', ['scheduled', 'confirmed'])     // In list
  .is('notes', null)                             // Is null
  .ilike('patient_name', '%smith%')             // Case-insensitive like
  .order('scheduled_at', { ascending: true })   // Sort
  .range(0, 9);                                  // Pagination (first 10 rows)
```

**Single row:**
```typescript
const { data, error } = await client
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .single();  // Returns object instead of array, errors if not exactly 1 row
```

**Count:**
```typescript
const { count, error } = await client
  .from('appointments')
  .select('*', { count: 'exact', head: true })  // head: true = don't return data
  .eq('status', 'scheduled');
```

### INSERT (Create)

**Single row:**
```typescript
const { data, error } = await client
  .from('appointments')
  .insert({
    patient_id: patientId,
    doctor_id: doctorId,
    facility_id: facilityId,
    scheduled_at: '2026-03-20T10:00:00Z',
    status: 'scheduled',
  })
  .select()    // Return the inserted row
  .single();
```

**Multiple rows:**
```typescript
const { data, error } = await client
  .from('appointments')
  .insert([
    { patient_id: 'p1', doctor_id: 'd1', scheduled_at: '2026-03-20T10:00:00Z' },
    { patient_id: 'p2', doctor_id: 'd1', scheduled_at: '2026-03-20T11:00:00Z' },
  ])
  .select();
```

### UPDATE

```typescript
const { data, error } = await client
  .from('appointments')
  .update({
    status: 'confirmed',
    notes: 'Patient confirmed via phone',
  })
  .eq('id', appointmentId)   // ALWAYS filter — never update all rows
  .select()
  .single();
```

### UPSERT (Insert or Update)

```typescript
const { data, error } = await client
  .from('patient_preferences')
  .upsert({
    patient_id: patientId,
    preferred_doctor: doctorId,
    reminder_hours: 24,
  })
  .select()
  .single();
```

### DELETE

```typescript
const { error } = await client
  .from('appointments')
  .delete()
  .eq('id', appointmentId);  // ALWAYS filter — never delete all rows
```

---

## RPC Functions (Stored Procedures)

For operations that can't be expressed as simple CRUD — aggregations, multi-table logic, or custom business rules — use PostgreSQL functions called via `.rpc()`.

### Calling an RPC Function

```typescript
const { data, error } = await client.rpc('get_account_members', {
  account_slug: 'my-clinic',
});
```

### Existing RPC Functions

The codebase includes ~34 pre-built functions. Key ones:

| Function | Purpose | Parameters |
|----------|---------|------------|
| `get_account_members` | List all members of an account | `account_slug: text` |
| `get_account_invitations` | List pending invitations | `account_slug: text` |
| `get_subscription_details` | Get active subscription info | `target_account_id: uuid` |
| `get_remaining_tickets` | Count remaining usage quota | `account_id: uuid` |
| `has_role_on_account` | Check if user has access | `account_id: uuid` |
| `team_account_workspace` | Get team workspace data | `account_slug: text` |
| `personal_account_workspace` | Get personal workspace data | (none) |

### Creating a New RPC Function

1. Create a migration:
```bash
pnpm --filter web supabase migration new add-appointment-stats
```

2. Write the function:
```sql
CREATE OR REPLACE FUNCTION public.get_appointment_stats(target_account_id uuid)
RETURNS TABLE (
  total_count bigint,
  scheduled_count bigint,
  completed_count bigint,
  cancelled_count bigint,
  no_show_count bigint
)
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*)::bigint AS total_count,
    count(*) FILTER (WHERE status = 'scheduled')::bigint AS scheduled_count,
    count(*) FILTER (WHERE status = 'completed')::bigint AS completed_count,
    count(*) FILTER (WHERE status = 'cancelled')::bigint AS cancelled_count,
    count(*) FILTER (WHERE status = 'no_show')::bigint AS no_show_count
  FROM public.appointments
  WHERE account_id = target_account_id;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_appointment_stats(uuid)
  TO authenticated, service_role;
```

3. Apply and regenerate types:
```bash
pnpm run supabase:web:reset
pnpm run supabase:web:typegen
```

4. Call it:
```typescript
const { data, error } = await client.rpc('get_appointment_stats', {
  target_account_id: accountId,
});
// data → { total_count: 150, scheduled_count: 30, completed_count: 100, ... }
```

### When to Use RPC vs Direct Queries

| Use Case | Approach |
|----------|----------|
| Simple CRUD (list, create, update, delete) | `.from().select()` / `.insert()` / `.update()` / `.delete()` |
| Joins across 1-2 tables | `.from().select('*, related(*)')` |
| Aggregations (count, sum, avg) | `.rpc('function_name')` |
| Complex multi-table logic | `.rpc('function_name')` |
| Business rules (e.g., "check quota before insert") | Database trigger or `.rpc()` |
| Transactions (all-or-nothing) | `.rpc('function_name')` (single function = single transaction) |

---

## GraphQL API

Supabase includes a GraphQL API via `pg_graphql`. It's **enabled by default** (the `graphql_public` schema is exposed in `config.toml`), but the codebase primarily uses REST.

### Accessing GraphQL

**Endpoint:** `{SUPABASE_URL}/graphql/v1`

**Headers:**
```
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {USER_JWT}
Content-Type: application/json
```

### Testing with curl

```bash
curl -X POST \
  'http://localhost:54321/graphql/v1' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ appointmentsCollection(first: 10) { edges { node { id scheduledAt status } } } }"}'
```

### Testing in Supabase Studio

1. Open Studio: `http://localhost:54323`
2. Navigate to **API Docs** in the sidebar
3. Switch to the **GraphQL** tab
4. Write and execute queries in the built-in playground

### Using from Code

```typescript
const { data, error } = await client.rpc('graphql', {
  query: `
    query {
      appointmentsCollection(first: 10, filter: { status: { eq: "scheduled" } }) {
        edges {
          node {
            id
            scheduledAt
            status
            patient: patientId {
              fullName
            }
          }
        }
      }
    }
  `,
});
```

### GraphQL Naming Conventions

`pg_graphql` auto-maps PostgreSQL names:

| PostgreSQL | GraphQL |
|-----------|---------|
| `appointments` table | `appointmentsCollection` query |
| `scheduled_at` column | `scheduledAt` field |
| Foreign key to `patients` | Nested `patient` object |
| `INSERT` | `insertIntoAppointmentsCollection` mutation |
| `UPDATE` | `updateAppointmentsCollection` mutation |
| `DELETE` | `deleteFromAppointmentsCollection` mutation |

### When to Use GraphQL vs REST

| Scenario | Use |
|----------|-----|
| Simple queries, server components | REST (`.from().select()`) — simpler, typed |
| Complex nested queries from client | GraphQL — fetch exactly what you need in one request |
| Mobile apps or third-party consumers | GraphQL — flexible schema exploration |
| Server actions, mutations | REST — better TypeScript integration |

**Recommendation:** Use REST for all server-side code. Consider GraphQL only if you're building a separate client (mobile app, third-party integration) that benefits from schema introspection.

---

## Verifying & Testing the APIs

### Supabase Studio (GUI)

1. Start Supabase: `pnpm supabase:web:start`
2. Open: `http://localhost:54323`

| Tab | What You Can Do |
|-----|----------------|
| **Table Editor** | Browse, insert, edit, delete rows with the GUI |
| **SQL Editor** | Run raw SQL queries |
| **API Docs** | See auto-generated REST and GraphQL documentation for every table |
| **Authentication** | Create test users, view sessions |
| **Storage** | Browse buckets, upload/download files |

### Auto-Generated API Documentation

Supabase Studio → **API Docs** shows:

- Every table's REST endpoints
- Required/optional columns
- Available filters
- Example `curl` commands
- Example JavaScript client code
- GraphQL schema and queries

This documentation **updates automatically** when you change the schema.

### Testing REST with curl

```bash
# List appointments (as authenticated user)
curl 'http://localhost:54321/rest/v1/appointments?select=*&status=eq.scheduled' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer USER_JWT'

# Insert an appointment
curl -X POST 'http://localhost:54321/rest/v1/appointments' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer USER_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"patient_id": "uuid", "doctor_id": "uuid", "scheduled_at": "2026-03-20T10:00:00Z"}'
```

### Testing RPC with curl

```bash
curl -X POST 'http://localhost:54321/rest/v1/rpc/get_account_members' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer USER_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"account_slug": "my-clinic"}'
```

### Testing in Code

Write a quick server action to verify:

```typescript
'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function testQuery() {
  const client = getSupabaseServerClient();

  // Test REST
  const { data: appointments, error: restError } = await client
    .from('appointments')
    .select('id, status')
    .limit(5);
  console.log('REST result:', { appointments, restError });

  // Test RPC
  const { data: stats, error: rpcError } = await client
    .rpc('get_remaining_tickets', { target_account_id: 'some-uuid' });
  console.log('RPC result:', { stats, rpcError });

  return { appointments, stats };
}
```

---

## TypeScript Types

After running `pnpm run supabase:web:typegen`, your database schema is fully typed in `apps/web/lib/database.types.ts`.

The Supabase client is generic over these types, so you get full autocomplete:

```typescript
const client = getSupabaseServerClient();

// TypeScript knows all table names, column names, and types
const { data } = await client
  .from('appointments')     // ← autocomplete shows all tables
  .select('id, status')     // ← autocomplete shows all columns
  .eq('status', 'scheduled'); // ← TypeScript validates the value type

// data is typed as: { id: string; status: string }[] | null
```

**Always regenerate types after changing the schema:**
```bash
pnpm run supabase:web:typegen
```

---

## Quick Reference

| I want to... | Code |
|--------------|------|
| Read rows | `client.from('table').select('*')` |
| Read with joins | `client.from('table').select('*, related(*)')` |
| Filter | `.eq()`, `.neq()`, `.gt()`, `.lt()`, `.in()`, `.ilike()` |
| Sort | `.order('column', { ascending: true })` |
| Paginate | `.range(0, 9)` (first 10 rows) |
| Get one row | `.single()` |
| Count rows | `.select('*', { count: 'exact', head: true })` |
| Insert | `client.from('table').insert({...}).select()` |
| Update | `client.from('table').update({...}).eq('id', id)` |
| Upsert | `client.from('table').upsert({...})` |
| Delete | `client.from('table').delete().eq('id', id)` |
| Call function | `client.rpc('function_name', { param: value })` |
| Upload file | `client.storage.from('bucket').upload(path, file)` |
| Get signed URL | `client.storage.from('bucket').createSignedUrl(path, expiry)` |
| Subscribe to changes | `client.channel('name').on('postgres_changes', ...)` |

---

## Next Steps

- [RLS Deep Dive](./03b-rls-deep-dive.md) — Understand the policies that filter every query
- [Data Fetching & Mutations](./05-data-fetching.md) — React Query, server actions, and cache patterns
- [Realtime Updates](./07-realtime.md) — Live subscriptions to data changes
- [File Storage](./12-file-storage.md) — Upload and manage files
