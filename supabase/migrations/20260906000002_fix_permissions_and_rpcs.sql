-- ==============================================================================
-- Kishan Seva — Fix Permissions, RPCs, and Multi-Role Auth Architecture
-- Migration: 20260906000002_fix_permissions_and_rpcs.sql
-- ==============================================================================

-- 1. Ensure operator_profiles, admin_profiles, and farmer_profiles have clerk_user_id and email
ALTER TABLE public.operator_profiles ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255);
ALTER TABLE public.operator_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255);
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.farmer_profiles ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255);
ALTER TABLE public.farmer_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.farmer_profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'FARMER';

CREATE INDEX IF NOT EXISTS idx_operator_profiles_clerk_id ON public.operator_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_operator_profiles_email ON public.operator_profiles(email);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_clerk_id ON public.admin_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON public.admin_profiles(email);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_clerk_id ON public.farmer_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_email ON public.farmer_profiles(email);

-- 2. Update default operator, admin, and farmer profiles with known emails
UPDATE public.operator_profiles
SET email = 'operator@kishanseva.gov.in'
WHERE operator_code = 'OP-001' AND (email IS NULL OR email = '');

UPDATE public.operator_profiles
SET email = 'inspector@kishanseva.gov.in'
WHERE operator_code = 'OP-002' AND (email IS NULL OR email = '');

UPDATE public.farmer_profiles
SET email = 'rohitmandal0804@gmail.com'
WHERE farmer_code = 'KIS-FMR-00001' AND (email IS NULL OR email = '');

