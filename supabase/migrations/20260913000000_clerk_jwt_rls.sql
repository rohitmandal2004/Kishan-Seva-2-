-- ==============================================================================
-- Kishan Seva — Clerk JWT ↔ Supabase RLS Fix
-- Migration: 20260913000000_clerk_jwt_rls.sql
--
-- PREREQUISITE (manual, done once in Dashboard):
--   1. Supabase Dashboard → Authentication → Sign In / Up → Third-party Auth
--      → Add provider → Clerk → enter your Clerk Frontend API URL
--   2. Clerk Dashboard → JWT Templates → create template named "supabase"
--      with claims: { "sub": "{{user.id}}", "role": "authenticated" }
--
-- This migration replaces all auth.uid()-based RLS policies (which always
-- returned NULL for Clerk users) with policies that read the Clerk user ID
-- from auth.jwt() ->> 'sub' — the standard JWT subject claim.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- Helper: get_calling_clerk_id()
-- Returns the Clerk user ID embedded in the JWT subject claim, or NULL when
-- called without a valid Clerk JWT (e.g. from service_role or anon w/o auth).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_calling_clerk_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '');
$$;

-- ==============================================================================
-- 1. public.users — drop broken policies, replace with Clerk-aware versions
-- ==============================================================================

-- Ensure clerk_user_id exists on public.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN clerk_user_id VARCHAR(255) UNIQUE;
  END IF;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_policy"  ON public.users;
DROP POLICY IF EXISTS "users_insert_policy"  ON public.users;
DROP POLICY IF EXISTS "users_update_policy"  ON public.users;

-- Owner reads own full row; service_role bypasses RLS automatically
CREATE POLICY "users_owner_select"
  ON public.users FOR SELECT
  USING (
    clerk_user_id = public.get_calling_clerk_id()
    -- allow pre-auth email checks (no token yet) for anon pre-flight lookups:
    -- these go through SECURITY DEFINER RPCs, not direct table access, so
    -- locking this down fully is safe.
  );

-- Insert: only if the clerk_user_id in the row matches the JWT sub
CREATE POLICY "users_owner_insert"
  ON public.users FOR INSERT
  WITH CHECK (
    clerk_user_id IS NOT NULL
    AND clerk_user_id <> ''
    AND clerk_user_id = public.get_calling_clerk_id()
  );

-- Update: caller must own the row AND cannot change clerk_user_id to a
-- different value (preventing privilege escalation).
CREATE POLICY "users_owner_update"
  ON public.users FOR UPDATE
  USING (
    clerk_user_id = public.get_calling_clerk_id()
  )
  WITH CHECK (
    clerk_user_id IS NOT NULL
    AND clerk_user_id <> ''
    AND clerk_user_id = public.get_calling_clerk_id()
  );

-- ==============================================================================
-- 2. farmer_profiles — drop ALL existing policies, replace with Clerk-aware
-- ==============================================================================

-- Ensure clerk_user_id exists on public.farmer_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farmer_profiles' AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE public.farmer_profiles ADD COLUMN clerk_user_id VARCHAR(255) UNIQUE;
  END IF;
END $$;

ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop every policy that might exist across all previous migrations
DROP POLICY IF EXISTS "All farmer profiles"                     ON public.farmer_profiles;
DROP POLICY IF EXISTS "farmer_profiles_select"                  ON public.farmer_profiles;
DROP POLICY IF EXISTS "farmer_profiles_insert"                  ON public.farmer_profiles;
DROP POLICY IF EXISTS "farmer_profiles_update"                  ON public.farmer_profiles;
DROP POLICY IF EXISTS "farmer_profiles_delete"                  ON public.farmer_profiles;
DROP POLICY IF EXISTS "Farmers can view their own profile"      ON public.farmer_profiles;
DROP POLICY IF EXISTS "Farmers can update their own profile"    ON public.farmer_profiles;
DROP POLICY IF EXISTS "Admins can view all farmer profiles"     ON public.farmer_profiles;

-- SELECT: farmer sees own profile; operators/admins read via SECURITY DEFINER RPCs.
-- We allow a narrow "own row" read policy; operator/admin reads go through RPCs.
CREATE POLICY "farmer_profiles_own_select"
  ON public.farmer_profiles FOR SELECT
  USING (
    clerk_user_id = public.get_calling_clerk_id()
    -- Operators/admins access farmer data only through SECURITY DEFINER functions.
    -- Direct SELECT from an operator/admin Clerk session is NOT granted here;
    -- those roles call RPCs which run as SECURITY DEFINER.
  );

-- INSERT: caller's JWT sub must match the clerk_user_id being inserted
CREATE POLICY "farmer_profiles_own_insert"
  ON public.farmer_profiles FOR INSERT
  WITH CHECK (
    clerk_user_id IS NOT NULL
    AND clerk_user_id <> ''
    AND clerk_user_id = public.get_calling_clerk_id()
  );

