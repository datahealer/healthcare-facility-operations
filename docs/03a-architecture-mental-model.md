# Architecture: The Mental Model Shift

## From Traditional APIs to Direct Database Access

If you've built web apps before, you know the traditional three-tier architecture: Frontend → API → Database. This project uses a fundamentally different approach where the **frontend communicates directly with the database**, with security enforced at the database level.

This is made possible by **Supabase**, which combines PostgreSQL with built-in authentication, auto-generated REST APIs, and Row Level Security (RLS).

---

## Traditional Architecture (What You Know)

```
┌─────────────┐     HTTP      ┌─────────────┐     SQL      ┌─────────────┐
│             │   Request     │             │    Query     │             │
│   Frontend  │ ───────────►  │  API Layer  │ ──────────►  │  Database   │
│  (React)    │               │  (Express)  │              │ (PostgreSQL)│
│             │  ◄───────────  │             │  ◄──────────  │             │
│             │   JSON        │             │    Results   │             │
└─────────────┘               └─────────────┘              └─────────────┘
```

In this model, the API layer handles:

1. **Authentication** — Verifying who the user is
2. **Authorization** — Checking what they can access
3. **Validation** — Ensuring input data is correct
4. **Query Building** — Constructing SQL based on user role
5. **Error Handling** — Catching and formatting errors

### Example: Traditional Express API

```typescript
// routes/appointments.ts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Authorization scattered across every route
    let query;
    if (userRole === 'patient') {
      query = `SELECT * FROM appointments WHERE patient_id = $1`;
    } else if (userRole === 'doctor') {
      query = `SELECT * FROM appointments WHERE doctor_id = $1`;
    } else if (userRole === 'facility_admin') {
      const facilityId = await getFacilityForUser(userId);
      query = `SELECT * FROM appointments WHERE facility_id = $1`;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(query, [userId]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});
```

### Problems with This Approach

| Problem | Impact |
|---------|--------|
| **Code duplication** | Auth/authz logic repeated in every route |
| **Security surface** | Multiple places where security bugs can occur |
| **Inconsistency** | Different developers implement checks differently |
| **Maintenance** | Changes to access rules require updating many files |
| **Testing burden** | Must test every endpoint for auth/authz |
| **Boilerplate** | 80% of code is infrastructure, not business logic |

---

## The New Architecture: Direct Database Access

```
┌─────────────┐                                           ┌─────────────┐
│             │           Direct Connection               │             │
│   Frontend  │ ─────────────────────────────────────────►│  Supabase   │
│  (React)    │           (HTTPS + JWT)                   │  (Postgres) │
│             │ ◄─────────────────────────────────────────│             │
└─────────────┘                                           └─────────────┘
                                                                │
                                              Security enforced by:
                                              ├── JWT Authentication
                                              ├── Row Level Security (RLS)
                                              └── Database Policies
```

### How It Works

1. **User authenticates** → Receives a JWT token
2. **Frontend makes database request** → Token sent automatically
3. **Supabase verifies token** → Extracts user identity
4. **RLS policies execute** → Database filters data automatically
5. **Only permitted data returns** → No API code needed

### The Same Feature with Direct Access

```typescript
// This single query replaces the entire API route above
const { data, error } = await supabase
  .from('appointments')
  .select('*');

// RLS automatically filters based on who's logged in:
// - Patients see only their appointments
// - Doctors see only their assigned appointments
// - Admins see only their facility's appointments
```

**Where did the security code go?** It's in the database, defined once:

```sql
CREATE POLICY "users_see_own_appointments" ON appointments
FOR SELECT USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR facility_id IN (
    SELECT facility_id FROM staff WHERE user_id = auth.uid()
  )
);
```

---

## Step-by-Step: What Happens Inside Supabase

### Step 1: User Authenticates

```
┌──────────┐    1. Login Request     ┌──────────────┐
│          │ ─────────────────────►  │              │
│  Browser │    (email/password)     │   Supabase   │
│          │                         │     Auth     │
│          │  ◄─────────────────────  │              │
└──────────┘    2. JWT Token         └──────────────┘
```

The JWT contains:
```json
{
  "sub": "user-uuid-12345",
  "email": "doctor@clinic.com",
  "role": "authenticated",
  "exp": 1699999999
}
```

### Step 2: Frontend Makes Database Request

```
┌──────────┐                              ┌──────────────┐
│          │   GET /rest/v1/appointments  │              │
│  Browser │ ────────────────────────────►│   Supabase   │
│          │   Header: Bearer <JWT>       │   PostgREST  │
└──────────┘                              └──────────────┘
```

