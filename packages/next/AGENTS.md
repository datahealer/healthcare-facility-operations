# Next.js Utilities

## Quick Reference

| Function              | Import                  | Purpose                            |
|-----------------------|-------------------------|------------------------------------|
| `authActionClient`    | `@kit/next/safe-action` | Authenticated server actions       |
| `publicActionClient`  | `@kit/next/safe-action` | Public server actions (no auth)    |
| `captchaActionClient` | `@kit/next/safe-action` | Server actions with CAPTCHA + auth |
| `enhanceRouteHandler` | `@kit/next/routes`      | API routes with auth + validation  |

## Guidelines

- Server Actions for mutations only, not data-fetching
- Keep actions light - move business logic to services
- Authorization via RLS, not application code
- Use `'use server'` at top of file
- Always validate with Zod schema
- Use `useAction` hook from `next-safe-action/hooks` in client components

## Skills

For detailed implementation patterns:
- `/server-action-builder` - Complete server action workflow

## Server Action Pattern (next-safe-action)

```typescript
'use server';

import { authActionClient } from '@kit/next/safe-action';

// Authenticated action with schema validation
export const myAction = authActionClient
  .schema(MySchema)
  .action(async ({ parsedInput: data, ctx: { user } }) => {
    // data: validated input, user: authenticated user
    return { success: true };
  });

// Public action (no auth required)
import { publicActionClient } from '@kit/next/safe-action';

export const publicAction = publicActionClient
  .schema(MySchema)
  .action(async ({ parsedInput: data }) => {
    return { success: true };
  });
```

### Admin actions

Admin actions use a dedicated client in `@kit/admin`:

```typescript
import { adminActionClient } from '../utils/admin-action-client';

export const adminAction = adminActionClient
  .schema(MySchema)
  .action(async ({ parsedInput: data, ctx: { user } }) => {
    // Only accessible to super admins
    return { success: true };
  });
```

## Client Component Pattern (useAction)

```typescript
'use client';

import { useAction } from 'next-safe-action/hooks';
import { myAction } from '../server/server-actions';

function MyComponent() {
  const { execute, isPending, hasErrored, result } = useAction(myAction, {
    onSuccess: ({ data }) => {
      // Handle success
    },
    onError: ({ error }) => {
      // Handle error
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); execute(formData); }}>
      {/* form fields */}
      <button disabled={isPending}>Submit</button>
    </form>
  );
}
```

## Route Handler Pattern

```typescript
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(
  async function ({ body, user, request }) {
    return NextResponse.json({ success: true });
  },
  { auth: true, schema: MySchema },
);
```

## Revalidation

- Use `revalidatePath` after mutations
- Never use `router.refresh()` or `router.push()` after Server Actions
