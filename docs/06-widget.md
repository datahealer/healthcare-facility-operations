# Embeddable JavaScript Widget

This guide covers building a standalone JavaScript widget that can be embedded on external websites — including the Turborepo package setup, React components, API routes, Rollup bundling, iframe isolation, and OpenAI integration.

---

## Architecture Overview

```
External Website                          Your Next.js App
┌──────────────────────┐                 ┌──────────────────────┐
│                      │                 │                      │
│  <script src="..."/> │                 │  POST /api/ticket    │
│        │             │   HTTP calls    │  GET  /api/ticket/   │
│        ▼             │ ──────────────► │       messages       │
│  ┌─────────────┐     │                 │                      │
│  │   iframe     │     │                 │  CustomerTicket      │
│  │  (React app) │     │                 │  Service             │
│  │  Widget UI   │     │                 │    │                 │
│  └─────────────┘     │                 │    ▼                 │
│                      │                 │  Supabase DB         │
└──────────────────────┘                 └──────────────────────┘
```

The widget is:
- A **standalone IIFE bundle** (no React/React DOM dependency on the host site — bundled in)
- Rendered inside an **iframe** for CSS isolation
- Communicates with your app via **REST API** (not Supabase client directly)
- Persists conversation via **localStorage** (`ticketId`)

---

## Step 1: Create the Turborepo Package

```bash
pnpm turbo gen package
```

This creates `packages/ticket-widget/` with the standard package structure.

### Package Structure

```
packages/ticket-widget/
├── src/
│   ├── components/
│   │   ├── context.tsx                         # Widget state (React Context)
│   │   ├── support-ticket-widget-container.tsx  # Main widget UI
│   │   ├── iframe.tsx                          # iframe isolation wrapper
│   │   └── index.tsx                           # Entry point & mount logic
│   ├── index.tsx                               # Script entry (reads data attributes)
│   └── index.css                               # Widget styles (Tailwind)
├── rollup.config.mjs                           # Bundle configuration
├── postcss.config.js                           # PostCSS for Tailwind
├── tsconfig.json
└── package.json
```

---

## Step 2: Widget Context (State Management)

Use React Context instead of external state libraries to keep the bundle small:

```typescript
// src/components/context.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface WidgetState {
  isOpen: boolean;
  ticketId: string | undefined;
  setOpen: (open: boolean) => void;
  setTicketId: (id: string) => void;
}

const WidgetContext = createContext<WidgetState | null>(null);

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | undefined>(
    () => localStorage.getItem('ticketId') ?? undefined,
  );

  return (
    <WidgetContext.Provider
      value={{ isOpen, ticketId, setOpen, setTicketId }}
    >
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgetContext() {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error('useWidgetContext must be used within WidgetProvider');
  return ctx;
}
```

---

## Step 3: API Route Handlers

### POST `/api/ticket` — Create Ticket or Send Message

