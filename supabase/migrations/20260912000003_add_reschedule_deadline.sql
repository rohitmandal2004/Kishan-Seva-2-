-- Migration to support cancellation grace period and rescheduling

-- 1. Add reschedule_deadline to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS reschedule_deadline TIMESTAMPTZ;

-- 2. Postpone Booking RPC
CREATE OR REPLACE FUNCTION public.postpone_booking(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  -- Verify booking exists and is active
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status != 'BOOKED' THEN
    RAISE EXCEPTION 'Only BOOKED slots can be postponed. Current status: %', v_booking.status;
  END IF;

  -- Free up the queue space for the centre
  UPDATE public.procurement_centres
  SET current_queue_length = GREATEST(0, current_queue_length - 1)
  WHERE id = v_booking.centre_id;

  -- Update booking to CANCELLED with 7-day grace period
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

-- 3. Reschedule Booking RPC
CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_id UUID,
  p_new_centre_id UUID,
  p_new_slot_date DATE,
  p_new_slot_time TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_new_queue_sequence INTEGER;
BEGIN
  -- Verify booking exists and is eligible for rescheduling
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status != 'CANCELLED' OR v_booking.reschedule_deadline IS NULL THEN
    RAISE EXCEPTION 'Booking is not eligible for rescheduling';
  END IF;

  IF v_booking.reschedule_deadline < NOW() THEN
    RAISE EXCEPTION 'Reschedule deadline has passed';
  END IF;

  -- Assign new queue sequence
  UPDATE public.procurement_centres
  SET current_queue_length = current_queue_length + 1
  WHERE id = p_new_centre_id
  RETURNING current_queue_length INTO v_new_queue_sequence;

  -- Reactivate booking
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
