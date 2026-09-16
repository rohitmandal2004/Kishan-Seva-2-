-- ==============================================================================
-- Kishan Seva - QC Appeals / Disputes
-- Migration: 20260913000007_quality_disputes.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.qc_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  farmer_id UUID REFERENCES public.farmer_profiles(id) NOT NULL,
  centre_id UUID REFERENCES public.procurement_centres(id) NOT NULL,
  original_grade VARCHAR(50) NOT NULL,
  appeal_reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RE_TESTED')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.qc_appeals ENABLE ROW LEVEL SECURITY;

-- Policy: Farmers can view their own appeals
DROP POLICY IF EXISTS "Farmers can view own qc_appeals" ON public.qc_appeals;
CREATE POLICY "Farmers can view own qc_appeals"
ON public.qc_appeals
FOR SELECT
USING (
  farmer_id IN (
    SELECT id FROM public.farmer_profiles 
    WHERE clerk_user_id = public.get_calling_clerk_id()
  )
);

-- Policy: Farmers can insert their own appeals
DROP POLICY IF EXISTS "Farmers can insert own qc_appeals" ON public.qc_appeals;
CREATE POLICY "Farmers can insert own qc_appeals"
ON public.qc_appeals
FOR INSERT
WITH CHECK (
  farmer_id IN (
    SELECT id FROM public.farmer_profiles 
    WHERE clerk_user_id = public.get_calling_clerk_id()
  )
);

-- Policy: Admins can view all appeals
DROP POLICY IF EXISTS "Admins can view all qc_appeals" ON public.qc_appeals;
CREATE POLICY "Admins can view all qc_appeals"
ON public.qc_appeals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE clerk_user_id = public.get_calling_clerk_id()
  )
);

-- Policy: Admins can update appeals
DROP POLICY IF EXISTS "Admins can update qc_appeals" ON public.qc_appeals;
CREATE POLICY "Admins can update qc_appeals"
ON public.qc_appeals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE clerk_user_id = public.get_calling_clerk_id()
  )
);

-- RPC to submit QC appeal
CREATE OR REPLACE FUNCTION public.submit_qc_appeal(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_farmer_id UUID;
  v_centre_id UUID;
  v_calling_clerk_id TEXT;
  v_result JSONB;
BEGIN
  -- 1. Identify caller
  v_calling_clerk_id := public.get_calling_clerk_id();
  
  IF v_calling_clerk_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No valid clerk identity found';
  END IF;

  -- 2. Validate Booking
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Verify caller owns this booking
  IF NOT EXISTS (
    SELECT 1 FROM public.farmer_profiles 
    WHERE id = v_booking.farmer_id AND clerk_user_id = v_calling_clerk_id
  ) THEN
    RAISE EXCEPTION 'Identity mismatch: You do not own this booking';
  END IF;

  -- Check if it actually has a grade that can be appealed
  IF v_booking.quality_data IS NULL OR NOT (v_booking.quality_data->>'grade' IN ('Grade B', 'Grade C', 'Rejected')) THEN
    RAISE EXCEPTION 'Appeal only allowed for Grade B, Grade C, or Rejected';
  END IF;

  -- 3. Insert appeal
  INSERT INTO public.qc_appeals (
    booking_id, farmer_id, centre_id, original_grade, appeal_reason
  ) VALUES (
    p_booking_id, v_booking.farmer_id, v_booking.centre_id, v_booking.quality_data->>'grade', p_reason
  ) RETURNING to_jsonb(qc_appeals.*) INTO v_result;

  -- Also mark booking as disputed
  UPDATE public.bookings 
  SET quality_data = jsonb_set(quality_data, '{disputed}', 'true'::jsonb)
  WHERE id = p_booking_id;

  RETURN v_result;
END;
$$;