**File:** `apps/web/app/api/ticket/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const client = getSupabaseServerAdminClient();
  const service = createCustomerTicketService(client);

  if (body.ticketId) {
    // Existing ticket — add a message
    const message = await service.createMessage({
      ticketId: body.ticketId,
      content: body.message,
    });
    return NextResponse.json(message);
  }

  // New ticket — create ticket + first message
  const ticket = await service.createTicket({
    accountId: body.accountId,
    message: body.message,
    customerEmail: body.email,
  });

  return NextResponse.json(ticket);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### GET `/api/ticket/messages` — Fetch Messages

**File:** `apps/web/app/api/ticket/messages/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetTicketMessagesSchema = z.object({
  ticketId: z.string().uuid(),
  lastCreatedAt: z
    .string()
    .or(z.literal(''))
    .transform((value) => {
      if (value === 'undefined') return undefined;
      return value;
    }),
});

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const { ticketId, lastCreatedAt } = GetTicketMessagesSchema.parse({
    ticketId: searchParams.get('ticketId') ?? '',
    lastCreatedAt: searchParams.get('lastCreatedAt') ?? '',
  });

  const client = getSupabaseServerAdminClient();

  let query = client
    .from('messages')
    .select('id, ticketId: ticket_id, content, author, createdAt: created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (lastCreatedAt) {
    query = query.gt('created_at', lastCreatedAt);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

**CORS headers** (`Access-Control-Allow-Origin: *`) are required because the widget runs on external domains.

---

## Step 4: Customer Ticket Service

**File:** `apps/web/app/api/ticket/_lib/server/customer-ticket.service.ts`

```typescript
class CustomerTicketService {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createTicket(params: {
    accountId: string;
    message: string;
    customerEmail?: string;
  }) {
    const { data: ticket, error } = await this.client
      .from('tickets')
      .insert({
        account_id: params.accountId,
        title: 'New Support Ticket', // Updated later via AI
        customer_email: params.customerEmail,
      })
      .select()
      .single();

    if (error) throw error;

    await this.createMessage({
      ticketId: ticket.id,
      content: params.message,
    });

    // Generate title asynchronously
    this.generateTicketTitle(ticket.id, params.message);

    return ticket;
  }

  async createMessage(params: { ticketId: string; content: string }) {
    const { data, error } = await this.client
      .from('messages')
      .insert({
        ticket_id: params.ticketId,
        content: params.content,
        author: 'customer',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTicketMessages(ticketId: string, lastCreatedAt?: string) {
    let query = this.client
      .from('messages')
      .select('id, ticket_id, content, author, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (lastCreatedAt) {
      query = query.gt('created_at', lastCreatedAt);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  private async generateTicketTitle(ticketId: string, content: string) {
    // Uses OpenAI — see "AI Title Generation" section below
  }
}
```

---

## Step 5: iframe Isolation

The widget renders inside an iframe to prevent CSS conflicts with the host site:

```typescript
// src/components/iframe.tsx
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

export function IframeWrapper({ children }: { children: React.ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      setMountNode(doc.body);
      // Inject widget styles into iframe
      const style = doc.createElement('style');
      style.textContent = getWidgetStyles();
      doc.head.appendChild(style);
    }
  }, []);

  return (
    <>
      <iframe ref={iframeRef} style={{ border: 'none', width: '100%', height: '100%' }} />
      {mountNode && createPortal(children, mountNode)}
    </>
  );
}
```

---

## Step 6: Widget Entry Point & Mounting

```typescript
// src/index.tsx
const script = document.currentScript as HTMLScriptElement;
const accountId = script.getAttribute('data-account');

if (!accountId) {
  console.error('Widget: data-account attribute is required');
} else {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <WidgetProvider>
      <SupportTicketWidgetContainer accountId={accountId} />
    </WidgetProvider>,
  );
}
```

### Embedding on External Sites

```html
<script
  data-account="your-team-account-uuid"
  src="https://yourdomain.com/widget/healthops-widget.js"
></script>
```

The `data-account` attribute identifies which team receives the tickets.

---

## Step 7: Rollup Bundle Configuration

**File:** `packages/ticket-widget/rollup.config.mjs`

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  input: 'src/index.tsx',
  output: {
    file: `dist/${process.env.WIDGET_NAME || 'widget.js'}`,
    format: 'iife',   // Self-executing for browser embedding
    name: 'HealthOpsWidget',
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    typescript(),
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-react'],
      extensions: ['.ts', '.tsx'],
    }),
    postcss({ inject: true }),  // Inlines CSS into JS
    terser(),                    // Minifies
    visualizer(),                // Bundle analysis (optional)
  ],
};
```

### Environment Files

```bash
# .env (development)
WIDGET_NAME=healthops-widget.js
API_URL=http://localhost:3000/api/ticket

# .env.production
WIDGET_NAME=healthops-widget.js
API_URL=https://yourdomain.com/api/ticket
```

### Build & Serve Commands

Add to root `package.json`:

```json
{
  "scripts": {
    "widget:build": "pnpm --filter ticket-widget build",
    "widget:serve": "pnpm --filter ticket-widget serve"
  }
}
```

```bash
# Build the widget
pnpm run widget:build

# Serve locally for testing (port 3333)
pnpm run widget:serve
```

---

## Step 8: AI-Powered Title Generation (Optional)

### Install OpenAI

```bash
pnpm add openai --filter web
```

### Add API Key

**File:** `apps/web/.env.local` (never committed)

```bash
OPENAI_API_KEY=sk-...
```

### Implementation

```typescript
import OpenAI from 'openai';

private async generateTicketTitle(ticketId: string, content: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Generate a short, descriptive title (max 10 words) for this support ticket based on the message content.',
      },
      { role: 'user', content },
    ],
    max_tokens: 10,
  });

  const title = response.choices[0]?.message?.content?.trim();

  if (title) {
    await this.client
      .from('tickets')
      .update({ title })
      .eq('id', ticketId);
  }
}
```

---

## Testing Workflow

1. Start the Next.js dev server: `pnpm dev`
2. Build the widget: `pnpm run widget:build`
3. Serve locally: `pnpm run widget:serve`
4. Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Test Page</h1>
  <script
    data-account="your-team-account-uuid"
    src="http://localhost:3333/healthops-widget.js"
  ></script>
</body>
</html>
```

5. To test a new conversation, clear localStorage: `localStorage.removeItem('ticketId')`

---

## Next Steps

- [Realtime Updates](./07-realtime.md) — Add live message updates for agents
- [Payments & Billing](./08-billing.md) — Enforce feature limits per plan