### Step 3: Supabase Processes It

```
┌─────────────────────────────────────────────────────────────┐
│                    Inside Supabase                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Verify JWT signature (is this token valid?)              │
│  2. Extract user ID from token                               │
│     auth.uid() → 'user-uuid-12345'                           │
│  3. Execute query WITH RLS policies applied                  │
│  4. Return only permitted rows                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: RLS Filters the Data

Your query: `SELECT * FROM appointments;`

What actually executes (RLS applied automatically):
```sql
SELECT * FROM appointments
WHERE (
  patient_id = 'user-uuid-12345'
  OR doctor_id = 'user-uuid-12345'
  OR facility_id IN (
    SELECT facility_id FROM staff
    WHERE user_id = 'user-uuid-12345'
  )
);
```

Visual example:
```
┌──────┬──────────────┬──────────────┬──────────────┬─────────────────┐
│  id  │  patient_id  │  doctor_id   │ facility_id  │  Returned?      │
├──────┼──────────────┼──────────────┼──────────────┼─────────────────┤
│  1   │ user-12345   │ doc-999      │ fac-001      │ YES (patient)   │
│  2   │ user-99999   │ user-12345   │ fac-001      │ YES (doctor)    │
│  3   │ user-88888   │ doc-777      │ fac-001      │ YES (staff)     │
│  4   │ user-77777   │ doc-666      │ fac-002      │ NO  (no access) │
└──────┴──────────────┴──────────────┴──────────────┴─────────────────┘
```

---

## Side-by-Side Comparison

### Files Required for "List Appointments"

**Traditional API:**
```
middleware/auth.ts                 (30 lines)
middleware/authorize.ts            (50 lines)
routes/appointments.ts             (100 lines)
validators/appointment.ts          (40 lines)
services/appointmentService.ts     (80 lines)
─────────────────────────────────
Total: ~300 lines, 5 files
```

**Direct Access with RLS:**
```
migrations/appointments.sql        (30 lines — schema + policies)
components/AppointmentsList.tsx     (20 lines)
─────────────────────────────────
Total: ~50 lines, 2 files
```

### Security Model Comparison

**Traditional API:**
```
  Request → Auth Middleware → Authz Middleware → Route → Service

  - Security scattered across multiple layers
  - Easy to forget a check in one route
  - Inconsistent implementations
  - Must test every endpoint
```

**Direct Access with RLS:**
```
  Request ──────────────► Supabase ──────────────► Data
                              │
                         JWT + RLS Policies

  - Security enforced at database level
  - Impossible to bypass (database is final authority)
  - Single source of truth
  - Applies to ALL access methods
```

---

## When You Still Need API Routes / Server Actions

Direct database access handles ~70-80% of operations. Use API routes or server actions for:

| Scenario | Example |
|----------|---------|
| **Multi-step transactions** | Book appointment + process payment + send confirmation (all must succeed or all fail) |
| **Third-party integrations** | Stripe payments, SMS via Twilio, email via Resend, AI via OpenAI |
| **Webhook handlers** | Stripe payment confirmation, calendar sync callbacks |
| **Elevated privileges** | Admin operations on other users' data (use sparingly — see warnings below) |
| **Heavy computation** | PDF generation, image processing, analytics aggregation |

### Decision Framework

```
Do I need an API route / server action?

Is this a simple CRUD operation?
├── YES → Use direct Supabase access with RLS
└── NO  → Continue...

Does it involve external services (payments, SMS, etc.)?
├── YES → Use server action or API route
└── NO  → Continue...

Does it require multiple operations that must all succeed?
├── YES → Use server action with transaction
└── NO  → Continue...

Does it need to bypass RLS (admin override)?
├── YES → Use server action with admin client (see warnings)
└── NO  → Use direct Supabase access with RLS
```

---

## Benefits of This Approach

### 1. Security by Default
- RLS policies are enforced for **every** query
- Even if frontend code has bugs, the database protects the data
- No way to accidentally skip an authorization check

### 2. Less Code, Fewer Bugs
- ~80% reduction in boilerplate code
- Single source of truth for access rules
- Changes to permissions = one SQL file

### 3. Real-Time Capabilities
- Supabase Realtime works with RLS
- Live updates respect the same security rules
- No additional auth code for WebSockets

### 4. Consistent Access Control
- Same rules whether accessed from web, mobile, or admin tools
- API routes, direct access, and dashboards all follow the same policies

### 5. Faster Development
- Focus on UI and business logic
- Skip writing repetitive API endpoints
- Database handles the heavy lifting