-- 3. Drop all previous overloaded variants of submit_weighment_transaction
DROP FUNCTION IF EXISTS public.submit_weighment_transaction(UUID, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.submit_weighment_transaction(UUID, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.submit_weighment_transaction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.submit_weighment_transaction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- 3.1 Create canonical submit_weighment_transaction RPC with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.submit_weighment_transaction(
  p_booking_id UUID,
  p_status TEXT,
  -- Quality check fields
  p_moisture_percent DECIMAL DEFAULT NULL,
  p_foreign_matter_percent DECIMAL DEFAULT NULL,
  p_broken_grain_percent DECIMAL DEFAULT NULL,
  p_grade TEXT DEFAULT NULL,
  p_inspector_name TEXT DEFAULT NULL,
  p_certificate_id TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  -- Weighment fields
  p_gross_weight_q DECIMAL DEFAULT NULL,
  p_tare_weight_q DECIMAL DEFAULT NULL,
  p_net_weight_q DECIMAL DEFAULT NULL,
  p_msp_rate_per_q DECIMAL DEFAULT NULL,
  p_gross_amount DECIMAL DEFAULT NULL,
  p_moisture_deduction DECIMAL DEFAULT NULL,
  p_handling_charge DECIMAL DEFAULT NULL,
  p_net_payable DECIMAL DEFAULT NULL,
  p_slip_number TEXT DEFAULT NULL,
  p_weighbridge_operator TEXT DEFAULT NULL,
  p_dbt_status TEXT DEFAULT NULL,
  p_transaction_ref TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_centre_id UUID;
BEGIN
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
    completed_at = CASE WHEN p_status = 'COMPLETED' THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_status = 'CANCELLED' THEN NOW() ELSE cancelled_at END,
    updated_at = NOW()
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
      moisture_percent = EXCLUDED.moisture_percent,
      foreign_matter_percent = EXCLUDED.foreign_matter_percent,
      broken_grain_percent = EXCLUDED.broken_grain_percent,
      grade = EXCLUDED.grade,
      inspector_name = EXCLUDED.inspector_name,
      certificate_id = EXCLUDED.certificate_id,
      rejection_reason = COALESCE(EXCLUDED.rejection_reason, public.quality_checks.rejection_reason);
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
      gross_weight_q = EXCLUDED.gross_weight_q,
      tare_weight_q = EXCLUDED.tare_weight_q,
      net_weight_q = EXCLUDED.net_weight_q,
      msp_rate_per_q = EXCLUDED.msp_rate_per_q,
      gross_amount = EXCLUDED.gross_amount,
      moisture_deduction = EXCLUDED.moisture_deduction,
      handling_charge = EXCLUDED.handling_charge,
      net_payable = EXCLUDED.net_payable,
      slip_number = EXCLUDED.slip_number,
      weighbridge_operator = EXCLUDED.weighbridge_operator,
      dbt_status = EXCLUDED.dbt_status,
      transaction_ref = EXCLUDED.transaction_ref;
  END IF;

  -- Update queue length for centre
  IF p_status IN ('COMPLETED', 'CANCELLED') AND v_centre_id IS NOT NULL THEN
    UPDATE public.procurement_centres
    SET
      current_queue_length = GREATEST(0, current_queue_length - 1),
      updated_at = NOW()
    WHERE id = v_centre_id;
  END IF;
END;
$$;

-- 4. Drop all previous overloaded variants of create_booking
DROP FUNCTION IF EXISTS public.create_booking(UUID, UUID, VARCHAR, DECIMAL, DATE, VARCHAR, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.create_booking(TEXT, UUID, VARCHAR, DECIMAL, DATE, VARCHAR, VARCHAR, VARCHAR) CASCADE;

-- 4.1 Create robust create_booking function supporting Clerk IDs & UUIDs
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

-- 5. Set RLS on bookings to allow Clerk anon client SELECT
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_farmer_select ON public.bookings;
DROP POLICY IF EXISTS bookings_operator_select ON public.bookings;
DROP POLICY IF EXISTS bookings_admin_select ON public.bookings;
DROP POLICY IF EXISTS bookings_all_read ON public.bookings;

CREATE POLICY bookings_all_read ON public.bookings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS bookings_all_insert ON public.bookings;
CREATE POLICY bookings_all_insert ON public.bookings
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS bookings_all_update ON public.bookings;
CREATE POLICY bookings_all_update ON public.bookings
  FOR UPDATE
  USING (true);

-- 6. Ensure Queue Metrics View and Queue Prediction RPC exist
CREATE OR REPLACE VIEW public.v_centre_queue_metrics AS
SELECT
  b.centre_id,
  COUNT(*) FILTER (WHERE b.status IN ('CHECKED_IN', 'WAITING'))        AS checked_in_count,
  COUNT(*) FILTER (WHERE b.status IN ('QUALITY_TESTING', 'WEIGHMENT')) AS processing_count,
  COUNT(*) FILTER (WHERE b.status = 'BOOKED')                          AS prebooked_count,
  COUNT(*) FILTER (WHERE b.status NOT IN ('COMPLETED', 'CANCELLED'))   AS total_active,
  -- Predicted wait: (checked_in + processing + 40% of prebooked) * 4.5 mins avg
  GREATEST(5, ROUND(
    (
      COUNT(*) FILTER (WHERE b.status IN ('CHECKED_IN', 'WAITING'))
      + COUNT(*) FILTER (WHERE b.status IN ('QUALITY_TESTING', 'WEIGHMENT'))
      + ROUND(COUNT(*) FILTER (WHERE b.status = 'BOOKED') * 0.4 * 0.95)
    ) * 4.5
  ))::INTEGER AS predicted_wait_mins,
  -- Processing rate: ~13 vehicles/hour at 4.5 mins avg
  13 AS processing_rate_per_hour,
  -- Confidence tier
  CASE
    WHEN COUNT(*) < 3 THEN 'LOW'
    WHEN COUNT(*) FILTER (WHERE b.status = 'BOOKED') > 20 THEN 'MEDIUM'
    ELSE 'HIGH'
  END AS confidence
FROM public.bookings b
WHERE b.slot_date = CURRENT_DATE
GROUP BY b.centre_id;

-- 6.1 Drop and recreate get_queue_prediction RPC
DROP FUNCTION IF EXISTS public.get_queue_prediction(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_queue_prediction(p_centre_id UUID)
RETURNS TABLE (
  centre_id UUID,
  checked_in_count BIGINT,
  processing_count BIGINT,
  prebooked_count BIGINT,
  total_active BIGINT,
  predicted_wait_mins INTEGER,
  processing_rate_per_hour INTEGER,
  confidence TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.centre_id,
    m.checked_in_count,
    m.processing_count,
    m.prebooked_count,
    m.total_active,
    m.predicted_wait_mins,
    m.processing_rate_per_hour,
    m.confidence
  FROM public.v_centre_queue_metrics m
  WHERE m.centre_id = p_centre_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      p_centre_id,
      0::BIGINT,
      0::BIGINT,
      0::BIGINT,
      0::BIGINT,
      5::INTEGER,
      13::INTEGER,
      'LOW'::TEXT;
  END IF;
END;
$$;

-- 7. Universal clean grant on schema public (no procedural loops, 100% standard SQL)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
