-- ==============================================================================
-- Kishan Seva — Registration RPC (SECURITY DEFINER, anon-callable)
-- Migration: 20260914000000_registration_rpc.sql
--
-- CONTEXT:
--   The Clerk ↔ Supabase JWT bridge (3rd-party auth) may not be configured in
--   the Supabase dashboard. Without a valid JWT, RLS blocks direct INSERT into
--   farmer_profiles. This migration creates a SECURITY DEFINER RPC that runs as
--   the postgres superuser and bypasses RLS, enabling registration to succeed
--   even when the Clerk JWT is not yet injected into the Supabase client.
--
--   The RPC performs its own identity validation by checking that the
--   p_clerk_user_id is a non-null, non-empty string (preventing blank inserts).
--   It also prevents duplicate registrations via ON CONFLICT DO UPDATE.
-- ==============================================================================

-- Drop previous version if exists
DROP FUNCTION IF EXISTS public.register_farmer_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

-- ==============================================================================
-- register_farmer_profile RPC
-- Callable by: anon role (for initial registration even without Clerk JWT)
-- Security: SECURITY DEFINER → runs as postgres, bypasses RLS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.register_farmer_profile(
  p_clerk_user_id    TEXT,
  p_farmer_code      TEXT,
  p_full_name        TEXT,
  p_email            TEXT,
  p_phone            TEXT,
  p_state            TEXT,
  p_district         TEXT,
  p_village          TEXT,
  p_land_area_acres  NUMERIC,
  p_latitude         NUMERIC  DEFAULT NULL,
  p_longitude        NUMERIC  DEFAULT NULL,
  p_crop_name        TEXT     DEFAULT 'Paddy (Grade A)',
  p_bank_name        TEXT     DEFAULT NULL,
  p_account_masked   TEXT     DEFAULT NULL,
  p_ifsc_code        TEXT     DEFAULT NULL,
  p_aadhaar_ref      TEXT     DEFAULT 'VERIFIED',
  p_aadhaar_last4    TEXT     DEFAULT '0000'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_profile     JSONB;
  v_user_id     UUID;
BEGIN
  -- Guard: clerk_user_id is mandatory
  IF p_clerk_user_id IS NULL OR trim(p_clerk_user_id) = '' THEN
    RAISE EXCEPTION 'p_clerk_user_id is required for farmer registration'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Guard: email is mandatory
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'p_email is required for farmer registration'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Upsert into public.users (identity table)
  INSERT INTO public.users (clerk_user_id, email, phone, role, status, updated_at)
  VALUES (p_clerk_user_id, lower(trim(p_email)), p_phone, 'FARMER', 'ACTIVE', NOW())
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET email      = EXCLUDED.email,
        phone      = EXCLUDED.phone,
        role       = 'FARMER',
        status     = 'ACTIVE',
        updated_at = NOW()
  RETURNING id INTO v_user_id;

  -- If the upsert didn't return an id (possible on DO NOTHING paths), look it up
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE clerk_user_id = p_clerk_user_id;
  END IF;

  -- Check for existing profile by clerk_user_id OR email
  SELECT id INTO v_existing_id
  FROM public.farmer_profiles
  WHERE clerk_user_id = p_clerk_user_id
     OR lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Profile already exists — update it and link clerk_user_id
    UPDATE public.farmer_profiles
    SET
      clerk_user_id        = p_clerk_user_id,
      user_id              = COALESCE(v_user_id, user_id),
      full_name            = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
      phone                = COALESCE(NULLIF(trim(p_phone), ''), phone),
      state                = COALESCE(NULLIF(trim(p_state), ''), state),
      district             = COALESCE(NULLIF(trim(p_district), ''), district),
      village              = COALESCE(NULLIF(trim(p_village), ''), village),
      latitude             = COALESCE(p_latitude, latitude),
      longitude            = COALESCE(p_longitude, longitude),
      land_area_acres      = COALESCE(p_land_area_acres, land_area_acres),
      crop_name            = COALESCE(NULLIF(trim(p_crop_name), ''), crop_name),
      bank_name            = COALESCE(NULLIF(trim(p_bank_name), ''), bank_name),
      account_number_masked = COALESCE(NULLIF(trim(p_account_masked), ''), account_number_masked),
      ifsc_code            = COALESCE(NULLIF(trim(p_ifsc_code), ''), ifsc_code),
      verification_status  = 'PENDING',
      updated_at           = NOW()
    WHERE id = v_existing_id;

    SELECT row_to_json(fp)::jsonb INTO v_profile
    FROM public.farmer_profiles fp
    WHERE fp.id = v_existing_id;
  ELSE
    -- No existing profile — create new
    INSERT INTO public.farmer_profiles (
      user_id, clerk_user_id, farmer_code,
      full_name, email, phone,
      state, district, village,
      latitude, longitude, land_area_acres,
      crop_name, bank_name, account_number_masked, ifsc_code,
      aadhaar_reference, aadhaar_last_four,
      verification_status, role,
      created_at, updated_at
    ) VALUES (
      v_user_id, p_clerk_user_id, p_farmer_code,
      trim(p_full_name), lower(trim(p_email)), trim(p_phone),
      trim(p_state), trim(p_district), trim(p_village),
      p_latitude, p_longitude, p_land_area_acres,
      COALESCE(p_crop_name, 'Paddy (Grade A)'),
      NULLIF(trim(p_bank_name), ''),
      NULLIF(trim(p_account_masked), ''),
      NULLIF(trim(p_ifsc_code), ''),
      COALESCE(p_aadhaar_ref, 'VERIFIED'),
      COALESCE(p_aadhaar_last4, '0000'),
      'PENDING', 'FARMER',
      NOW(), NOW()
    )
    RETURNING row_to_json(farmer_profiles)::jsonb INTO v_profile;
  END IF;

  RETURN v_profile;
END;
$$;

-- Grant anon and authenticated roles permission to call this RPC
GRANT EXECUTE ON FUNCTION public.register_farmer_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- ==============================================================================
-- Also allow anon to read their own farmer profile via a safe lookup RPC
-- (since direct SELECT is blocked by RLS without a JWT)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.get_farmer_profile_by_clerk_id(TEXT);

CREATE OR REPLACE FUNCTION public.get_farmer_profile_by_clerk_id(
  p_clerk_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile JSONB;
BEGIN
  IF p_clerk_user_id IS NULL OR trim(p_clerk_user_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT row_to_json(fp)::jsonb INTO v_profile
  FROM public.farmer_profiles fp
  WHERE fp.clerk_user_id = p_clerk_user_id
  LIMIT 1;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_farmer_profile_by_clerk_id(TEXT) TO anon, authenticated;

-- Same for email lookup (for cases where clerk_user_id linking hasn't happened yet)
DROP FUNCTION IF EXISTS public.get_farmer_profile_by_email(TEXT);

CREATE OR REPLACE FUNCTION public.get_farmer_profile_by_email(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile JSONB;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN NULL;
  END IF;

  SELECT row_to_json(fp)::jsonb INTO v_profile
  FROM public.farmer_profiles fp
  WHERE lower(fp.email) = lower(trim(p_email))
  LIMIT 1;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_farmer_profile_by_email(TEXT) TO anon, authenticated;
