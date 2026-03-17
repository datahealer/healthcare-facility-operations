# Row Level Security: Deep Dive

> **RLS is non-negotiable.** Every table must have RLS enabled. Every query must go through RLS. The admin client must almost never be used. This document explains why and how.

---

## Why RLS is Critical

### Without RLS: One Mistake Exposes Everything

```typescript
// Developer A writes this correctly
const appointments = await db.query(
  'SELECT * FROM appointments WHERE doctor_id = $1',
  [currentUser.id]
);

// Developer B forgets the filter — SECURITY BREACH
const appointments = await db.query(
  'SELECT * FROM appointments'  // Returns ALL appointments!
);
```

Both queries compile. Both pass code review if the reviewer is tired. But Developer B just exposed every patient's appointment data.

### With RLS: The Database Protects You

```typescript
// Both queries are equally safe — RLS filters automatically
const { data } = await supabase.from('appointments').select('*');
// Only returns appointments the current user is allowed to see
```

**RLS makes it impossible to accidentally expose data.** The security is built into the database itself. Even if you write `SELECT * FROM appointments`, the database only returns rows the authenticated user is permitted to see.

---

## The `auth.uid()` Function

Every Supabase request includes a JWT token. The `auth.uid()` function extracts the user's ID from it:

```
┌──────────────────────────────────────────────────────────┐
│                      JWT TOKEN                            │
│  {                                                        │
│    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  ◄──┐ │
│    "email": "doctor@hospital.com",                     │ │
│    "role": "authenticated",                            │ │
│    "exp": 1699999999                                   │ │
│  }                                                     │ │
└────────────────────────────────────────────────────────│─┘
                                                         │
                    auth.uid() returns this value ───────┘
```

This is what makes RLS policies possible — the database always knows **who** is making the request.

---

## Policy Structure

```sql
CREATE POLICY policy_name
  ON table_name
  FOR operation    -- SELECT, INSERT, UPDATE, DELETE, or ALL
  TO role_name     -- Which database role (usually 'authenticated')
  USING (condition)        -- Filters EXISTING rows (SELECT, UPDATE, DELETE)
  WITH CHECK (condition);  -- Validates NEW/MODIFIED data (INSERT, UPDATE)
```

### `USING` vs `WITH CHECK`

| Clause | Used For | Purpose |
|--------|----------|---------|
| `USING` | SELECT, UPDATE, DELETE | Filters which **existing** rows can be accessed |
| `WITH CHECK` | INSERT, UPDATE | Validates **new/modified** data being written |

### Visual Explanation

**INSERT operation:**
```
New Row Data: { patient_id: 'user-456', ... }
                      │
                      ▼
WITH CHECK: patient_id = auth.uid()?
            'user-456' = 'user-123'?
                      │
                      ▼
                NO → INSERT BLOCKED

(Prevents a patient from creating an appointment under someone else's ID)
```

**UPDATE operation:**
```
Step 1: USING clause filters which rows you can see
        SELECT * WHERE doctor_id = auth.uid()
                      │
                      ▼
Step 2: WITH CHECK validates the updated data
        New values must ALSO satisfy the condition
```

**Example:**
```sql
-- Doctors can update their assigned appointments
CREATE POLICY "doctors_update_assigned"
  ON appointments FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())          -- Can only SEE rows they're assigned to
  WITH CHECK (doctor_id = auth.uid());    -- Cannot reassign to someone else
```

---

## How Multiple Policies Combine

When multiple policies exist for the same operation on the same table, they combine with **OR** logic:

```sql
-- Policy 1: Patients see own appointments
CREATE POLICY "p1" ON appointments FOR SELECT
  USING (patient_id = auth.uid());

-- Policy 2: Doctors see assigned appointments
CREATE POLICY "p2" ON appointments FOR SELECT
  USING (doctor_id = auth.uid());

-- Policy 3: Admins see all at their facility
CREATE POLICY "p3" ON appointments FOR SELECT
  USING (is_staff_at_facility(facility_id));
```

Effective result: `(patient_id = uid) OR (doctor_id = uid) OR (is_staff)`

```
┌─────────────────────────────────────────────────────┐
│           MULTIPLE POLICIES (OR Logic)               │
│                                                       │
│  Row accessible if ANY policy returns true:           │
│                                                       │
│     Policy 1: patient_id = auth.uid()  →  FALSE      │
│          OR                                           │
│     Policy 2: doctor_id = auth.uid()   →  TRUE       │
│          OR                                           │
│     Policy 3: is_staff                 →  FALSE      │
│                                                       │
│     Result: ROW IS ACCESSIBLE (at least one TRUE)    │
└─────────────────────────────────────────────────────┘
```

