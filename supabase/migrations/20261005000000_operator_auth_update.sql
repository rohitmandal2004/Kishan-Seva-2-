-- Phase 1 Database strictness

-- Add credential_status to operator_profiles
ALTER TABLE public.operator_profiles 
ADD COLUMN IF NOT EXISTS credential_status VARCHAR(50) DEFAULT 'NOT_CREATED',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Note: notifications and audit_logs tables already exist in the database schema.
