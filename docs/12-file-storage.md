# File Storage

> How to upload, download, and manage files using Supabase Storage. Covers bucket creation, access policies, and usage patterns.

---

## How It Works

Supabase Storage is built on top of PostgreSQL and S3-compatible object storage. Files are organized into **buckets** (like folders), and access is controlled by **RLS policies on `storage.objects`** — the same policy system used for database tables.

```
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE STORAGE                            │
│                                                                │
│  ┌─────────────┐     ┌──────────────┐     ┌───────────────┐  │
│  │   Buckets    │     │  RLS Policies │     │  Object Store │  │
│  │             │     │              │     │  (S3-compat)  │  │
│  │ account_img │────►│  Who can      │────►│  Actual files │  │
│  │ documents   │     │  read/write?  │     │  stored here  │  │
│  │ reports     │     │              │     │              │  │
│  └─────────────┘     └──────────────┘     └───────────────┘  │
│                                                                │
│  Access: supabase.storage.from('bucket').upload/download()    │
└──────────────────────────────────────────────────────────────┘
```

---

## What's Already Configured

The codebase ships with one pre-configured bucket:

| Bucket | ID | Public | Purpose |
|--------|----|--------|---------|
| Account Image | `account_image` | Yes | Profile pictures for users and teams |

**Defined in migration:** `apps/web/supabase/migrations/20221215192558_schema.sql`

```sql
INSERT INTO storage.buckets (id, name, PUBLIC) VALUES
  ('account_image', 'account_image', true);
```

**RLS Policy:** Users can upload/manage images where the filename (without extension) matches their user ID or an account they belong to:

```sql
create policy account_image on storage.objects for all using (
  bucket_id = 'account_image'
    and (
      kit.get_storage_filename_as_uuid(name) = auth.uid()
      or public.has_role_on_account(kit.get_storage_filename_as_uuid(name))
    )
);
```

---

## Creating a New Bucket

### Step 1: Add Bucket in a Migration

```bash
pnpm --filter web supabase migration new add-documents-bucket
```

Edit the generated file:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,                                          -- Private bucket
  5242880,                                         -- 5MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg']  -- Allowed types
);

-- RLS: Users can upload to their account's folder
CREATE POLICY "users_upload_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role_on_account(
      (storage.foldername(name))[1]::uuid
    )
  );

-- RLS: Users can view their account's documents
CREATE POLICY "users_view_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role_on_account(
      (storage.foldername(name))[1]::uuid
    )
  );

-- RLS: Users can delete their account's documents
CREATE POLICY "users_delete_documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role_on_account(
      (storage.foldername(name))[1]::uuid
    )
  );
```

### Step 2: Apply the Migration

```bash
pnpm run supabase:web:reset      # Local
# or
supabase db push                  # Cloud (from apps/web/)
```

### Step 3: Regenerate Types

```bash
pnpm run supabase:web:typegen
```

---

## File Path Conventions

Organize files by account ID to align with RLS policies:

```
bucket/
├── {account-uuid}/
│   ├── reports/
│   │   ├── monthly-2026-03.pdf
│   │   └── quarterly-2026-q1.pdf
│   ├── prescriptions/
│   │   └── rx-12345.pdf
│   └── profile.jpg
```

The first folder in the path is typically the `account_id`, which the RLS policy checks via `storage.foldername(name)`.

---

## Uploading Files

### From a Server Action

```typescript
'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { enhanceAction } from '@kit/next/actions';
import { z } from 'zod';

const UploadSchema = z.object({
  accountId: z.string().uuid(),
  fileName: z.string(),
  fileBase64: z.string(),       // Base64-encoded file content
  contentType: z.string(),
});

export const uploadDocument = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();

    // Convert base64 to buffer
    const buffer = Buffer.from(data.fileBase64, 'base64');

    const filePath = `${data.accountId}/documents/${data.fileName}`;

    const { data: result, error } = await client.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: data.contentType,
        upsert: false,  // Don't overwrite existing
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return { path: result.path };
  },
  {
    auth: true,
    schema: UploadSchema,
  },
);
```

### From a Client Component

```tsx
'use client';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';

