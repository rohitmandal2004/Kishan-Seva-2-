-- Migration: Securely link farmer profile via email

CREATE OR REPLACE FUNCTION public.link_farmer_profile(p_email TEXT, p_clerk_user_id TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
  -- Validate caller is the same as the requested clerk_user_id
  IF public.get_calling_clerk_id() IS NULL OR public.get_calling_clerk_id() != p_clerk_user_id THEN
    RETURN FALSE;
  END IF;

  UPDATE public.farmer_profiles
  SET clerk_user_id = p_clerk_user_id, role = 'FARMER'
  WHERE LOWER(email) = LOWER(p_email)
    AND (clerk_user_id IS NULL OR clerk_user_id = p_clerk_user_id);
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
