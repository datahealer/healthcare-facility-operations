# Realtime Updates

This guide covers implementing live data updates using Supabase Realtime (WebSockets) for the dashboard and polling for external widgets.

---

## Why Realtime?

- **Instant UX** — Users see changes without refreshing
- **Collaboration** — Multiple team members see the same live state
- **Timely alerts** — New tickets and messages appear immediately
- **Competitive edge** — Realtime feels modern and responsive

---

## Supabase Realtime Overview

Built on Phoenix Channels (Elixir), Supabase Realtime provides:

| Feature | Use Case |
|---------|----------|
| **Database Changes** | Subscribe to INSERT, UPDATE, DELETE on specific tables |
| **Presence** | Track who's online |
| **Broadcast** | Send/receive arbitrary messages between clients |

Communication happens over **WebSockets** — persistent, bidirectional connections between client and server.

---

## Setup: Enable Realtime on a Table

Add this to your migration file:

```sql
alter publication supabase_realtime add table messages;
```

Then reset the database:

```bash
pnpm run supabase:web:reset
```

> Only enable Realtime on tables that need it. Each subscribed table adds load to the Realtime service.

---

## Subscribing to Changes (Dashboard)

### Basic Subscription Pattern

```typescript
'use client';

import { useEffect } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Tables } from '~/lib/database.types';

function useRealtimeMessages(
  ticketId: string,
  onNewMessage: (message: Tables<'messages'>) => void,
) {
  const client = useSupabase();

  useEffect(() => {
    const channel = client.channel(`messages-channel-${ticketId}`);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const message = payload.new as Tables<'messages'>;

          // Only handle customer messages (agent messages are
          // already in the cache from the server action)
          if (message.author === 'customer') {
            onNewMessage(message);
          }
        },
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      void subscription.unsubscribe();
    };
  }, [client, ticketId, onNewMessage]);
}
```

### Key Details

| Parameter | Purpose |
|-----------|---------|
| `client.channel('unique-name')` | Creates a named channel (must be unique per subscription) |
| `event: 'INSERT'` | Only triggers on new rows (also supports `'UPDATE'`, `'DELETE'`, `'*'`) |
| `schema: 'public'` | The database schema to watch |
| `table: 'messages'` | The specific table |
| `filter: 'ticket_id=eq.${ticketId}'` | Server-side filter — only receive relevant rows |
| `payload.new` | The newly inserted row data |

### Integrating with React Query Cache

Combine realtime subscriptions with the cache update pattern from [Data Fetching](./05-data-fetching.md):

```typescript
'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tables } from '~/lib/database.types';

function useAppendMessage(queryKey: string[]) {
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

### Full Integration Example

```typescript
function TicketMessagesContainer({ ticketId }: { ticketId: string }) {
  const queryKey = ['ticket-messages', ticketId];
  const appendMessage = useAppendMessage(queryKey);

  // Fetch messages with infinite query
  const { data, fetchNextPage, hasNextPage } =
    useTicketMessages(ticketId);

  // Subscribe to realtime inserts
  useRealtimeMessages(ticketId, appendMessage);

  const allMessages = data?.pages.flat() ?? [];

  return (
    <MessageList messages={allMessages} />
  );
}
```

---

## Polling (External Widget)

The embeddable widget uses **polling** instead of Supabase Realtime to avoid exposing the Supabase client SDK to external sites.

### Polling Implementation

```typescript
function useFetchTicketMessages({
  ticketId,
  isOpen,
}: {
  ticketId: string | undefined;
  isOpen: boolean;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error: Error | null;
    messages: Message[];
  }>({
    loading: true,
    error: null,
    messages: [],
  });

  useEffect(() => {
    if (!ticketId || !isOpen) {
      setState((s) => ({ ...s, loading: false, error: null }));
      return;
    }

    function fetchMessages(lastCreatedAt?: string) {
      const url = `${API_URL}/messages?ticketId=${ticketId}&lastCreatedAt=${lastCreatedAt ?? ''}`;

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch messages');
          return res.json();
        })
        .then((messages) => {
          setState({ loading: false, error: null, messages });
        })
        .catch((error) => {
          setState({ loading: false, error, messages: [] });
        });
    }

    // Initial fetch
    fetchMessages();

    // Poll every 10 seconds
    const interval = setInterval(() => {
      const lastMessage = state.messages[state.messages.length - 1];
      fetchMessages(lastMessage?.createdAt);
    }, 10_000);

    return () => clearInterval(interval);
  }, [ticketId, isOpen, state.messages]);

  return {
    ...state,
    appendMessage: (message: Message) => {
      setState((s) => ({
        ...s,
        messages: [...s.messages, message],
      }));
    },
  };
}
```

### How Polling Reduces Data Transfer

The `lastCreatedAt` parameter uses the `gt` (greater than) filter on the API:

```typescript
if (lastCreatedAt) {
  query = query.gt('created_at', lastCreatedAt);
}
```

This fetches only **new messages** since the last known timestamp, not the entire conversation history.

---

## Realtime vs Polling Comparison

| | Supabase Realtime | Polling |
|---|---|---|
| **Latency** | Instant (~50ms) | Up to interval duration (10s) |
| **Efficiency** | Only sends when data changes | Makes requests even when nothing changed |
| **Complexity** | Requires WebSocket setup | Simple HTTP requests |
| **Dependencies** | Supabase client SDK | None (plain `fetch`) |
| **Use case** | Dashboard (authenticated users) | External widget (anonymous visitors) |

---

## Available Realtime Events

| Event | Triggers On |
|-------|-------------|
| `INSERT` | New row created |
| `UPDATE` | Existing row modified |
| `DELETE` | Row deleted |
| `*` | Any of the above |

### Subscribing to Multiple Events

```typescript
channel
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'tickets',
    filter: `account_id=eq.${accountId}`,
  }, handleNewTicket)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tickets',
    filter: `account_id=eq.${accountId}`,
  }, handleTicketUpdate)
  .subscribe();
```

---

## Best Practices

1. **Always clean up subscriptions** — Return a cleanup function from `useEffect`
2. **Use server-side filters** — The `filter` parameter reduces unnecessary traffic
3. **Unique channel names** — Include entity IDs in channel names to avoid conflicts
4. **Don't duplicate data** — Check if the message is already in the cache before appending
5. **Enable Realtime selectively** — Only on tables that need it

---

## Next Steps

- [Payments & Billing](./08-billing.md) — Stripe integration and feature limits
- [Deployment](./09-deployment.md) — Go to production
