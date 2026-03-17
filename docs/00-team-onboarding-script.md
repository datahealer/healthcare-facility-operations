# Team Onboarding: Opening Script

> A script for presenting the HealthOps project to your development team. Covers the "why" behind the architecture, addresses concerns, and hands over the repo without it feeling forced.

---

## Part 1: The Problem We're Solving (2 min)

Hey everyone, thanks for being here. Before I show you the repo or talk about any technology, I want to talk about the problem.

We're building a platform for busy healthcare professionals — doctors running back-to-back consultations, pathology labs juggling hundreds of samples, radiologists reading scans against the clock, dental clinics with waiting rooms full of patients. These people don't have time for clunky software. They need something that just works — fast, reliable, and secure.

That means we need to ship features quickly, we need the app to be rock-solid on security (we're dealing with patient data), and we need to be able to move fast without stepping on each other's toes.

Now, I could have set this up the traditional way — React frontend, Express backend, PostgreSQL database, the whole three-tier stack we all know. But I want to walk you through why I didn't, and what we're doing instead. Not because the old way is wrong — it got us here. But because there's a better way for what we're building, and I think once you see it, you'll actually prefer it.

---

## Part 2: The Pain We All Know (3 min)

Think about the last project you worked on with a traditional backend. Let's say we needed to build an endpoint to list appointments. What did that look like?

First, you write the Express route. Then you add auth middleware. Then you add authorization logic — if the user is a patient, filter by patient_id; if they're a doctor, filter by doctor_id; if they're an admin, filter by facility. That's already 50-60 lines before you've done anything useful.

Then you write the same kind of logic for creating an appointment. And updating one. And deleting one. And for every other table — patients, invoices, prescriptions, follow-ups. Every single endpoint needs the same auth check, the same role-based filtering, the same error handling.

Now multiply that across a team. Developer A writes their endpoints carefully and remembers all the filters. Developer B is rushing to meet a deadline and forgets to add `WHERE doctor_id = $1` to one query. The code compiles. The tests pass — because the tests probably don't cover that edge case. And now we have a security hole that exposes patient data.

We've all seen this. It's not a skill issue. It's an architecture issue. When security depends on every developer remembering to do the right thing in every file, eventually someone forgets. It's just statistics.

**The question is: can we make it so that forgetting is not possible?**

---

## Part 3: What We're Doing Instead (5 min)

The answer is yes. And it's not some bleeding-edge experimental thing — it's a PostgreSQL feature that's been around since version 9.5. It's called **Row Level Security**, or RLS.

Here's the idea. Instead of writing authorization logic in our backend code, we write it once, in the database itself, as a policy. Like this:

```sql
CREATE POLICY "doctors_see_own_appointments"
  ON appointments FOR SELECT
  USING (doctor_id = auth.uid());
```

That one line says: "When anyone queries the appointments table, only show them rows where they're the assigned doctor." It doesn't matter how the query is written. It doesn't matter if someone writes `SELECT *` with no WHERE clause. The database itself filters the results.

So what does our application code look like?

```typescript
const { data } = await supabase.from('appointments').select('*');
```

That's it. One line. No auth middleware. No role-checking. No WHERE clause. The database handles all of it, every time, for every query, automatically.

And here's the thing that might feel weird at first — there's no separate backend. The frontend talks directly to the database through Supabase, which gives us an auto-generated REST API. Supabase handles authentication (JWT tokens), and the database handles authorization (RLS policies).

I know what some of you are thinking: "Wait, the frontend talks directly to the database? That sounds dangerous." It's actually the opposite. In a traditional app, your backend is one big trust boundary — if someone gets past your auth middleware, they can do anything. Here, even if there's a bug in the frontend, the database still enforces the rules. The security lives at the last possible layer, where the data actually is.

---

## Part 4: What Happened to the Backend? (3 min)

It didn't disappear. It changed shape.

In the traditional model, about 80% of your backend code is plumbing — auth checks, input validation, CRUD endpoints, error handling. That's the part that's gone. Supabase handles all of it.

The remaining 20% — the stuff that actually needs a server — still exists. We use Next.js Server Actions and API routes for:

- **Payment processing** — Stripe webhooks, checkout sessions
- **Multi-step operations** — Book an appointment AND send a confirmation email AND update a calendar, all in one transaction
- **Third-party integrations** — SMS reminders, external APIs
- **Background jobs** — Report generation, batch operations

So it's not "no backend." It's "no boilerplate backend." You write server-side code when there's actual server-side logic to write. Not just to shuttle data between the browser and the database.

Let me put it in numbers. To build a "list appointments" feature the traditional way — middleware, route, validator, service, controller — you're looking at roughly 300 lines across 5 files. With this approach, it's about 50 lines across 2 files — the migration (schema + RLS policy) and the React component. And the migration is more secure because it's enforced at the database level.

---

## Part 5: Addressing the Concerns (5 min)

I know this is different from what we're used to. Let me address the things I think you might be worried about.

**"I don't know SQL / RLS well."**

That's completely fine. Most of us write SQL every day already — SELECT, INSERT, UPDATE, JOIN. RLS policies are just SQL with one extra concept: `auth.uid()`, which returns the current user's ID from their JWT token. If you can write a WHERE clause, you can write an RLS policy. We have a comprehensive deep-dive document that walks through every pattern with healthcare-specific examples.

**"This feels like we're learning a whole new stack."**

It's less than you think. It's still React. It's still TypeScript. It's still PostgreSQL. The main shift is where you put the authorization logic — in the database instead of in API routes. The actual day-to-day coding is React components and SQL migrations. That's it. No new languages. No new paradigms. Just a different place for the security logic.

**"What if I need to do something the database can't handle?"**

Then you write a server action or an API route — same as you would in any Next.js app. We have `enhanceAction` and `enhanceRouteHandler` utilities that give you auth and validation out of the box. This isn't an all-or-nothing architecture. It's "use the database for the 80% it handles well, and use server-side code for the 20% that actually needs it."

**"Is this battle-tested?"**

Yes. PostgreSQL RLS has been in production at scale since 2016. Supabase has thousands of production apps running this exact pattern. Next.js App Router with Server Components is the direction the entire React ecosystem is moving. We're not on the bleeding edge here — we're on the proven edge.

**"What about performance? Doesn't RLS add overhead?"**

RLS policies are evaluated at the database level using indexes — the same way WHERE clauses work. If you index the columns your policies reference (which we do), the performance difference is negligible. And you save all the network round-trips that a traditional backend would add.

**"What if someone makes a mistake with the admin client?"**

Great question. The admin client bypasses RLS — it's the master key. Our documentation is very clear: you almost never use it. It's for webhook handlers and cron jobs — system-level operations with no user context. For everything else, you use the standard client, which enforces RLS. If you find yourself reaching for the admin client to "work around" a policy, the answer is to fix the policy, not bypass it. The docs explain this in detail.

---

## Part 6: What This Means for You Day-to-Day (3 min)

Let me paint a picture of what your typical workflow looks like on this project.

**Adding a new feature — say, prescription management:**

1. Write a migration with the table schema and RLS policies (~30 lines of SQL)
2. Push it to the cloud database (`supabase db push`)
3. Regenerate TypeScript types (one command)
4. Build the React components that query the data (standard React, fully typed)
5. If you need server-side logic (e.g., generate a PDF), write a server action

That's the entire feature. No API routes for CRUD. No auth middleware. No role-checking scattered across files.

**What you won't be doing:**

- Writing Express routes
- Building auth/authz middleware
- Creating DTO/validator layers for every endpoint
- Debugging "why can user X see user Y's data" in application code
- Maintaining a separate API documentation

**What you will be doing:**

- Writing React components (you know this)
- Writing SQL migrations with RLS policies (we have patterns for every scenario)
- Writing server actions for complex operations (same mental model as API routes, less boilerplate)
- Using TypeScript everywhere — the database types are auto-generated

---

## Part 7: The Handover (2 min)

Here's the repo. Everything you need is in one place.

The root `README.md` is your starting point — it has installation, setup, commands, and links to every doc. You don't need any external documentation. Everything is self-contained.

I'd suggest reading these in order:

1. **README.md** — Get the app running locally. It's one command: `pnpm dev`.
2. **Architecture: Mental Model Shift** (doc 3a) — This walks through the "traditional vs. new" comparison with code examples.
3. **RLS Deep Dive** (doc 3b) — This is the most important doc. Take 30 minutes with it. It covers every pattern we'll use.
4. **Feature Configuration Guide** (doc 10) — Know what's already built-in so you don't rebuild it.

After that, explore. The docs are modular — pick up whichever one is relevant to what you're working on.

I want to be clear about something: **this is not a mandate.** I'm not asking you to believe this is better because I say so. I'm asking you to try it for a couple of features and see how it feels. Write a migration. Write a component. See how much code you don't have to write. If after that you have concerns or ideas for doing things differently, I want to hear them. This is our project, not my project.

The documentation is thorough — over 16 docs covering everything from database patterns to email setup to deployment. If something isn't documented, that's a gap I want to fix. If something feels wrong, that's a conversation I want to have.

Questions?

---

## Appendix: One-Slide Summary (For a Presentation Deck)

```
TRADITIONAL                          THIS PROJECT
───────────                          ────────────
Frontend                             Frontend (React + Next.js)
    ↓                                     ↓
Backend (Express)                    Supabase (auto-generated API)
  • Auth middleware                     • JWT authentication (built-in)
  • Authorization logic                • RLS policies (in the database)
  • Input validation                   • Zod schemas (in server actions)
  • CRUD endpoints                     • Auto-generated from schema
  • Error handling                     • Built into the framework
    ↓                                     ↓
Database (PostgreSQL)                Database (PostgreSQL)
  • No security awareness              • RLS enforces access rules
  • Trusts the backend                 • Trusts no one

300 lines / 5 files per feature      50 lines / 2 files per feature
Security: hope devs remember         Security: impossible to forget
```

---

## Appendix: Quick FAQ for Developers

**Q: Where's the backend repo?**
A: There isn't one. Server-side code lives in the same monorepo under `apps/web/app/` (server actions) and `apps/web/app/api/` (API routes). This is a standard Next.js App Router pattern.

**Q: How do I test if my RLS policy is correct?**
A: Log into Supabase Dashboard → SQL Editor. You can test as different users and verify what data they see. The RLS Deep Dive doc (3b) has step-by-step instructions.

**Q: What if I need to add a new table?**
A: Create a migration (`pnpm --filter web supabase migration new <name>`), write the SQL with RLS policies, push to cloud, regenerate types. The Database doc (03) walks through every step.

**Q: Where do I put business logic?**
A: Simple reads/writes → database (RLS handles auth). Complex operations → server actions in `apps/web/`. Business rules that must always apply → database triggers or RPC functions.

**Q: How do I send an email?**
A: Use `getMailer()` in a server action. Auth emails (confirmation, reset) are handled automatically by Supabase. See the Email doc (11).

**Q: I'm stuck. Where do I look?**
A: `docs/README.md` → find the relevant doc. If it's not documented, flag it. We'll add it.
