-- ==============================================================================
-- Kishan Seva — RPC Auth Hardening
-- Migration: 20260913000001_fix_rpc_auth.sql
--
-- Fixes:
--   1. create_booking: removes random LIMIT 1 fallback; verifies caller owns the
--      farmer identity (Clerk JWT sub must match farmer's clerk_user_id)
--   2. postpone_booking: adds ownership check before mutating the booking
--   3. reschedule_booking: same ownership check
--   4. submit_weighment_transaction: caller must be a registered operator
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. create_booking — hardened version
-- ---------------------------------------------------------------------------
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
  v_token        VARCHAR;
  v_seq          INTEGER;
  v_booking_id   UUID;
  v_result       JSONB;
  v_calling_clerk_id TEXT;
BEGIN
  -- Resolve the JWT caller (may be NULL for service_role internal calls)
  v_calling_clerk_id := public.get_calling_clerk_id();

  -- -------------------------------------------------------------------------
  -- Resolve farmer profile
  -- -------------------------------------------------------------------------
  IF p_farmer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- UUID path
    SELECT * INTO v_farmer FROM public.farmer_profiles WHERE id = p_farmer_id::uuid;
  ELSE
    -- Clerk user ID or email path
    SELECT * INTO v_farmer FROM public.farmer_profiles
    WHERE clerk_user_id = p_farmer_id OR lower(trim(email)) = lower(trim(p_farmer_id))
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Farmer profile not found for identity %. Register before booking.', p_farmer_id;
  END IF;

  -- -------------------------------------------------------------------------
  -- Identity verification: the JWT caller must own this farmer profile.
  -- Skip check only when called from service_role (v_calling_clerk_id IS NULL)
  -- or when the farmer profile has no clerk_user_id yet (legacy/seed data).
  -- -------------------------------------------------------------------------
  IF v_calling_clerk_id IS NOT NULL AND v_farmer.clerk_user_id IS NOT NULL THEN
    IF v_farmer.clerk_user_id <> v_calling_clerk_id THEN
      RAISE EXCEPTION 'Identity mismatch: JWT caller (%) does not own farmer profile (%). Booking rejected.', 
        v_calling_clerk_id, v_farmer.clerk_user_id;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- Resolve procurement centre (row-level lock prevents sequence races)
  -- -------------------------------------------------------------------------
  SELECT * INTO v_centre FROM public.procurement_centres WHERE id = p_centre_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Procurement centre not found for id %', p_centre_id;
  END IF;

  -- Generate unique token
  v_token := 'KSP-' || (1000 + FLOOR(RANDOM() * 9000))::INTEGER;

  -- Calculate queue sequence
  SELECT COALESCE(MAX(queue_sequence), 0) + 1 INTO v_seq
  FROM public.bookings
  WHERE centre_id = p_centre_id AND slot_date = p_slot_date;

  -- Insert booking
  INSERT INTO public.bookings (
    token_number, farmer_id, farmer_name, farmer_phone,
    centre_id, centre_name, crop_name, expected_quantity_q,
    slot_date, slot_time, vehicle_number, vehicle_type,
    queue_sequence, status
  ) VALUES (
    v_token,
    v_farmer.id,
    COALESCE(v_farmer.full_name, 'Verified Farmer'),
    COALESCE(v_farmer.phone, '9876543210'),
    v_centre.id, v_centre.name, p_crop_name, p_expected_quantity,
    p_slot_date, p_slot_time,
    COALESCE(p_vehicle_number, 'WB 25 B 4821'),
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

-- ---------------------------------------------------------------------------
-- 2. postpone_booking — add ownership check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.postpone_booking(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking          public.bookings%ROWTYPE;
  v_calling_clerk_id TEXT;
  v_owns_booking     BOOLEAN;
BEGIN
  v_calling_clerk_id := public.get_calling_clerk_id();

  -- Verify booking exists
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Ownership check: caller must own the farmer profile linked to this booking
  IF v_calling_clerk_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.farmer_profiles
      WHERE id = v_booking.farmer_id
        AND clerk_user_id = v_calling_clerk_id
    ) INTO v_owns_booking;

    IF NOT v_owns_booking THEN
      RAISE EXCEPTION 'Identity mismatch: caller (%) does not own booking %', 
        v_calling_clerk_id, p_booking_id;
    END IF;
  END IF;

  IF v_booking.status != 'BOOKED' THEN
    RAISE EXCEPTION 'Only BOOKED slots can be postponed. Current status: %', v_booking.status;
  END IF;

  -- Free up the queue space
  UPDATE public.procurement_centres
  SET current_queue_length = GREATEST(0, current_queue_length - 1)
  WHERE id = v_booking.centre_id;

  -- Cancel with 7-day grace period for rescheduling
  UPDATE public.bookings
  SET
    status = 'CANCELLED',
    reschedule_deadline = NOW() + INTERVAL '7 days',
    updated_at = NOW(),
    queue_sequence = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking postponed successfully'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. reschedule_booking — add ownership check
-- ---------------------------------------------------------------------------
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
  v_calling_clerk_id   TEXT;
  v_owns_booking       BOOLEAN;
  v_new_queue_sequence INTEGER;
BEGIN
  v_calling_clerk_id := public.get_calling_clerk_id();

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Ownership check
  IF v_calling_clerk_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.farmer_profiles
      WHERE id = v_booking.farmer_id
        AND clerk_user_id = v_calling_clerk_id
    ) INTO v_owns_booking;

    IF NOT v_owns_booking THEN
      RAISE EXCEPTION 'Identity mismatch: caller (%) does not own booking %', 
        v_calling_clerk_id, p_booking_id;
    END IF;
  END IF;

  IF v_booking.status != 'CANCELLED' OR v_booking.reschedule_deadline IS NULL THEN
    RAISE EXCEPTION 'Booking % is not eligible for rescheduling', p_booking_id;
  END IF;

  IF v_booking.reschedule_deadline < NOW() THEN
    RAISE EXCEPTION 'Reschedule deadline has passed for booking %', p_booking_id;
  END IF;

  -- Assign new queue sequence and update centre counter
  UPDATE public.procurement_centres
  SET current_queue_length = current_queue_length + 1
  WHERE id = p_new_centre_id
  RETURNING current_queue_length INTO v_new_queue_sequence;

  -- Reactivate booking at new slot
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

-- ---------------------------------------------------------------------------
-- 4. submit_weighment_transaction — add operator identity check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_weighment_transaction(
  p_booking_id               UUID,
  p_status                   TEXT,
  -- Quality check fields
  p_moisture_percent         DECIMAL DEFAULT NULL,
  p_foreign_matter_percent   DECIMAL DEFAULT NULL,
  p_broken_grain_percent     DECIMAL DEFAULT NULL,
  p_grade                    TEXT    DEFAULT NULL,
  p_inspector_name           TEXT    DEFAULT NULL,
  p_certificate_id           TEXT    DEFAULT NULL,
  p_rejection_reason         TEXT    DEFAULT NULL,
  -- Weighment fields
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

  -- Operator identity check: when called with a JWT, the caller must be a
  -- registered operator. Service_role calls (v_calling_clerk_id IS NULL) are
  -- allowed for internal use (e.g. admin scripts, migrations).
  IF v_calling_clerk_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.operator_profiles
      WHERE clerk_user_id = v_calling_clerk_id
    ) INTO v_is_operator;

    -- Also accept admin callers
    IF NOT v_is_operator THEN
      SELECT EXISTS(
        SELECT 1 FROM public.admin_profiles
        WHERE clerk_user_id = v_calling_clerk_id
      ) INTO v_is_operator;
    END IF;

    IF NOT v_is_operator THEN
      RAISE EXCEPTION 'Access denied: caller (%) is not a registered operator or admin', 
        v_calling_clerk_id;
    END IF;
  END IF;

  -- Validate booking exists
  SELECT status, centre_id INTO v_current_status, v_centre_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Prevent invalid backwards transitions
  IF v_current_status = 'COMPLETED' AND p_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Cannot change status of a completed booking (%)', p_booking_id;
  END IF;
  IF v_current_status = 'CANCELLED' AND p_status <> 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot change status of a cancelled booking (%)', p_booking_id;
  END IF;

  -- Update booking status
  UPDATE public.bookings
  SET
    status = p_status,
    checked_in_at = CASE
      WHEN p_status IN ('CHECKED_IN', 'QUALITY_TESTING', 'WEIGHMENT') AND checked_in_at IS NULL THEN NOW()
      ELSE checked_in_at
    END,
    completed_at  = CASE WHEN p_status = 'COMPLETED' THEN NOW() ELSE completed_at END,
    cancelled_at  = CASE WHEN p_status = 'CANCELLED' THEN NOW() ELSE cancelled_at END,
    updated_at    = NOW()
  WHERE id = p_booking_id;

  -- Upsert quality check if data provided
  IF p_moisture_percent IS NOT NULL AND p_certificate_id IS NOT NULL THEN
    INSERT INTO public.quality_checks (
      booking_id, moisture_percent, foreign_matter_percent,
      broken_grain_percent, grade, inspector_name, certificate_id,
      rejection_reason
    ) VALUES (
      p_booking_id, p_moisture_percent, COALESCE(p_foreign_matter_percent, 1.0),
      COALESCE(p_broken_grain_percent, 2.0), COALESCE(p_grade, 'Grade A'),
      COALESCE(p_inspector_name, 'Inspector'), p_certificate_id,
      p_rejection_reason
    )
    ON CONFLICT (booking_id)
    DO UPDATE SET
      moisture_percent         = EXCLUDED.moisture_percent,
      foreign_matter_percent   = EXCLUDED.foreign_matter_percent,
      broken_grain_percent     = EXCLUDED.broken_grain_percent,
      grade                    = EXCLUDED.grade,
      inspector_name           = EXCLUDED.inspector_name,
      certificate_id           = EXCLUDED.certificate_id,
      rejection_reason         = COALESCE(EXCLUDED.rejection_reason, public.quality_checks.rejection_reason);
  END IF;

  -- Upsert weighment if data provided
  IF p_gross_weight_q IS NOT NULL AND p_slip_number IS NOT NULL THEN
    INSERT INTO public.weighments (
      booking_id, gross_weight_q, tare_weight_q, net_weight_q,
      msp_rate_per_q, gross_amount, moisture_deduction, handling_charge,
      net_payable, slip_number, weighbridge_operator, dbt_status, transaction_ref
    ) VALUES (
      p_booking_id, p_gross_weight_q, p_tare_weight_q, p_net_weight_q,
      p_msp_rate_per_q, p_gross_amount, COALESCE(p_moisture_deduction, 0),
      COALESCE(p_handling_charge, 450), p_net_payable,
      p_slip_number, COALESCE(p_weighbridge_operator, 'Operator'),
      COALESCE(p_dbt_status, 'DISBURSED'), COALESCE(p_transaction_ref, '')
    )
    ON CONFLICT (booking_id)
    DO UPDATE SET
      gross_weight_q       = EXCLUDED.gross_weight_q,
      tare_weight_q        = EXCLUDED.tare_weight_q,
      net_weight_q         = EXCLUDED.net_weight_q,
      msp_rate_per_q       = EXCLUDED.msp_rate_per_q,
      gross_amount         = EXCLUDED.gross_amount,
      moisture_deduction   = EXCLUDED.moisture_deduction,
      handling_charge      = EXCLUDED.handling_charge,
      net_payable          = EXCLUDED.net_payable,
      slip_number          = EXCLUDED.slip_number,
      weighbridge_operator = EXCLUDED.weighbridge_operator,
      dbt_status           = EXCLUDED.dbt_status,
      transaction_ref      = EXCLUDED.transaction_ref;
  END IF;

  -- Update centre queue length on terminal states
  IF p_status IN ('COMPLETED', 'CANCELLED') AND v_centre_id IS NOT NULL THEN
    UPDATE public.procurement_centres
    SET
      current_queue_length = GREATEST(0, current_queue_length - 1),
      updated_at = NOW()
    WHERE id = v_centre_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grant execute on new/updated functions
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_booking(TEXT, UUID, VARCHAR, DECIMAL, DATE, VARCHAR, VARCHAR, VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.postpone_booking(UUID)                                                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(UUID, UUID, DATE, TEXT)                                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_weighment_transaction(UUID, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
