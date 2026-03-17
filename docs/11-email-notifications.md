# Email & Notifications

> How to send emails from the application, configure providers, test locally, and go to production.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     EMAIL SYSTEM                                  │
│                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │ Server Action │    │  Mailer Core  │    │  Provider          │  │
│  │ or API Route  │───►│  (registry)   │───►│  (Nodemailer or    │  │
│  │              │    │              │    │   Resend)           │  │
│  └──────────────┘    └──────────────┘    └────────────────────┘  │
│                                                    │              │
│                                                    ▼              │
│                                           ┌────────────────┐     │
│                                           │  SMTP / API    │     │
│                                           │  (Inbucket in  │     │
│                                           │   dev, real    │     │
│                                           │   SMTP in prod)│     │
│                                           └────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

There are **two separate email systems**:

1. **Application emails** — Emails you send from your code (contact forms, appointment reminders, custom notifications). These use the mailer package.
2. **Auth emails** — Emails Supabase sends automatically (confirmation, password reset, magic link, invitations). These are configured in Supabase Dashboard or `config.toml`.

---

## Part 1: Application Emails (Mailer Package)

### Supported Providers

| Provider | Package | Best For | Runtime |
|----------|---------|----------|---------|
| **Nodemailer** | `@kit/nodemailer` | Development, self-hosted SMTP | Node.js only |
| **Resend** | `@kit/resend` | Production (HTTP API) | Node.js + Edge |

### Environment Variables

**Development** (`.env.development`):
```bash
MAILER_PROVIDER=nodemailer
EMAIL_SENDER="HealthOps <noreply@yourdomain.com>"
EMAIL_HOST=localhost
EMAIL_PORT=54325
EMAIL_TLS=false
EMAIL_USER=user
EMAIL_PASSWORD=password
CONTACT_EMAIL=your@email.com
```

**Production** (`.env.production` or CI/CD):

For **Nodemailer** (any SMTP service — SendGrid, Mailgun, Amazon SES, etc.):
```bash
MAILER_PROVIDER=nodemailer
EMAIL_SENDER="HealthOps <noreply@yourdomain.com>"
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_TLS=true
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your-sendgrid-api-key
CONTACT_EMAIL=support@yourdomain.com
```

For **Resend** (HTTP API — no SMTP configuration needed):
```bash
MAILER_PROVIDER=resend
EMAIL_SENDER="HealthOps <noreply@yourdomain.com>"
RESEND_API_KEY=re_your-resend-api-key
CONTACT_EMAIL=support@yourdomain.com
```

### Sending an Email from a Server Action

```typescript
'use server';

import { getMailer } from '@kit/mailers';
import { enhanceAction } from '@kit/next/actions';
import { z } from 'zod';

const ReminderSchema = z.object({
  patientEmail: z.string().email(),
  patientName: z.string(),
  appointmentDate: z.string(),
  doctorName: z.string(),
});

export const sendAppointmentReminder = enhanceAction(
  async (data) => {
    const mailer = await getMailer();
    const emailSender = process.env.EMAIL_SENDER!;

    await mailer.sendEmail({
      to: data.patientEmail,
      from: emailSender,
      subject: `Appointment Reminder - ${data.appointmentDate}`,
      html: `
        <h2>Appointment Reminder</h2>
        <p>Dear ${data.patientName},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <ul>
          <li><strong>Doctor:</strong> ${data.doctorName}</li>
          <li><strong>Date:</strong> ${data.appointmentDate}</li>
        </ul>
        <p>Please arrive 10 minutes early.</p>
      `,
    });

    return { success: true };
  },
  {
    auth: true,
    schema: ReminderSchema,
  },
);
```

### Sending an Email from an API Route

```typescript
import { getMailer } from '@kit/mailers';
import { enhanceRouteHandler } from '@kit/next/routes';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
});

export const POST = enhanceRouteHandler(
  async ({ body }) => {
    const mailer = await getMailer();

    await mailer.sendEmail({
      to: body.to,
      from: process.env.EMAIL_SENDER!,
      subject: body.subject,
      html: body.html,
    });

    return NextResponse.json({ success: true });
  },
  {
    auth: true,
    schema: Schema,
  },
);
```

### The Mailer Interface

Every provider implements this interface — you never import a specific provider directly:

```typescript
// What getMailer() returns — same API regardless of provider
interface Mailer {
  sendEmail(data: {
    to: string;       // Recipient email
    from: string;     // Sender (EMAIL_SENDER env var)
    subject: string;  // Email subject line
    html?: string;    // HTML body (use this OR text)
    text?: string;    // Plain text body (use this OR html)
  }): Promise<unknown>;
}
```

