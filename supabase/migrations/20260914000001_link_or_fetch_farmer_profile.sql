-- ==============================================================================
-- Kishan Seva — Robust Farmer Profile Lookup and Auto-Linking RPC
-- Migration: 20260914000001_link_or_fetch_farmer_profile.sql
--
-- CONTEXT:
--   When an existing farmer logs in via Clerk Email OTP, their Clerk session is
--   established, but:
--   1. The Clerk JWT may not yet be verified/injected into the Supabase client
--   2. The farmer's record in farmer_profiles may have clerk_user_id as 'pending-...'
--      or unlinked from a previous session.
--   3. Direct SELECT on farmer_profiles is blocked by RLS for unauthenticated /
--      unlinked callers.
--
--   This migration provides a SECURITY DEFINER RPC to:
--   - Find an existing farmer profile by clerk_user_id OR email (case-insensitive)
--   - Automatically link the clerk_user_id if provided
--   - Return the complete farmer profile JSONB in a single atomic call
-- ==============================================================================

DROP FUNCTION IF EXISTS public.link_or_fetch_farmer_profile(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.link_or_fetch_farmer_profile(
  p_email TEXT DEFAULT NULL,
  p_clerk_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile JSONB;
  v_id UUID;
  v_clean_email TEXT;
  v_clean_clerk_id TEXT;
BEGIN
  v_clean_email := NULLIF(lower(trim(p_email)), '');
  v_clean_clerk_id := NULLIF(trim(p_clerk_user_id), '');

  IF v_clean_email IS NULL AND v_clean_clerk_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Try finding profile by clerk_user_id first
  IF v_clean_clerk_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.farmer_profiles
    WHERE clerk_user_id = v_clean_clerk_id
    LIMIT 1;
  END IF;

  -- 2. If not found by clerk_user_id, try finding by normalized email
  IF v_id IS NULL AND v_clean_email IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.farmer_profiles
    WHERE lower(email) = v_clean_email
    LIMIT 1;

    -- If found and clerk_user_id was supplied, auto-link it!
    IF v_id IS NOT NULL AND v_clean_clerk_id IS NOT NULL THEN
      UPDATE public.farmer_profiles
      SET clerk_user_id = v_clean_clerk_id,
          role = 'FARMER',
          updated_at = NOW()
      WHERE id = v_id;

      -- Also sync public.users identity table
      BEGIN
        INSERT INTO public.users (clerk_user_id, email, role, status, updated_at)
        VALUES (v_clean_clerk_id, v_clean_email, 'FARMER', 'ACTIVE', NOW())
        ON CONFLICT (clerk_user_id) DO UPDATE
          SET email = EXCLUDED.email,
              role = 'FARMER',
              updated_at = NOW();
      EXCEPTION WHEN OTHERS THEN
        -- Ignore conflict or foreign key quirks
        NULL;
      END;
    END IF;
  END IF;

  -- 3. If profile exists, return row as JSONB
  IF v_id IS NOT NULL THEN
    SELECT row_to_json(fp)::jsonb INTO v_profile
    FROM public.farmer_profiles fp
    WHERE fp.id = v_id;

    RETURN v_profile;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_or_fetch_farmer_profile(TEXT, TEXT) TO anon, authenticated;

-- Also update link_farmer_profile to be robust and handle pending clerk_user_id
CREATE OR REPLACE FUNCTION public.link_farmer_profile(
  p_email TEXT,
  p_clerk_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT;
  v_clean_clerk_id TEXT;
BEGIN
  v_clean_email := NULLIF(lower(trim(p_email)), '');
  v_clean_clerk_id := NULLIF(trim(p_clerk_user_id), '');

  IF v_clean_email IS NULL OR v_clean_clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.farmer_profiles
  SET clerk_user_id = v_clean_clerk_id,
      role = 'FARMER',
      updated_at = NOW()
  WHERE lower(trim(email)) = v_clean_email;

  -- Also sync users table
  BEGIN
    INSERT INTO public.users (clerk_user_id, email, role, status, updated_at)
    VALUES (v_clean_clerk_id, v_clean_email, 'FARMER', 'ACTIVE', NOW())
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET email = EXCLUDED.email,
          role = 'FARMER',
          updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_farmer_profile(TEXT, TEXT) TO anon, authenticated;