---

## Common RLS Patterns

### Pattern 1: Personal Data

```sql
-- User sees only their own data
CREATE POLICY "users_own_data"
  ON user_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Pattern 2: Team/Organization Membership

```sql
-- Users see data belonging to their team
CREATE POLICY "team_data"
  ON projects FOR SELECT
  TO authenticated
  USING (
    public.has_role_on_account(account_id)
  );
```

### Pattern 3: Hierarchical Access

```sql
-- Managers see their team's tasks
CREATE POLICY "managers_view_team"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()                    -- Own tasks
    OR created_by = auth.uid()                  -- Tasks they created
    OR EXISTS (                                  -- Tasks of their reports
      SELECT 1 FROM employees
      WHERE employees.id = tasks.assigned_to
        AND employees.manager_id = auth.uid()
    )
  );
```

### Pattern 4: Time-Based Access

```sql
-- Access expires after a date
CREATE POLICY "time_limited_access"
  ON shared_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = shared_documents.id
        AND document_shares.shared_with = auth.uid()
        AND document_shares.expires_at > NOW()
    )
  );
```

### Pattern 5: Status-Based Access

```sql
-- Published content is visible to all; drafts only to author
CREATE POLICY "published_public_drafts_private"
  ON articles FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR author_id = auth.uid()
  );
```

### Pattern 6: Permission-Based (RBAC)

```sql
-- Helper function
CREATE OR REPLACE FUNCTION has_role(org_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM roles
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role = required_role
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Only doctors can manage patient records
CREATE POLICY "doctors_manage_records"
  ON patient_records FOR ALL
  TO authenticated
  USING (has_role(organization_id, 'doctor'))
  WITH CHECK (has_role(organization_id, 'doctor'));
```

---

## Complete Healthcare Example

```sql
-- ============================================
-- TABLES
-- ============================================

CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist')),
  UNIQUE(user_id, facility_id)
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  medical_record_number TEXT UNIQUE
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES staff(id),
  facility_id UUID REFERENCES facilities(id),
  scheduled_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION is_staff_at_facility(fac_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid() AND facility_id = fac_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_staff_role(fac_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM staff
  WHERE user_id = auth.uid() AND facility_id = fac_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_patient_id()
RETURNS UUID AS $$
  SELECT id FROM patients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- POLICIES
-- ============================================

-- Facilities: Staff can see their facility
CREATE POLICY "staff_view_facility"
  ON facilities FOR SELECT TO authenticated
  USING (is_staff_at_facility(id));

-- Staff: Can see colleagues at same facility
CREATE POLICY "staff_view_colleagues"
  ON staff FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.user_id = auth.uid()
        AND s.facility_id = staff.facility_id
    )
  );

-- Patients: See own patient record
CREATE POLICY "patients_view_own"
  ON patients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Patients: Staff can see patients at their facility
CREATE POLICY "staff_view_patients"
  ON patients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN staff s ON s.facility_id = a.facility_id
      WHERE a.patient_id = patients.id
        AND s.user_id = auth.uid()
    )
  );

-- Appointments: Patients see their own
CREATE POLICY "patients_view_appointments"
  ON appointments FOR SELECT TO authenticated
  USING (patient_id = get_patient_id());

-- Appointments: Staff see their facility's
CREATE POLICY "staff_view_appointments"
  ON appointments FOR SELECT TO authenticated
  USING (is_staff_at_facility(facility_id));

-- Appointments: Only receptionists/admins can create
CREATE POLICY "reception_create_appointments"
  ON appointments FOR INSERT TO authenticated
  WITH CHECK (
    get_staff_role(facility_id) IN ('admin', 'receptionist')
  );

-- Appointments: Doctors can update their assigned
CREATE POLICY "doctors_update_appointments"
  ON appointments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = appointments.doctor_id
        AND staff.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = appointments.doctor_id
        AND staff.user_id = auth.uid()
    )
  );
