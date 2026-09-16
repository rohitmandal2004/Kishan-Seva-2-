-- ==============================================================================
-- KISHAN SEVA — STRICT CLERK USER ID & IDENTITY VERIFICATION
-- ==============================================================================

-- 1. Backfill any existing farmer profiles without a clerk_user_id
UPDATE public.farmer_profiles
SET clerk_user_id = 'pending-' || id::text
WHERE clerk_user_id IS NULL;

-- 2. Add NOT NULL constraint to clerk_user_id
ALTER TABLE public.farmer_profiles 
ALTER COLUMN clerk_user_id SET NOT NULL;