-- UPDATE: caller owns the row, cannot hijack another farmer's profile
CREATE POLICY "farmer_profiles_own_update"
  ON public.farmer_profiles FOR UPDATE
  USING (
    clerk_user_id = public.get_calling_clerk_id()
  )
  WITH CHECK (
    clerk_user_id IS NOT NULL
    AND clerk_user_id <> ''
    AND clerk_user_id = public.get_calling_clerk_id()
  );

-- DELETE: permanently blocked for all non-service_role callers
CREATE POLICY "farmer_profiles_no_delete"
  ON public.farmer_profiles FOR DELETE
  USING (false);

-- ==============================================================================
-- 3. bookings — replace wide-open USING(true) policies
-- ==============================================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_all_read         ON public.bookings;
DROP POLICY IF EXISTS bookings_all_insert        ON public.bookings;
DROP POLICY IF EXISTS bookings_all_update        ON public.bookings;
DROP POLICY IF EXISTS "Farmers can view own bookings"     ON public.bookings;
DROP POLICY IF EXISTS "Operators can view centre bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings"      ON public.bookings;

-- Farmer sees own bookings (matched via farmer_profiles.clerk_user_id)
CREATE POLICY "bookings_farmer_select"
  ON public.bookings FOR SELECT
  USING (
    farmer_id IN (
      SELECT id FROM public.farmer_profiles
      WHERE clerk_user_id = public.get_calling_clerk_id()
    )
  );

-- Operator sees bookings for their centre
CREATE POLICY "bookings_operator_select"
  ON public.bookings FOR SELECT
  USING (
    centre_id IN (
      SELECT centre_id FROM public.operator_profiles
      WHERE clerk_user_id = public.get_calling_clerk_id()
    )
  );

-- Admin sees all bookings (via admin_profiles)
CREATE POLICY "bookings_admin_select"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE clerk_user_id = public.get_calling_clerk_id()
    )
  );

-- INSERT/UPDATE only via SECURITY DEFINER RPCs (no direct client mutations)
-- The RPCs run as the postgres role and bypass RLS, so we deny direct DML.
CREATE POLICY "bookings_rpc_insert"
  ON public.bookings FOR INSERT
  WITH CHECK (false);  -- All inserts go through create_booking() SECURITY DEFINER

CREATE POLICY "bookings_rpc_update"
  ON public.bookings FOR UPDATE
  USING (false);  -- All updates go through submit_weighment_transaction() etc.

-- ==============================================================================
-- 4. queue_events — Clerk-aware policies
-- ==============================================================================
ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can view own queue events"      ON public.queue_events;
DROP POLICY IF EXISTS "Operators can insert queue events"      ON public.queue_events;
DROP POLICY IF EXISTS "Operators can view centre queue events" ON public.queue_events;

CREATE POLICY "queue_events_farmer_select"
  ON public.queue_events FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE farmer_id IN (
        SELECT id FROM public.farmer_profiles
        WHERE clerk_user_id = public.get_calling_clerk_id()
      )
    )
  );

CREATE POLICY "queue_events_operator_select"
  ON public.queue_events FOR SELECT
  USING (
    centre_id IN (
      SELECT centre_id FROM public.operator_profiles
      WHERE clerk_user_id = public.get_calling_clerk_id()
    )
  );

CREATE POLICY "queue_events_operator_insert"
  ON public.queue_events FOR INSERT
  WITH CHECK (
    centre_id IN (
      SELECT centre_id FROM public.operator_profiles
      WHERE clerk_user_id = public.get_calling_clerk_id()
    )
  );

-- ==============================================================================
-- 5. quality_checks + weighments — Clerk-aware policies
-- ==============================================================================
ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weighments     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can view own quality checks" ON public.quality_checks;
DROP POLICY IF EXISTS "Operators can manage quality checks" ON public.quality_checks;

CREATE POLICY "quality_checks_farmer_select"
  ON public.quality_checks FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE farmer_id IN (
        SELECT id FROM public.farmer_profiles
        WHERE clerk_user_id = public.get_calling_clerk_id()
      )
    )
  );

-- Operators INSERT/UPDATE quality_checks via submit_weighment_transaction (SECURITY DEFINER).
-- Direct DML from the client is blocked; the SECURITY DEFINER function handles it.
CREATE POLICY "quality_checks_rpc_only"
  ON public.quality_checks FOR ALL
  USING (false)
  WITH CHECK (false);

-- Weighments: same pattern — farmer reads own, mutations only via RPC
CREATE POLICY "weighments_farmer_select"
  ON public.weighments FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE farmer_id IN (
        SELECT id FROM public.farmer_profiles
        WHERE clerk_user_id = public.get_calling_clerk_id()
      )
    )
  );

CREATE POLICY "weighments_rpc_only"
  ON public.weighments FOR ALL
  USING (false)
  WITH CHECK (false);

-- ==============================================================================
-- 6. Grant EXECUTE on new helper function to authenticated + anon roles
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.get_calling_clerk_id() TO anon, authenticated;
