-- Migration: 20260907000000_ml_tables
-- Adds tables required for the ML waiting time prediction and recommendation tracking pipeline.

-- 1. Model Registry: Stores metadata about trained ML models (e.g., Random Forest, XGBoost)
CREATE TABLE IF NOT EXISTS public.model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    version TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    features_used TEXT[] NOT NULL,
    metrics JSONB NOT NULL, -- e.g., {"mae": 5.2, "rmse": 7.1, "r2": 0.85}
    is_active BOOLEAN DEFAULT false,
    artifact_path TEXT, -- S3/GCS/Supabase Storage path
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure only one active model per model_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_model ON public.model_registry (model_name) WHERE is_active = true;

-- 2. ML Training Features: A denormalized table populated by cron/triggers containing features at the time of booking completion.
CREATE TABLE IF NOT EXISTS public.ml_wait_training_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
    -- Features
    day_of_week INTEGER,
    hour_of_day INTEGER,
    current_queue_length INTEGER,
    currently_processing INTEGER,
    prebooked_tokens INTEGER,
    processing_rate_q_per_hr NUMERIC,
    weather_condition TEXT, -- e.g., 'Clear', 'Rain'
    rainfall_mm NUMERIC,
    -- Target
    actual_wait_time_mins INTEGER, -- Time from CHECKED_IN to QUALITY_TESTING
    actual_total_time_mins INTEGER, -- Time from CHECKED_IN to COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ML Predictions: Logs API inference calls for drift detection and accuracy monitoring.
CREATE TABLE IF NOT EXISTS public.ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
    model_version_id UUID REFERENCES public.model_registry(id),
    features JSONB NOT NULL,
    predicted_wait_mins INTEGER NOT NULL,
    confidence_interval JSONB, -- {"lower": 10, "upper": 25}
    actual_wait_mins INTEGER, -- Backfilled later for comparison
    fallback_used BOOLEAN DEFAULT false, -- True if the FastAPI service was down and heuristic was used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Recommendation Outcomes: Tracks which centre was recommended vs chosen.
CREATE TABLE IF NOT EXISTS public.recommendation_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    farmer_lat NUMERIC,
    farmer_lon NUMERIC,
    recommended_centre_id UUID REFERENCES public.procurement_centres(id),
    recommended_journey_score INTEGER,
    chosen_centre_id UUID REFERENCES public.procurement_centres(id),
    chosen_journey_score INTEGER,
    reason_for_deviation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_wait_training_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
