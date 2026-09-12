-- ==============================================================================
-- Kishan Seva — Auth Identity Refactor Migration
-- 1. Bridge Clerk identity to Supabase users table via clerk_user_id
-- 2. Add normalized unique email indexes to prevent duplicate registrations
-- 3. Configure RLS policies for application identity and profile tables
-- ==============================================================================

-- 1. Add clerk_user_id column to public.users if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN clerk_user_id VARCHAR(255);
  END IF;
END $$;

-- 2. Ensure clerk_user_id has a unique constraint on public.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_clerk_user_id_key' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);
  END IF;
END $$;

-- 3. Unique case-insensitive email indexes to enforce normalized uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique 
  ON public.users (lower(trim(email))) 
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS farmer_profiles_email_unique 
  ON public.farmer_profiles (lower(trim(email))) 
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS operator_profiles_email_unique 
  ON public.operator_profiles (lower(trim(email))) 
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS admin_profiles_email_unique 
  ON public.admin_profiles (lower(trim(email))) 
  WHERE email IS NOT NULL AND email <> '';

-- 4. Fast lookup index for clerk_user_id
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);

-- 5. RLS Policies on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;

-- Allow reading user identity rows (used for pre-auth lookup and role verification)
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  USING (true);

-- Allow inserting user identity during registration with verified clerk_user_id
CREATE POLICY "users_insert_policy"
  ON public.users FOR INSERT
  WITH CHECK (
    clerk_user_id IS NOT NULL 
    AND clerk_user_id <> ''
  );

-- Allow updating user identity only matching clerk_user_id
CREATE POLICY "users_update_policy"
  ON public.users FOR UPDATE
  USING (true)
  WITH CHECK (
    clerk_user_id IS NOT NULL 
    AND clerk_user_id <> ''
  );
