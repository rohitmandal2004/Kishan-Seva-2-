-- ==============================================================================
-- Kishan Seva - Booking Slot Integrity Fix
-- Migration: 20260926000000_fix_booking_slots.sql
-- ==============================================================================

-- 1. postpone_booking (decrement slot booked_count)
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
  v_slot             public.slots%ROWTYPE;
BEGIN
  v_calling_clerk_id := public.get_calling_clerk_id();

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
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

  -- Free up the original slot
  IF v_booking.slot_id IS NOT NULL THEN
    SELECT * INTO v_slot FROM public.slots WHERE id = v_booking.slot_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.slots
      SET booked_count = GREATEST(0, booked_count - 1)
      WHERE id = v_booking.slot_id;
    END IF;
  END IF;

  UPDATE public.procurement_centres
  SET current_queue_length = GREATEST(0, current_queue_length - 1)
  WHERE id = v_booking.centre_id;

  UPDATE public.bookings
  SET
    status = 'CANCELLED',
    reschedule_deadline = NOW() + INTERVAL '7 days',
    updated_at = NOW(),
    queue_sequence = NULL,
    slot_id = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'message', 'Booking postponed successfully');
END;
$$;


-- 2. reschedule_booking (reserve new slot properly)
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
  v_slot               public.slots%ROWTYPE;
  v_start_time         TIME;
BEGIN
  v_calling_clerk_id := public.get_calling_clerk_id();

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
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

  -- Parse slot_time and handle public.slots quota
  BEGIN
    v_start_time := trim(split_part(p_new_slot_time, '-', 1))::time;
  EXCEPTION WHEN OTHERS THEN
    v_start_time := '09:00:00'::time;
  END;

  SELECT * INTO v_slot FROM public.slots 
  WHERE centre_id = p_new_centre_id AND slot_date = p_new_slot_date AND start_time = v_start_time
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create slot for development/testing if missing
    INSERT INTO public.slots (centre_id, slot_date, start_time, end_time, capacity, booked_count)
    VALUES (p_new_centre_id, p_new_slot_date, v_start_time, v_start_time + interval '1 hour', 20, 0)
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

  -- Get new queue sequence
  SELECT COALESCE(MAX(queue_sequence), 0) + 1 INTO v_new_queue_sequence
  FROM public.bookings
  WHERE centre_id = p_new_centre_id AND slot_date = p_new_slot_date;

  -- Also update current_queue_length on the centre (this is for today's live queue essentially, but historically it's maintained this way)
  UPDATE public.procurement_centres
  SET current_queue_length = current_queue_length + 1
  WHERE id = p_new_centre_id;

  -- Update booking
  UPDATE public.bookings
  SET
    status = 'BOOKED',
    centre_id = p_new_centre_id,
    slot_id = v_slot.id,
    slot_date = p_new_slot_date,
    slot_time = p_new_slot_time,
    queue_sequence = v_new_queue_sequence,
    reschedule_deadline = NULL,
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking rescheduled successfully',
    'booking_id', p_booking_id
  );
END;
$$;
