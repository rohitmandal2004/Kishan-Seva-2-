-- ==============================================================================
-- KISHAN SEVA — ADMIN FARMER APPROVAL RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.approve_farmer(p_farmer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verify admin status
  IF NOT public.is_admin_or_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can approve farmer profiles.';
  END IF;

  UPDATE public.farmer_profiles
  SET 
    verification_status = 'VERIFIED',
    updated_at = NOW()
  WHERE id = p_farmer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Farmer profile % not found', p_farmer_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Farmer approved successfully');
END;
$$;
