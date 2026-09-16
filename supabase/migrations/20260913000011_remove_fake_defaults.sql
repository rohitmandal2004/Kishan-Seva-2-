-- ==============================================================================
-- KISHAN SEVA — DROP FAKE SCHEMA DEFAULTS
-- ==============================================================================

ALTER TABLE public.farmer_profiles
  ALTER COLUMN state DROP DEFAULT,
  ALTER COLUMN district DROP DEFAULT,
  ALTER COLUMN village DROP DEFAULT,
  ALTER COLUMN latitude DROP DEFAULT,
  ALTER COLUMN longitude DROP DEFAULT,
  ALTER COLUMN land_area_acres DROP DEFAULT,
  ALTER COLUMN bank_name DROP DEFAULT,
  ALTER COLUMN account_number_masked DROP DEFAULT,
  ALTER COLUMN ifsc_code DROP DEFAULT;
