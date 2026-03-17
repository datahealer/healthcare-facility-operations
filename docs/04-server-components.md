# Server Components

This guide covers the difference between Server and Client Components, the service pattern for data access, building pages with data tables, and wiring everything together.

---

## Server Components vs Client Components

| | Server Components | Client Components |
|---|---|---|
| **Render location** | Server only | Server (SSR) + Client (hydration) |
| **Directive** | Default (no directive needed) | `'use client'` at top of file |
| **Hooks** | No (`useState`, `useEffect`, etc.) | Yes |
| **Event handlers** | No (`onClick`, `onChange`, etc.) | Yes |
| **Async** | Can be `async` functions | Cannot be `async` |
| **Data fetching** | Direct DB/API calls | React Query, `useEffect`, etc. |
| **Bundle size** | Zero client JS | Included in client bundle |

### Decision Rule

> **Can this component be rendered once on the server with no interactivity?**
> - **Yes** → Server Component (default)
> - **No** (needs hooks, events, functions as props) → Client Component (`'use client'`)

### Component Boundaries

When a Server Component renders a Client Component, all **descendants** of that Client Component also become Client Components. Design your tree so that `'use client'` boundaries are as low (leaf-level) as possible.

```
ServerPage (server)
├── ServerLayout (server)
│   ├── StaticHeader (server)         ← no JS shipped
│   ├── DataTable (client)            ← 'use client' boundary
│   │   ├── ColumnDefs (client)       ← inherits client
│   │   └── SortButton (client)       ← inherits client
│   └── StaticFooter (server)         ← no JS shipped
```

---

## The Service Pattern

Encapsulate all database queries in service classes. This keeps pages clean and makes queries reusable and testable.

### Creating a Service

**File:** `apps/web/lib/server/tickets/tickets.service.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '~/lib/database.types';

export function createTicketsService(client: SupabaseClient<Database>) {
  return new TicketsService(client);
}

class TicketsService {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getTickets(params: {
    accountSlug: string;
    page: number;
    limit?: number;
    query?: string;
  }) {
    const limit = params.limit ?? 25;
    const startOffset = (params.page - 1) * limit;
    const endOffset = startOffset + limit - 1;

    let query = this.client
      .from('tickets')
      .select('*, account_id !inner (slug)', { count: 'exact' })
      .eq('account_id.slug', params.accountSlug)
      .order('created_at', { ascending: false })
      .range(startOffset, endOffset);

    if (params.query) {
      query = query.textSearch('title', params.query);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const pageCount = Math.ceil((count ?? 0) / limit);

    return {
      data: data ?? [],
      count,
      pageSize: limit,
      page: params.page,
      pageCount,
    };
  }

  async getTicket(params: { ticketId: string; account: string }) {
    const { data, error } = await this.client
      .from('tickets')
      .select('*, account_id !inner (slug, id)')
      .eq('id', params.ticketId)
      .eq('account_id.slug', params.account)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
```

**Key Supabase query patterns:**
- `!inner` — Performs an inner join (filters out rows where the relation is null)
- `.select('*, relation (columns)')` — Expands foreign key relations
- `.range(start, end)` — Pagination
- `.textSearch('column', query)` — Full-text search
- `{ count: 'exact' }` — Returns total row count for pagination

---

## Getting the Supabase Client

### Server-Side (Server Components, Server Actions, Route Handlers)

```typescript
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const client = getSupabaseServerClient();
```

This client respects RLS — queries run as the authenticated user.

### Server-Side Admin (Bypass RLS) — USE WITH EXTREME CAUTION

```typescript
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const adminClient = getSupabaseServerAdminClient();
```