### Email Templates (React)

Pre-built templates exist in `packages/email-templates/src/emails/`:

| Template | File | Used For |
|----------|------|----------|
| Team invitation | `invite.email.tsx` | When inviting someone to a team account |
| OTP code | `otp.email.tsx` | One-time password emails |
| Account deletion | `account-delete.email.tsx` | Account deletion confirmation |

To create a new template, add a React component in the same directory and render it to HTML:

```typescript
import { render } from '@react-email/render';
import { AppointmentReminder } from '@kit/email-templates';

const html = await render(
  <AppointmentReminder
    patientName="John"
    doctorName="Dr. Smith"
    appointmentDate="March 20, 2026"
  />
);

await mailer.sendEmail({ to, from, subject, html });
```

### Testing Emails Locally

When Supabase is running locally (`pnpm supabase:web:start`), **Inbucket** captures all emails at:

```
http://localhost:54324
```

Open this URL in your browser to see all emails sent during development — both application emails (via Nodemailer on port 54325) and Supabase auth emails.

**No external SMTP service needed for development.**

---

## Part 2: Auth Emails (Supabase-Managed)

These emails are sent automatically by Supabase and require **no application code**:

| Email | When It's Sent | Triggered By |
|-------|---------------|-------------|
| Confirmation | User signs up | `supabase.auth.signUp()` |
| Password reset | User requests reset | `supabase.auth.resetPasswordForEmail()` |
| Magic link | User requests magic link | `supabase.auth.signInWithOtp()` |
| Invitation | Admin invites a team member | Invitation server action |
| Email change | User changes their email | `supabase.auth.updateUser()` |
| OTP | User requests one-time code | `supabase.auth.signInWithOtp()` |

### Customizing Auth Email Templates

**Local development:** Edit HTML files in `apps/web/supabase/templates/`:

```
apps/web/supabase/templates/
├── confirm-email.html
├── reset-password.html
├── magic-link.html
├── invite-user.html
├── change-email-address.html
└── otp.html
```

These are referenced in `supabase/config.toml`:

```toml
[auth.email.template.invite]
subject = "You are invited"
content_path = "./supabase/templates/invite-user.html"

[auth.email.template.confirmation]
subject = "Confirm your email"
content_path = "./supabase/templates/confirm-email.html"

[auth.email.template.recovery]
subject = "Reset your password"
content_path = "./supabase/templates/reset-password.html"

[auth.email.template.magic_link]
subject = "Your Magic Link"
content_path = "./supabase/templates/magic-link.html"

[auth.email.template.email_change]
subject = "Confirm your email change"
content_path = "./supabase/templates/change-email-address.html"
```

**Production:** Edit templates in Supabase Dashboard → Authentication → Email Templates.

### Production SMTP Setup

By default, Supabase uses its built-in email service (limited to ~4 emails/hour). For production:

1. Go to **Supabase Dashboard → Settings → Auth → SMTP Settings**
2. Enable "Custom SMTP"
3. Enter your SMTP credentials (SendGrid, Mailgun, Amazon SES, Postmark, etc.)

This applies **only to auth emails**. Application emails use the mailer package configured via `MAILER_PROVIDER`.

---

## Part 3: In-App Notifications

The notification system is separate from email. It uses the database and optionally Supabase Realtime.

### Enable/Disable

```bash
# Show notification bell and system
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Live updates via WebSocket (optional)
NEXT_PUBLIC_REALTIME_NOTIFICATIONS=true
```

### How Notifications Work

1. Notifications are stored in a database table
2. The notification bell in the UI queries this table
3. If `NEXT_PUBLIC_REALTIME_NOTIFICATIONS=true`, changes push to the client via WebSocket
4. If `false`, the UI polls or refreshes on navigation

See [Realtime Updates](./07-realtime.md) for details on the Realtime subscription pattern.

---

## Checklist: Going to Production

- [ ] Set `MAILER_PROVIDER` to your chosen provider (`nodemailer` or `resend`)
- [ ] Configure production SMTP or API key credentials
- [ ] Set `EMAIL_SENDER` to a verified domain email
- [ ] Configure SMTP in Supabase Dashboard for auth emails
- [ ] Customize auth email templates in Dashboard
- [ ] Set `CONTACT_EMAIL` to your support address
- [ ] Test email delivery with a real email address (not Inbucket)
- [ ] Verify SPF, DKIM, and DMARC records for your sending domain

---

## Next Steps

- [File Storage](./12-file-storage.md) — Upload and manage files
- [Data Access & APIs](./13-data-access-apis.md) — Query the database from your code
- [Realtime Updates](./07-realtime.md) — Live notifications and data sync