function FileUpload({ accountId }: { accountId: string }) {
  const supabase = useSupabase();

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const filePath = `${accountId}/documents/${file.name}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Upload failed:', error.message);
      return;
    }

    console.log('Uploaded:', data.path);
  }

  return <input type="file" onChange={handleUpload} accept=".pdf,.png,.jpg" />;
}
```

---

## Downloading / Accessing Files

### Public Buckets

For public buckets (like `account_image`), get a permanent public URL:

```typescript
const { data } = supabase.storage
  .from('account_image')
  .getPublicUrl('user-uuid.png');

// data.publicUrl → https://your-project.supabase.co/storage/v1/object/public/account_image/user-uuid.png
```

### Private Buckets

For private buckets, generate a **signed URL** with an expiry:

```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl('account-uuid/reports/monthly.pdf', 3600); // Expires in 1 hour

// data.signedUrl → https://your-project.supabase.co/storage/v1/object/sign/documents/...?token=...
```

### Download Directly

```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .download('account-uuid/reports/monthly.pdf');

// data is a Blob
```

---

## Listing Files

```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .list('account-uuid/reports', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

// data → [{ name: 'monthly.pdf', id: '...', created_at: '...', metadata: {...} }, ...]
```

---

## Deleting Files

```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .remove(['account-uuid/reports/monthly.pdf']);
```

---

## Configuration

### File Size Limit

**Local** (`apps/web/supabase/config.toml`):
```toml
[storage]
file_size_limit = "50MiB"
```

**Per-bucket** (in migration SQL):
```sql
UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10MB in bytes
WHERE id = 'documents';
```

**Cloud:** Supabase Dashboard → Storage → Bucket Settings

### Allowed MIME Types

Set per-bucket in the migration:
```sql
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp'
]
WHERE id = 'documents';
```

Or set in Dashboard → Storage → Bucket → Allowed MIME types.

---

## Testing Locally

### Supabase Studio

1. Start Supabase: `pnpm supabase:web:start`
2. Open Studio: `http://localhost:54323`
3. Navigate to **Storage** in the sidebar
4. You'll see the `account_image` bucket (and any others you've created)
5. Upload/download/delete files directly through the UI

### Verify RLS Policies

In Supabase Studio → SQL Editor:

```sql
-- See all storage policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Test Upload via Code

```typescript
// In a test or server action
const client = getSupabaseServerClient();

const { data, error } = await client.storage
  .from('documents')
  .upload('test-account-id/test.txt', new Blob(['hello']), {
    contentType: 'text/plain',
  });

console.log({ data, error });
```

---

## Common Bucket Examples for Healthcare

| Bucket | Public? | MIME Types | Use Case |
|--------|---------|-----------|----------|
| `account_image` | Yes | `image/*` | Profile photos |
| `documents` | No | `application/pdf`, `image/*` | Patient documents, prescriptions |
| `reports` | No | `application/pdf` | Lab reports, diagnostic images |
| `exports` | No | `text/csv`, `application/pdf` | Generated exports and invoices |

---

## Checklist: Adding a New Bucket

- [ ] Create a migration with `INSERT INTO storage.buckets`
- [ ] Set `public` (true/false), `file_size_limit`, and `allowed_mime_types`
- [ ] Write RLS policies for INSERT, SELECT, and DELETE on `storage.objects`
- [ ] Use `storage.foldername(name)` or `storage.filename(name)` in policies for path-based access control
- [ ] Apply migration (`supabase db reset` locally, `supabase db push` for cloud)
- [ ] Regenerate types (`pnpm run supabase:web:typegen`)
- [ ] Test upload/download in Supabase Studio
- [ ] Test RLS by uploading as different users

---

## Next Steps

- [Data Access & APIs](./13-data-access-apis.md) — Query the database from your code
- [RLS Deep Dive](./03b-rls-deep-dive.md) — Storage policies follow the same RLS patterns
- [Database](./03-database.md) — Migration workflow
