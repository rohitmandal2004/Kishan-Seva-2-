-- ==============================================================================
-- KISHAN SEVA — LOCK DOWN public.users ROLE COLUMN
-- ==============================================================================

-- 1. Helper function to check if caller is an admin or service_role
CREATE OR REPLACE FUNCTION public.is_admin_or_service_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_jwt_role TEXT;
  v_clerk_id TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- If it's the service role bypassing RLS, allow it
  v_jwt_role := current_setting('request.jwt.claim.role', true);
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Otherwise check the clerk_user_id in the admin_profiles table
  v_clerk_id := current_setting('request.jwt.claims', true)::jsonb ->> 'sub';
  
  IF v_clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE clerk_user_id = v_clerk_id
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$;

-- 2. Trigger function to protect role updates
CREATE OR REPLACE FUNCTION public.protect_user_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Check if caller is authorized
    IF NOT public.is_admin_or_service_role() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles. Attempted to change role from % to %', OLD.role, NEW.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_protect_user_role_update ON public.users;
CREATE TRIGGER trg_protect_user_role_update
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_role_update();
