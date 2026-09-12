-- Migration: 20260907000001_strict_rls
-- Replaces wide-open USING(true) RLS policies with strict, role-scoped policies.
-- Safe & Idempotent: Drops existing policies if present before recreating them.

-- 1. Farmer Profiles: Farmers can only read/update their own profile. Admins can read all.
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can view their own profile" ON public.farmer_profiles;
CREATE POLICY "Farmers can view their own profile" 
ON public.farmer_profiles FOR SELECT 
USING (auth.uid() = user_id OR auth.uid()::text = clerk_user_id);

DROP POLICY IF EXISTS "Farmers can update their own profile" ON public.farmer_profiles;
CREATE POLICY "Farmers can update their own profile" 
ON public.farmer_profiles FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid()::text = clerk_user_id);

DROP POLICY IF EXISTS "Admins can view all farmer profiles" ON public.farmer_profiles;
CREATE POLICY "Admins can view all farmer profiles" 
ON public.farmer_profiles FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.user_id = auth.uid()));


-- 2. Bookings: Farmers see their own. Operators see their centre's. Admins see all.
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can view own bookings" ON public.bookings;
CREATE POLICY "Farmers can view own bookings"
ON public.bookings FOR SELECT
USING (
    farmer_id IN (
        SELECT id FROM public.farmer_profiles 
        WHERE user_id = auth.uid() OR clerk_user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "Operators can view centre bookings" ON public.bookings;
CREATE POLICY "Operators can view centre bookings"
ON public.bookings FOR SELECT
USING (
    centre_id IN (
        SELECT centre_id FROM public.operator_profiles 
        WHERE user_id = auth.uid() OR operator_profiles.id::text = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.user_id = auth.uid()));


-- 3. Queue Events: Similar to bookings
ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can view own queue events" ON public.queue_events;
CREATE POLICY "Farmers can view own queue events"
ON public.queue_events FOR SELECT
USING (
    booking_id IN (
        SELECT id FROM public.bookings WHERE farmer_id IN (
            SELECT id FROM public.farmer_profiles 
            WHERE user_id = auth.uid() OR clerk_user_id = auth.uid()::text
        )
    )
);

DROP POLICY IF EXISTS "Operators can insert queue events" ON public.queue_events;
CREATE POLICY "Operators can insert queue events"
ON public.queue_events FOR INSERT
WITH CHECK (
    centre_id IN (
        SELECT centre_id FROM public.operator_profiles 
        WHERE user_id = auth.uid() OR operator_profiles.id::text = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "Operators can view centre queue events" ON public.queue_events;
CREATE POLICY "Operators can view centre queue events"
ON public.queue_events FOR SELECT
USING (
    centre_id IN (
        SELECT centre_id FROM public.operator_profiles 
        WHERE user_id = auth.uid() OR operator_profiles.id::text = auth.uid()::text
    )
);


-- 4. Quality Checks & Weighments: Operators can manage, Farmers can read their own.
ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weighments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can view own quality checks" ON public.quality_checks;
CREATE POLICY "Farmers can view own quality checks"
ON public.quality_checks FOR SELECT
USING (
    booking_id IN (
        SELECT id FROM public.bookings WHERE farmer_id IN (
            SELECT id FROM public.farmer_profiles 
            WHERE user_id = auth.uid() OR clerk_user_id = auth.uid()::text
        )
    )
);

DROP POLICY IF EXISTS "Operators can manage quality checks" ON public.quality_checks;
CREATE POLICY "Operators can manage quality checks"
ON public.quality_checks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b 
        JOIN public.operator_profiles op ON b.centre_id = op.centre_id 
        WHERE b.id = public.quality_checks.booking_id AND (op.user_id = auth.uid() OR op.id::text = auth.uid()::text)
    )
);