> **This client bypasses ALL RLS policies.** A query like `.from('appointments').select('*')` returns every row in the entire database, across all accounts. Using it because "RLS is inconvenient" is a security violation — fix the policy instead.
>
> **Acceptable uses only:** webhook handlers, background cron jobs, database seeding, and the anonymous widget API. See [RLS Deep Dive: Why the Admin Client is Dangerous](./03b-rls-deep-dive.md#why-the-admin-client-is-dangerous) for the full explanation.

### Client-Side (Client Components)

```typescript
'use client';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

function MyComponent() {
  const client = useSupabase();
  // use client for queries...
}
```

---

## Building a Page

### Step 1: Add Navigation

**File:** `apps/web/config/team-account-navigation.config.tsx`

```tsx
import { MessageCircle } from 'lucide-react';

{
  label: 'Support Tickets',
  path: `/home/${account}/tickets`,
  Icon: <MessageCircle className={iconClasses} />,
}
```

### Step 2: Create the Page File

**File:** `apps/web/app/home/[account]/tickets/page.tsx`

```typescript
import { use } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { PageBody, PageHeader } from '@kit/ui/page';

import { createTicketsService } from '~/lib/server/tickets/tickets.service';
import { TicketsDataTable } from './_components/tickets-data-table';

interface TicketsPageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ page?: string; query?: string }>;
}

export default function TicketsPage(props: TicketsPageProps) {
  const client = getSupabaseServerClient();
  const service = createTicketsService(client);

  const { account } = use(props.params);
  const { page: pageParam, query = '' } = use(props.searchParams);
  const page = Number(pageParam ?? '1');

  const { data, pageSize, pageCount } = use(
    service.getTickets({
      accountSlug: account,
      page,
      query,
    }),
  );

  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Support tickets from your customers"
      />
      <PageBody>
        <TicketsDataTable
          data={data}
          pageIndex={page - 1}
          pageCount={pageCount}
          pageSize={pageSize}
        />
      </PageBody>
    </>
  );
}
```

**Important:** The `use()` hook unwraps Promises in Server Components synchronously. This is the recommended pattern instead of `async/await` on the component function.

### Next.js 16 Params Pattern

In Next.js 16, `params` and `searchParams` are **Promises**. Always `await` or `use()` them:

```typescript
// Correct
const { account } = use(props.params);       // Server Component
const { account } = await props.params;       // async Server Component

// Wrong — will error
const { account } = props.params;             // params is a Promise!
```

### Step 3: Create the Data Table (Client Component)

**File:** `apps/web/app/home/[account]/tickets/_components/tickets-data-table.tsx`

This must be a Client Component because column definitions contain **functions** (cell renderers), which can't be serialized from Server to Client.

```typescript
'use client';

import Link from 'next/link';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@kit/ui/button';
import { DataTable } from '@kit/ui/enhanced-data-table';
import { Tables } from '~/lib/database.types';

type Ticket = Tables<'tickets'>;

export function TicketsDataTable(props: {
  data: Ticket[];
  pageSize: number;
  pageIndex: number;
  pageCount: number;
}) {
  return <DataTable {...props} columns={getColumns()} />;
}

function getColumns(): ColumnDef<Ticket>[] {
  return [
    {
      header: 'Title',
      cell: ({ row }) => (
        <Link href={`tickets/${row.original.id}`}>
          {row.original.title}
        </Link>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <TicketStatusBadge status={row.original.status} />
      ),
    },
    {
      header: 'Priority',
      cell: ({ row }) => (
        <TicketPriorityBadge priority={row.original.priority} />
      ),
    },
    {
      header: 'Created At',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => (
        <Button asChild variant="outline">
          <Link href={`tickets/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ];
}
```

### Step 4: Create Badge Components

**File:** `apps/web/app/home/[account]/tickets/_components/ticket-status-badge.tsx`

```typescript
import { Badge } from '@kit/ui/badge';
import { Tables } from '~/lib/database.types';

export function TicketStatusBadge({
  status,
}: {
  status: Tables<'tickets'>['status'];
}) {
  switch (status) {
    case 'open':
      return <Badge variant="warning">Open</Badge>;
    case 'closed':
      return <Badge variant="secondary">Closed</Badge>;
    case 'resolved':
      return <Badge variant="success">Resolved</Badge>;
    case 'in_progress':
      return <Badge variant="info">In Progress</Badge>;
  }
}
```

---

## File Organization Conventions

| Folder | Purpose |
|--------|---------|
| `_components/` | Route-specific components (prefixed `_` to exclude from routing) |
| `_lib/` | Route-specific client utilities |
| `_lib/server/` | Route-specific server-only utilities |
| `lib/server/` | App-wide server-only utilities (services, etc.) |

---

## Key Takeaways

1. **Default to Server Components** — only use `'use client'` when you need hooks or interactivity
2. **Push client boundaries down** — keep `'use client'` at the leaf level
3. **Use the service pattern** — encapsulate all DB queries in service classes
4. **Functions can't cross the server/client boundary** — column definitions, event handlers, and callbacks require Client Components
5. **Always `use()` or `await` params** — they're Promises in Next.js 16

---

## Next Steps

- [Data Fetching & Mutations](./05-data-fetching.md) — React Query, server actions, forms
- [Realtime Updates](./07-realtime.md) — Live data with Supabase Realtime
