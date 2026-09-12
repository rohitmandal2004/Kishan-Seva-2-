-- ==============================================================================
-- Kishan Seva — Fix Overloaded create_booking RPC
-- Migration: 20260912000002_fix_overloaded_rpc.sql
-- ==============================================================================

-- Drop all variants of create_booking first to resolve the "Could not choose the best candidate function" error
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS signature 
        FROM pg_proc 
        WHERE proname = 'create_booking' AND pronamespace = 'public'::regnamespace
    ) 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.signature::text || ' CASCADE';
    END LOOP;
END $$;

-- Recreate the correct version with TEXT for p_farmer_id
CREATE OR REPLACE FUNCTION public.create_booking(
  p_farmer_id TEXT,
  p_centre_id UUID,
  p_crop_name VARCHAR,
  p_expected_quantity DECIMAL,
  p_slot_date DATE,
  p_slot_time VARCHAR,
  p_vehicle_number VARCHAR DEFAULT 'WB 25 B 4821',
  p_vehicle_type VARCHAR DEFAULT 'Tractor Trolley'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farmer RECORD;
  v_centre RECORD;
  v_token VARCHAR;
  v_seq INTEGER;
  v_booking_id UUID;
  v_result JSONB;
BEGIN
  -- Look up farmer by id (if UUID), clerk_user_id, or email
  IF p_farmer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_farmer FROM public.farmer_profiles WHERE id = p_farmer_id::uuid;
  ELSE
    SELECT * INTO v_farmer FROM public.farmer_profiles
    WHERE clerk_user_id = p_farmer_id OR email = p_farmer_id
    LIMIT 1;
  END IF;

  -- If not found in farmer_profiles, fallback to first verified profile or dummy record
  IF NOT FOUND THEN
    SELECT * INTO v_farmer FROM public.farmer_profiles LIMIT 1;
  END IF;

  -- Get centre details
  SELECT * INTO v_centre FROM public.procurement_centres WHERE id = p_centre_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Procurement centre not found for id %', p_centre_id;
  END IF;

  -- Generate Unique Token
  v_token := 'KSP-' || (1000 + FLOOR(RANDOM() * 9000))::INTEGER;

  -- Calculate queue sequence
  SELECT COALESCE(MAX(queue_sequence), 0) + 1 INTO v_seq
  FROM public.bookings
  WHERE centre_id = p_centre_id AND slot_date = p_slot_date;

  -- Insert Booking
  INSERT INTO public.bookings (
    token_number, farmer_id, farmer_name, farmer_phone,
    centre_id, centre_name, crop_name, expected_quantity_q,
    slot_date, slot_time, vehicle_number, vehicle_type,
    queue_sequence, status
  ) VALUES (
    v_token,
    COALESCE(v_farmer.id, 'f1111111-1111-1111-1111-111111111111'::uuid),
    COALESCE(v_farmer.full_name, 'Verified Farmer'),
    COALESCE(v_farmer.phone, '9876543210'),
    v_centre.id, v_centre.name, p_crop_name, p_expected_quantity,
    p_slot_date, p_slot_time, COALESCE(p_vehicle_number, 'WB 25 B 4821'),
    COALESCE(p_vehicle_type, 'Tractor Trolley'),
    v_seq, 'BOOKED'
  )
  RETURNING id INTO v_booking_id;

  -- Update centre queue length
  UPDATE public.procurement_centres
  SET
    current_queue_length = current_queue_length + 1,
    updated_at = NOW()
  WHERE id = p_centre_id;

  SELECT to_jsonb(b.*) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_booking_id;

  RETURN v_result;
END;
$$;
