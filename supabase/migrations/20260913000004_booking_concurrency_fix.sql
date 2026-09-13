-- ==============================================================================
-- Kishan Seva - Booking Concurrency Fix
-- Migration: 20260913000004_booking_concurrency_fix.sql
-- ==============================================================================

-- 1. Add Unique Constraint on Queue Sequence
DO $$
BEGIN
    -- Fix any existing duplicate queue_sequence records before applying the unique constraint
    WITH resequenced AS (
      SELECT id, row_number() OVER (PARTITION BY centre_id, slot_date ORDER BY booked_at ASC, id ASC) as new_seq
      FROM public.bookings
    )
    UPDATE public.bookings b
    SET queue_sequence = r.new_seq
    FROM resequenced r
    WHERE b.id = r.id AND b.queue_sequence IS DISTINCT FROM r.new_seq;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'bookings_centre_date_seq_key'
    ) THEN
        ALTER TABLE public.bookings 
        ADD CONSTRAINT bookings_centre_date_seq_key UNIQUE (centre_id, slot_date, queue_sequence);
    END IF;
END $$;

-- 2. Drop existing create_booking to recreate with new logic
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

-- 3. Recreate create_booking with advisory locks, quota checking, and retry loops
CREATE OR REPLACE FUNCTION public.create_booking(
  p_farmer_id       TEXT,       -- Clerk user ID OR UUID of farmer_profiles row
  p_centre_id       UUID,
  p_crop_name       VARCHAR,
  p_expected_quantity DECIMAL,
  p_slot_date       DATE,
  p_slot_time       VARCHAR,
  p_vehicle_number  VARCHAR DEFAULT NULL,
  p_vehicle_type    VARCHAR DEFAULT 'Tractor Trolley'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farmer       RECORD;
  v_centre       RECORD;
  v_slot         RECORD;
  v_token        VARCHAR;
  v_seq          INTEGER;
  v_booking_id   UUID;
  v_result       JSONB;
  v_calling_clerk_id TEXT;
  v_start_time   TIME;
  v_inserted     BOOLEAN := false;
BEGIN
  -- Resolve the JWT caller (may be NULL for service_role internal calls)
  v_calling_clerk_id := public.get_calling_clerk_id();

  -- -------------------------------------------------------------------------
  -- Resolve farmer profile
  -- -------------------------------------------------------------------------
  IF p_farmer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_farmer FROM public.farmer_profiles WHERE id = p_farmer_id::uuid;
  ELSE
    SELECT * INTO v_farmer FROM public.farmer_profiles
    WHERE clerk_user_id = p_farmer_id OR lower(trim(email)) = lower(trim(p_farmer_id))
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Farmer profile not found for identity %. Register before booking.', p_farmer_id;
  END IF;

  -- -------------------------------------------------------------------------
  -- Identity verification
  -- -------------------------------------------------------------------------
  IF v_calling_clerk_id IS NOT NULL AND v_farmer.clerk_user_id IS NOT NULL THEN
    IF v_farmer.clerk_user_id <> v_calling_clerk_id THEN
      RAISE EXCEPTION 'Identity mismatch: JWT caller (%) does not own farmer profile (%). Booking rejected.', 
        v_calling_clerk_id, v_farmer.clerk_user_id;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- Concurrency Serialization
  -- -------------------------------------------------------------------------
  -- Obtain a transaction-level advisory lock using a hash of centre_id and slot_date
  -- This ensures concurrent requests for the same centre and date queue up here.
  PERFORM pg_advisory_xact_lock(hashtext(p_centre_id::text), hashtext(p_slot_date::text));

  -- -------------------------------------------------------------------------
  -- Resolve procurement centre
  -- -------------------------------------------------------------------------
  SELECT * INTO v_centre FROM public.procurement_centres WHERE id = p_centre_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Procurement centre not found for id %', p_centre_id;
  END IF;

  -- -------------------------------------------------------------------------
  -- Parse slot_time and handle public.slots quota
  -- -------------------------------------------------------------------------
  -- e.g., "09:00 AM - 10:00 AM" -> "09:00 AM" -> 09:00:00 time
  BEGIN
    v_start_time := trim(split_part(p_slot_time, '-', 1))::time;
  EXCEPTION WHEN OTHERS THEN
    v_start_time := '09:00:00'::time;
  END;

  SELECT * INTO v_slot FROM public.slots 
  WHERE centre_id = p_centre_id AND slot_date = p_slot_date AND start_time = v_start_time
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create slot for development/testing if missing
    INSERT INTO public.slots (centre_id, slot_date, start_time, end_time, capacity, booked_count)
    VALUES (p_centre_id, p_slot_date, v_start_time, v_start_time + interval '1 hour', 20, 0)
    RETURNING * INTO v_slot;
  END IF;

  -- Check Quota
  IF v_slot.booked_count >= v_slot.capacity THEN
    RAISE EXCEPTION 'Slot is full (capacity: %). Please select another slot.', v_slot.capacity;
  END IF;

  -- Update Slot Quota
  UPDATE public.slots 
  SET booked_count = booked_count + 1 
  WHERE id = v_slot.id;

  -- -------------------------------------------------------------------------
  -- Generate Sequence and Unique Token
  -- -------------------------------------------------------------------------
  SELECT COALESCE(MAX(queue_sequence), 0) + 1 INTO v_seq
  FROM public.bookings
  WHERE centre_id = p_centre_id AND slot_date = p_slot_date;

  -- Retry loop for token_number generation in case of unique constraint collisions
  FOR i IN 1..3 LOOP
    BEGIN
      v_token := 'KSP-' || (1000 + FLOOR(RANDOM() * 9000))::INTEGER;
      
      INSERT INTO public.bookings (
        token_number, farmer_id, farmer_name, farmer_phone,
        centre_id, centre_name, crop_name, expected_quantity_q,
        slot_id, slot_date, slot_time, vehicle_number, vehicle_type,
        queue_sequence, status
      ) VALUES (
        v_token,
        v_farmer.id,
        COALESCE(v_farmer.full_name, 'Verified Farmer'),
        COALESCE(v_farmer.phone, '9876543210'),
        v_centre.id, v_centre.name, p_crop_name, p_expected_quantity,
        v_slot.id, p_slot_date, p_slot_time,
        COALESCE(p_vehicle_number, 'WB 25 B 4821'),
        COALESCE(p_vehicle_type, 'Tractor Trolley'),
        v_seq, 'BOOKED'
      )
      RETURNING id INTO v_booking_id;
      
      v_inserted := true;
      EXIT; -- Success, break out of retry loop
    EXCEPTION 
      WHEN unique_violation THEN
        -- If it's a token collision, we just retry. If it's the queue_sequence, 
        -- the advisory lock should have prevented it. If it still happens, 
        -- recompute sequence and retry token.
        SELECT COALESCE(MAX(queue_sequence), 0) + 1 INTO v_seq
        FROM public.bookings
        WHERE centre_id = p_centre_id AND slot_date = p_slot_date;
        CONTINUE;
    END;
  END LOOP;

  IF NOT v_inserted THEN
    RAISE EXCEPTION 'Failed to generate unique token or sequence after 3 attempts';
  END IF;

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