```

---

## Why the Admin Client is Dangerous

The admin client (`getSupabaseServerAdminClient`) uses `SUPABASE_SERVICE_ROLE_KEY` and **completely bypasses RLS**. This means:

```typescript
// DANGEROUS — returns ALL rows from ALL accounts
const adminClient = getSupabaseServerAdminClient();
const { data } = await adminClient.from('appointments').select('*');
// ^^^ This returns EVERY appointment in the entire database
```

### The Rules

1. **NEVER use the admin client in server components or pages** — Use `getSupabaseServerClient()` instead, which respects RLS.

2. **NEVER use the admin client because "RLS is inconvenient"** — If RLS blocks your query, the answer is to fix the policy, not bypass it.

3. **NEVER expose the admin client to client components** — The service role key must never reach the browser.

4. **The only acceptable uses of the admin client:**
   - **Webhook handlers** — External services (Stripe, etc.) that don't have a user session
   - **Background jobs / cron tasks** — System-level operations with no user context
   - **Database seeding / admin scripts** — One-off operational tasks
   - **The embeddable widget API** — Anonymous visitors with no auth session (and even then, the API routes validate input strictly)

5. **When you do use it, always validate manually:**
   ```typescript
   // If using admin client, YOU are responsible for authorization
   const adminClient = getSupabaseServerAdminClient();

   // Manually verify the user has permission
   if (!userIsAuthorized) {
     throw new Error('Unauthorized');
   }

   // Only then execute the query
   const { data } = await adminClient.from('table').select('*');
   ```

### The Analogy

Think of RLS as a lock on every door in a building. The admin client is the master key that opens every door. You don't hand the master key to every employee — you give each person a key that only opens the doors they need. If someone needs access to a new room, you update their key (RLS policy), you don't give them the master key.

---

## Performance Considerations

### Index Columns Used in Policies

RLS policies are evaluated for **every row**. Without indexes, this means full table scans:

```sql
-- If your policy filters by patient_id, index it
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);

-- If your policy filters by organization_id, index it
CREATE INDEX idx_appointments_org_id ON appointments(organization_id);

-- Composite index for common query patterns
CREATE INDEX idx_appointments_doctor_date
  ON appointments(doctor_id, appointment_date);
```

### `SECURITY DEFINER` Functions

```sql
-- SECURITY DEFINER runs with the function CREATOR's permissions
-- This bypasses RLS for the function's internal queries
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**Why use it?** Without `SECURITY DEFINER`, the query inside the function would also be subject to RLS on `organization_members`, creating circular dependencies (you need to check membership to see data, but you need a policy to see membership).

**Use sparingly.** Only for helper functions that check membership/roles. Never for functions that return actual business data.

---

## Debugging RLS Policies

### Check Who You Are

```sql
SELECT auth.uid() AS current_user_id;
SELECT auth.jwt() AS full_jwt;
```

### Test as a Specific User (Supabase Studio)

```sql
-- Bypass RLS to see all data (admin only)
SET LOCAL ROLE postgres;
SELECT * FROM appointments;

-- Test what a specific user would see
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-123-uuid"}';
SELECT * FROM appointments;
```

You can also use Supabase Studio's **impersonation** feature to test as different users through the UI.

### View Existing Policies

```sql
SELECT
  policyname,
  cmd,
  qual,        -- USING clause
  with_check   -- WITH CHECK clause
FROM pg_policies
WHERE tablename = 'appointments';
```

---

## Security Checklist for Every New Table

- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] `REVOKE ALL ON ... FROM public, service_role;`
- [ ] `GRANT` only the specific operations needed to `authenticated`
- [ ] Create **separate policies** for SELECT, INSERT, UPDATE, DELETE (not `FOR ALL`)
- [ ] Test with the **wrong user** — ensure they see nothing
- [ ] Test with **no user** (anon) — ensure they see nothing
- [ ] Test with the **correct user** — ensure they see only their data
- [ ] Add **indexes** on columns referenced in policies
- [ ] Never use the admin client to "work around" a policy issue

---

## Summary

| Concept | Description |
|---------|-------------|
| **RLS** | Database-level security that filters rows automatically |
| **`auth.uid()`** | Returns current user's UUID from JWT |
| **`USING`** | Filters which existing rows can be accessed |
| **`WITH CHECK`** | Validates new/modified data being written |
| **Multiple policies** | Combined with OR logic for same operation |
| **`SECURITY DEFINER`** | Functions that run with creator's permissions (use sparingly) |
| **Admin client** | Bypasses all RLS — almost never the right choice |

**RLS shifts security from "hoping developers remember to filter" to "the database enforces it automatically."** This is not a convenience — it is a fundamental improvement in security architecture that eliminates an entire class of data exposure bugs.
