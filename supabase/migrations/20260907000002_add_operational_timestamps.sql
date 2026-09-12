-- Migration: 20260907000002_add_operational_timestamps
-- Adds granular timestamp tracking to bookings for accurate ML dataset generation.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS queue_entered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quality_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS weighment_started_at TIMESTAMPTZ;

-- We should also update the submit_weighment_transaction and advance_booking logic to populate these.
-- Since they are managed by the application, we can use triggers or explicit UPDATE statements.
-- Here we'll create a trigger to auto-populate them based on status changes.

CREATE OR REPLACE FUNCTION update_booking_operational_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'WAITING' THEN
            NEW.queue_entered_at = COALESCE(NEW.queue_entered_at, NOW());
        ELSIF NEW.status = 'QUALITY_TESTING' THEN
            NEW.quality_started_at = COALESCE(NEW.quality_started_at, NOW());
        ELSIF NEW.status = 'WEIGHMENT' THEN
            NEW.weighment_started_at = COALESCE(NEW.weighment_started_at, NOW());
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_booking_timestamps ON public.bookings;
CREATE TRIGGER trg_update_booking_timestamps
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_booking_operational_timestamps();
