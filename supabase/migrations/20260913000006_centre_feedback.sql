-- ==============================================================================
-- Kishan Seva - Centre Feedback
-- Migration: 20260913000006_centre_feedback.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.centre_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  centre_id UUID REFERENCES public.procurement_centres(id) NOT NULL,
  farmer_id UUID REFERENCES public.farmer_profiles(id) NOT NULL,
  wait_time_rating SMALLINT CHECK (wait_time_rating BETWEEN 1 AND 5),
  staff_behavior_rating SMALLINT CHECK (staff_behavior_rating BETWEEN 1 AND 5),
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.centre_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Farmers can view their own feedback
DROP POLICY IF EXISTS "Farmers can view own feedback" ON public.centre_feedback;
CREATE POLICY "Farmers can view own feedback"
ON public.centre_feedback
FOR SELECT
USING (
  farmer_id IN (
    SELECT id FROM public.farmer_profiles 
    WHERE clerk_user_id = public.get_calling_clerk_id()
  )
);

-- Policy: Farmers can insert their own feedback
DROP POLICY IF EXISTS "Farmers can insert own feedback" ON public.centre_feedback;
CREATE POLICY "Farmers can insert own feedback"
ON public.centre_feedback
FOR INSERT
WITH CHECK (
  farmer_id IN (
    SELECT id FROM public.farmer_profiles 
    WHERE clerk_user_id = public.get_calling_clerk_id()
  )
);

-- Policy: Admins can view all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.centre_feedback;
CREATE POLICY "Admins can view all feedback"
ON public.centre_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE clerk_user_id = public.get_calling_clerk_id()
  )
);

-- RPC for submitting feedback securely
CREATE OR REPLACE FUNCTION public.submit_centre_feedback(
  p_booking_id UUID,
  p_wait_rating SMALLINT,
  p_staff_rating SMALLINT,
  p_overall_rating SMALLINT,
  p_comment TEXT
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

  -- 2. Validate Booking exists and belongs to caller
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  IF v_booking.status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Feedback can only be submitted for completed bookings';
  END IF;

  -- 3. Verify caller owns this booking
  IF NOT EXISTS (
    SELECT 1 FROM public.farmer_profiles 
    WHERE id = v_booking.farmer_id AND clerk_user_id = v_calling_clerk_id
  ) THEN
    RAISE EXCEPTION 'Identity mismatch: You do not own this booking';
  END IF;
  
  v_farmer_id := v_booking.farmer_id;
  v_centre_id := v_booking.centre_id;

  -- 4. Insert feedback (Will fail if unique constraint on booking_id is violated)
  INSERT INTO public.centre_feedback (
    booking_id, centre_id, farmer_id, wait_time_rating, staff_behavior_rating, overall_rating, comment
  ) VALUES (
    p_booking_id, v_centre_id, v_farmer_id, p_wait_rating, p_staff_rating, p_overall_rating, p_comment
  ) RETURNING to_jsonb(centre_feedback.*) INTO v_result;

  RETURN v_result;
END;
$$;
