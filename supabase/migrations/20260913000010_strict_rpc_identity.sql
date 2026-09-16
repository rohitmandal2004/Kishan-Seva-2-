-- ==============================================================================
-- KISHAN SEVA — STRICT RPC IDENTITY FIXES
-- ==============================================================================

-- 1. create_booking
CREATE OR REPLACE FUNCTION public.create_booking(
  p_farmer_id       TEXT,
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
  v_calling_clerk_id := public.get_calling_clerk_id();

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

  IF v_farmer.clerk_user_id IS NULL THEN
    RAISE EXCEPTION 'Identity bypass rejected: farmer profile lacks a clerk_user_id.';
  END IF;

  IF NOT public.is_admin_or_service_role() THEN
    IF v_calling_clerk_id IS NULL OR v_farmer.clerk_user_id <> v_calling_clerk_id THEN
      RAISE EXCEPTION 'Identity mismatch: JWT caller (%) does not own farmer profile (%). Booking rejected.', 
        COALESCE(v_calling_clerk_id, 'NULL'), v_farmer.clerk_user_id;
    END IF;
  END IF;

  -- Advisory lock for concurrency
  PERFORM pg_advisory_xact_lock(hashtext(p_centre_id::text), hashtext(p_slot_date::text));

  SELECT * INTO v_centre FROM public.procurement_centres WHERE id = p_centre_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Procurement centre not found for id %', p_centre_id;
  END IF;

  BEGIN
    v_start_time := trim(split_part(p_slot_time, '-', 1))::time;
  EXCEPTION WHEN OTHERS THEN
    v_start_time := '09:00:00'::time;
  END;

  SELECT * INTO v_slot FROM public.slots 
  WHERE centre_id = p_centre_id AND slot_date = p_slot_date AND start_time = v_start_time
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.slots (centre_id, slot_date, start_time, end_time, capacity, booked_count)
    VALUES (p_centre_id, p_slot_date, v_start_time, v_start_time + interval '1 hour', 20, 0)
    RETURNING * INTO v_slot;
  END IF;

  IF v_slot.booked_count >= v_slot.capacity THEN
    RAISE EXCEPTION 'Slot is full (capacity: %). Please select another slot.', v_slot.capacity;
  END IF;

  UPDATE public.slots 
  SET booked_count = booked_count + 1 
  WHERE id = v_slot.id;

  SELECT COALESCE(MAX(queue_sequence), 0) + 1 INTO v_seq
  FROM public.bookings
  WHERE centre_id = p_centre_id AND slot_date = p_slot_date;

  FOR i IN 1..3 LOOP
    BEGIN
      v_token := 'KSP-' || (1000 + FLOOR(RANDOM() * 9000))::INTEGER;
      
      INSERT INTO public.bookings (
        token_number, farmer_id, farmer_name, farmer_phone,
        centre_id, centre_name, crop_name, expected_quantity_q,
        slot_id, slot_date, slot_time, vehicle_number, vehicle_type,
        queue_sequence, status
      ) VALUES (
        v_token, v_farmer.id, COALESCE(v_farmer.full_name, 'Verified Farmer'),
        COALESCE(v_farmer.phone, '9876543210'), v_centre.id, v_centre.name, p_crop_name, p_expected_quantity,
        v_slot.id, p_slot_date, p_slot_time, COALESCE(p_vehicle_number, 'WB 25 B 4821'),
        COALESCE(p_vehicle_type, 'Tractor Trolley'), v_seq, 'BOOKED'
      ) RETURNING id INTO v_booking_id;
      
      v_inserted := true;
      EXIT;
    EXCEPTION 
      WHEN unique_violation THEN
        SELECT COALESCE(MAX(queue_sequence), 0) + 1 INTO v_seq
        FROM public.bookings
        WHERE centre_id = p_centre_id AND slot_date = p_slot_date;
        CONTINUE;
    END;
  END LOOP;

  IF NOT v_inserted THEN
    RAISE EXCEPTION 'Failed to generate unique token or sequence after 3 attempts';
  END IF;

  UPDATE public.procurement_centres
  SET current_queue_length = current_queue_length + 1, updated_at = NOW()
  WHERE id = p_centre_id;

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = v_booking_id;
  RETURN v_result;
END;
$$;


-- 2. postpone_booking
CREATE OR REPLACE FUNCTION public.postpone_booking(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking          public.bookings%ROWTYPE;
  v_farmer           public.farmer_profiles%ROWTYPE;
  v_calling_clerk_id TEXT;
BEGIN
  v_calling_clerk_id := public.get_calling_clerk_id();

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  SELECT * INTO v_farmer FROM public.farmer_profiles WHERE id = v_booking.farmer_id;

  IF v_farmer.clerk_user_id IS NULL THEN
    RAISE EXCEPTION 'Identity bypass rejected: farmer profile lacks a clerk_user_id.';
  END IF;

  IF NOT public.is_admin_or_service_role() THEN
    IF v_calling_clerk_id IS NULL OR v_farmer.clerk_user_id <> v_calling_clerk_id THEN
      RAISE EXCEPTION 'Identity mismatch: JWT caller (%) does not own booking %', 
        COALESCE(v_calling_clerk_id, 'NULL'), p_booking_id;
    END IF;
  END IF;

  IF v_booking.status != 'BOOKED' THEN
    RAISE EXCEPTION 'Only BOOKED slots can be postponed. Current status: %', v_booking.status;
  END IF;

  UPDATE public.procurement_centres
  SET current_queue_length = GREATEST(0, current_queue_length - 1)
  WHERE id = v_booking.centre_id;

  UPDATE public.bookings
  SET
    status = 'CANCELLED',
    reschedule_deadline = NOW() + INTERVAL '7 days',
    updated_at = NOW(),
    queue_sequence = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'message', 'Booking postponed successfully');
END;
$$;


-- 3. reschedule_booking
CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_id     UUID,
  p_new_centre_id  UUID,
  p_new_slot_date  DATE,
  p_new_slot_time  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking            public.bookings%ROWTYPE;
  v_farmer             public.farmer_profiles%ROWTYPE;
  v_calling_clerk_id   TEXT;
  v_new_queue_sequence INTEGER;
BEGIN
  v_calling_clerk_id := public.get_calling_clerk_id();

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  SELECT * INTO v_farmer FROM public.farmer_profiles WHERE id = v_booking.farmer_id;

  IF v_farmer.clerk_user_id IS NULL THEN
    RAISE EXCEPTION 'Identity bypass rejected: farmer profile lacks a clerk_user_id.';
  END IF;

  IF NOT public.is_admin_or_service_role() THEN
    IF v_calling_clerk_id IS NULL OR v_farmer.clerk_user_id <> v_calling_clerk_id THEN
      RAISE EXCEPTION 'Identity mismatch: JWT caller (%) does not own booking %', 
        COALESCE(v_calling_clerk_id, 'NULL'), p_booking_id;
    END IF;
  END IF;

  IF v_booking.status != 'CANCELLED' OR v_booking.reschedule_deadline IS NULL THEN
    RAISE EXCEPTION 'Booking % is not eligible for rescheduling', p_booking_id;
  END IF;

  IF v_booking.reschedule_deadline < NOW() THEN
    RAISE EXCEPTION 'Reschedule deadline has passed for booking %', p_booking_id;
  END IF;

  UPDATE public.procurement_centres
  SET current_queue_length = current_queue_length + 1
  WHERE id = p_new_centre_id
  RETURNING current_queue_length INTO v_new_queue_sequence;

  UPDATE public.bookings
  SET
    status = 'BOOKED',
    centre_id = p_new_centre_id,
    slot_date = p_new_slot_date,
    slot_time = p_new_slot_time,
    queue_sequence = v_new_queue_sequence,
    reschedule_deadline = NULL,
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'new_queue_sequence', v_new_queue_sequence,
    'slot_date', p_new_slot_date,
    'slot_time', p_new_slot_time
  );
