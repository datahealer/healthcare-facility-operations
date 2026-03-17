# Data Fetching & Mutations

This guide covers client-side data fetching with React Query, writing data with Server Actions, form handling, cache management, and optimistic updates.

---

## When to Use What

| Scenario | Pattern |
|----------|---------|
| Data needed for initial page render | Server Component (direct fetch) |
| Data loaded lazily after page renders | React Query (`useQuery`) |
| Paginated/infinite lists | React Query (`useInfiniteQuery`) |
| Writing data (create, update, delete) | Server Actions (`enhanceAction`) |
| Form submissions | React Hook Form + Server Action |

**Rule of thumb:** If the data is essential for the page to render, fetch it in a Server Component. If it's secondary or loaded on demand, use React Query.

---

## React Query: Client-Side Fetching

### Basic Query

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

function TeamMembers({ accountSlug }: { accountSlug: string }) {
  const client = useSupabase();

  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts_memberships', accountSlug],
    queryFn: async () => {
      const { data, error } = await client.rpc('get_account_members', {
        account_slug: accountSlug,
      });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading members</div>;

  return (
    <ul>
      {data?.map((member) => (
        <li key={member.id}>{member.name}</li>
      ))}
    </ul>
  );
}
```

### Infinite Query (Paginated Messages)

```typescript
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

function useTicketMessages(ticketId: string) {
  const client = useSupabase();
  const pageSize = 25;

  return useInfiniteQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async ({ pageParam = 1 }) => {
      const startOffset = (pageParam - 1) * pageSize;
      const endOffset = startOffset + pageSize - 1;

      const { data, error } = await client
        .from('messages')
        .select(
          '*, account: author_account_id (email, name, picture_url)',
        )
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
        .range(startOffset, endOffset);

      if (error) throw error;
      return data ?? [];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) =>
      lastPage.length === 0 ? undefined : lastPageParam + 1,
    getPreviousPageParam: (_, __, firstPageParam) =>
      firstPageParam <= 1 ? undefined : firstPageParam - 1,
  });
}
```

---

## Server Actions: Writing Data

Server Actions are async functions that run on the server, triggered from Client Components. Use the `enhanceAction` wrapper for automatic authentication and Zod validation.

### Defining a Server Action

**File:** `apps/web/app/home/[account]/tickets/_lib/server/server-actions.ts`

```typescript
'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { z } from 'zod';

const MessageFormSchema = z.object({
  message: z.string().min(1).max(5000),
  ticketId: z.string().uuid(),
});

export const insertTicketMessageAction = enhanceAction(
  async (data, user) => {
    const client = getSupabaseServerClient();

    const { data: message, error } = await client
      .from('messages')
      .insert({
        content: data.message,
        ticket_id: data.ticketId,
        author_account_id: user.id,
        author: 'support',
      })
      .select(
        '*, account: author_account_id (email, picture_url, name)',
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return message;
  },
  {
    auth: true,
    schema: MessageFormSchema,
  },
);
```

**`enhanceAction` provides:**
- `auth: true` — Rejects unauthenticated requests, passes `user` as second argument
- `schema` — Validates `data` against the Zod schema before the handler runs
- Automatic error handling and logging

### Calling a Server Action from a Client Component

```typescript
'use client';

import { useTransition } from 'react';
import { insertTicketMessageAction } from '../_lib/server/server-actions';

function MessageForm({ ticketId }: { ticketId: string }) {
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: { message: string }) {
    startTransition(async () => {
      const result = await insertTicketMessageAction({
        message: formData.message,
        ticketId,
      });

      // Update UI with result...
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
      <button disabled={isPending}>
        {isPending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

---

## Validation Schemas

Define Zod schemas for every mutation:

```typescript
import { z } from 'zod';

export const UpdateTicketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(['open', 'closed', 'resolved', 'in_progress']),
});

export const UpdateTicketPrioritySchema = z.object({
  ticketId: z.string().uuid(),
  priority: z.enum(['low', 'medium', 'high']),
});

export const UpdateTicketAssigneeSchema = z.object({
  ticketId: z.string().uuid(),
  assignedTo: z.string().uuid(),
});
```

---

## Cache Management

### Immediate Cache Update (Optimistic)

After a server action succeeds, update the React Query cache immediately instead of refetching:

```typescript
import { useQueryClient } from '@tanstack/react-query';

function useAppendNewMessage(queryKey: string[]) {
  const queryClient = useQueryClient();

  return useCallback(
    (message: Tables<'messages'>) => {
      queryClient.setQueryData(queryKey, (data: any) => {
        if (!data) return data;

        const lastPage = [
          ...data.pages[data.pages.length - 1],
          message,
        ];

        return {
          ...data,
          pages: [...data.pages.slice(0, -1), lastPage],
        };
      });
    },
    [queryClient, queryKey],
  );
}
```

### Revalidate Server Data

For Server Component data, use `revalidatePath` inside server actions:

```typescript
'use server';

import { revalidatePath } from 'next/cache';

export const updateTicketStatusAction = enhanceAction(
  async (data, user) => {
    // ... update logic ...

    revalidatePath('/home/[account]/tickets/[ticket]', 'page');

    return updatedTicket;
  },
  { auth: true, schema: UpdateTicketStatusSchema },
);
```

---

## Permission-Based UI

Check permissions client-side for UX only (real enforcement is RLS):

```typescript
'use client';

import { useTeamAccountWorkspace } from '@kit/team-accounts/hooks/use-team-account-workspace';

function TicketActions() {
  const { account } = useTeamAccountWorkspace();
  const canUpdate = account.permissions.includes('tickets.update');

  if (!canUpdate) {
    return null; // Hide actions for users without permission
  }

  return <UpdateForm />;
}
```

> This is **only a UX feature**. The actual access control happens at the database level via RLS policies. Never trust client-side permission checks for security.

---

## Auto-Scrolling Pattern

For chat/message UIs, auto-scroll to the latest message:

```typescript
import { useEffect, useRef } from 'react';

function MessageList({ messages }: { messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
      });
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="overflow-y-auto">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

---

## Logging

Use the built-in logger for debugging and observability:

```typescript
import { getLogger } from '@kit/shared/logger';

const logger = await getLogger();

logger.info({ data }, 'Updating ticket status...');
logger.error({ error: response.error.message }, 'Failed to update ticket status');
```

Logs are the **first thing to check** when debugging issues.

---

## Key Patterns Summary

```
┌─────────────────────────────────────────┐
│           Server Component              │
│  ┌──────────────────────────────────┐   │
│  │   getSupabaseServerClient()     │   │
│  │   service.getTickets()          │   │  Initial data
│  │   Pass data as props ───────────┼──►│
│  └──────────────────────────────────┘   │
└────────────────────┬────────────────────┘
                     │ props (serializable data only)
                     ▼
┌─────────────────────────────────────────┐
│         Client Component                │
│  ┌──────────────────────────────────┐   │
│  │   useQuery / useInfiniteQuery   │   │  Lazy data
│  │   useSupabase() for client      │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   Server Action (enhanceAction) │   │  Mutations
│  │   useTransition for pending     │   │
│  │   queryClient.setQueryData      │   │  Cache update
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Next Steps

- [Embeddable Widget](./06-widget.md) — Build a standalone JS widget with API routes
- [Realtime Updates](./07-realtime.md) — Live subscriptions with Supabase Realtime
