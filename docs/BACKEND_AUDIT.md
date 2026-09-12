# Kishan Seva - Backend & ML Architecture Audit

## Executive Summary
This audit was performed against the current Kishan Seva application state to evaluate backend correctness, real database behavior, operational event capture, and machine learning readiness. 

The frontend heavily relies on client-side state engines (`mockStore.ts`) and gracefully degrades when the database fails, which is excellent for a demo but highly unsafe for production. Furthermore, the RLS policies are wide open, queue prediction relies on hard-coded heuristics instead of ML, and critical operational timestamps are not fully captured.

## Findings by Priority

### P0 (Critical)
*   **No Silent Mock Fallback in Production:** The application silently falls back to `mockStore.ts` and `localStorage` if Supabase configuration is missing or network requests fail. This obscures production DB failures.
*   **Fake Fallback Farmer UUIDs:** Hard-coded farmer profiles (`f1111111...`, `demo-farmer`) are present in `mockStore.ts` and `SupabaseContext.tsx`, polluting authentic operational data.
*   **Insecure Role Resolution:** Roles are inferred from `sessionStorage` (`kishan_demo_role`) or fallback local storage instead of purely relying on authorized database claims (`admin_profiles`, `operator_profiles`).
*   **Insecure RLS Policies:** `complete_setup.sql` defines policies like `USING (true) WITH CHECK (true)` for all critical tables, including `users`, `farmer_profiles`, and `bookings`, allowing any authenticated user full read/write access to all system data.

### P1 (High)
*   **Mathematical Queue Prediction Engine:** `queuePredictionEngine.ts` calculates wait time purely using a hard-coded formula (effective queue * 4.5 mins) rather than querying an ML service or model.
*   **Recommendation Engine Inconsistencies:** `recommendationEngine.ts` mixes PostGIS server-side distance calculations with client-side Haversine fallbacks unpredictably. It computes a journey score client-side with arbitrary hard-coded weights.
*   **Missing ML Infrastructure:** No FastAPI prediction service exists, and the `ml_wait_training_features`, `ml_predictions`, and `model_registry` tables/schemas are absent.
*   **Missing Operational Timestamps:** The `bookings` schema records `booked_at`, `checked_in_at`, `completed_at`, but misses granular timestamps required for ML tracking (e.g., `queue_entered_at`, `quality_started_at`, `weighment_started_at`).

### P2 (Medium)
*   **Stale Hard-Coded Reference Data:** `mockStore.ts` contains hard-coded 2026 Kharif/Rabi MSP values. These should be retrieved from an authoritative reference data table with data ingestion logic.
*   **Synthetic Centre Data:** Seed data mixes real-world geographical coordinates with synthetic properties without explicitly tagging them as `is_demo = true`.
*   **Missing Data Quality Validation:** No explicit constraints exist to prevent negative quantities, impossible timestamps, or invalid state transitions in the DB schema.

### P3 (Low)
*   **TypeScript warnings:** Unused variables and impure functions (`Date.now()` inside React render cycles) were detected via `npm run lint`.
*   **Missing Admin ML Observability:** Admin interfaces do not surface model versions, fallback frequencies, or MAE metrics.

---
**Audit Date:** 2026-09-10
