-- ==============================================================================
-- Kishan Seva - Digital Receipt Flags
-- Migration: 20260913000005_receipt_flags.sql
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bookings'
          AND column_name = 'receipt_generated'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN receipt_generated BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bookings'
          AND column_name = 'receipt_generated_at'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN receipt_generated_at TIMESTAMPTZ;
    END IF;
END $$;