END;
$$;


-- 4. submit_weighment_transaction
CREATE OR REPLACE FUNCTION public.submit_weighment_transaction(
  p_booking_id               UUID,
  p_status                   TEXT,
  p_moisture_percent         DECIMAL DEFAULT NULL,
  p_foreign_matter_percent   DECIMAL DEFAULT NULL,
  p_broken_grain_percent     DECIMAL DEFAULT NULL,
  p_grade                    TEXT    DEFAULT NULL,
  p_inspector_name           TEXT    DEFAULT NULL,
  p_certificate_id           TEXT    DEFAULT NULL,
  p_rejection_reason         TEXT    DEFAULT NULL,
  p_gross_weight_q           DECIMAL DEFAULT NULL,
  p_tare_weight_q            DECIMAL DEFAULT NULL,
  p_net_weight_q             DECIMAL DEFAULT NULL,
  p_msp_rate_per_q           DECIMAL DEFAULT NULL,
  p_gross_amount             DECIMAL DEFAULT NULL,
  p_moisture_deduction       DECIMAL DEFAULT NULL,
  p_handling_charge          DECIMAL DEFAULT NULL,
  p_net_payable              DECIMAL DEFAULT NULL,
  p_slip_number              TEXT    DEFAULT NULL,
  p_weighbridge_operator     TEXT    DEFAULT NULL,
  p_dbt_status               TEXT    DEFAULT NULL,
  p_transaction_ref          TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status     TEXT;
  v_centre_id          UUID;
  v_calling_clerk_id   TEXT;
  v_is_operator        BOOLEAN;
BEGIN
  v_calling_clerk_id := public.get_calling_clerk_id();

  IF NOT public.is_admin_or_service_role() THEN
    IF v_calling_clerk_id IS NULL THEN
      RAISE EXCEPTION 'Identity bypass rejected: missing clerk_user_id.';
    END IF;
    
    SELECT EXISTS(
      SELECT 1 FROM public.operator_profiles
      WHERE clerk_user_id = v_calling_clerk_id
    ) INTO v_is_operator;

    IF NOT v_is_operator THEN
      RAISE EXCEPTION 'Unauthorized: Caller (%) is not a registered operator.', v_calling_clerk_id;
    END IF;
  END IF;

  SELECT status, centre_id INTO v_current_status, v_centre_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  IF v_current_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Booking % is already completed', p_booking_id;
  END IF;

  IF p_status = 'REJECTED' THEN
    UPDATE public.bookings
    SET 
      status = 'REJECTED',
      rejection_reason = p_rejection_reason,
      updated_at = NOW(),
      queue_sequence = NULL
    WHERE id = p_booking_id;

    UPDATE public.procurement_centres
    SET current_queue_length = GREATEST(0, current_queue_length - 1)
    WHERE id = v_centre_id;
    
    RETURN;
  END IF;

  -- Otherwise, it's a success
  UPDATE public.bookings
  SET 
    status = 'COMPLETED',
    queue_sequence = NULL,
    updated_at = NOW()
  WHERE id = p_booking_id;

  UPDATE public.procurement_centres
  SET current_queue_length = GREATEST(0, current_queue_length - 1)
  WHERE id = v_centre_id;

  INSERT INTO public.quality_checks (
    booking_id, inspector_name, moisture_percent, foreign_matter_percent,
    broken_grain_percent, grade, certificate_id, status
  ) VALUES (
    p_booking_id, p_inspector_name, p_moisture_percent, p_foreign_matter_percent,
    p_broken_grain_percent, p_grade, p_certificate_id, 'PASSED'
  );

  INSERT INTO public.weighments (
    booking_id, weighbridge_operator, gross_weight_q, tare_weight_q, net_weight_q, slip_number
  ) VALUES (
    p_booking_id, p_weighbridge_operator, p_gross_weight_q, p_tare_weight_q, p_net_weight_q, p_slip_number
  );

  INSERT INTO public.payments (
    booking_id, msp_rate_per_q, gross_amount, moisture_deduction, handling_charge, net_payable,
    dbt_status, transaction_ref
  ) VALUES (
    p_booking_id, p_msp_rate_per_q, p_gross_amount, p_moisture_deduction, p_handling_charge, p_net_payable,
    COALESCE(p_dbt_status, 'PENDING'), p_transaction_ref
  );
END;
$$;
