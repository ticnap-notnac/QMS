-- =============================================================================
-- Migration 026: Reconcile Live Database Schema Drift on ncr_reports
-- Resolves: BUG-05
-- =============================================================================

BEGIN;

-- 1. Add missing columns to public.ncr_reports used by ISO Clause linking and CAR/QDDR badges
ALTER TABLE public.ncr_reports
  ADD COLUMN IF NOT EXISTS clause_id uuid NULL REFERENCES public.iso_clauses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS car_filed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qddr_filed boolean NOT NULL DEFAULT false;

-- 2. Backfill car_filed = true for any NCR already referenced in car_ncr_links or car_reports.ncr_id
UPDATE public.ncr_reports n
SET car_filed = true
WHERE car_filed IS DISTINCT FROM true
  AND (
    EXISTS (SELECT 1 FROM public.car_ncr_links l WHERE l.ncr_id = n.id)
    OR EXISTS (SELECT 1 FROM public.car_reports c WHERE c.ncr_id IS NOT NULL AND n.id = ANY(c.ncr_id))
  );

-- 3. Backfill qddr_filed = true for any NCR already referenced in qddr_ncr_links or qddr_reports.ncr_id
UPDATE public.ncr_reports n
SET qddr_filed = true
WHERE qddr_filed IS DISTINCT FROM true
  AND (
    EXISTS (SELECT 1 FROM public.qddr_ncr_links l WHERE l.ncr_id = n.id)
    OR EXISTS (SELECT 1 FROM public.qddr_reports q WHERE q.ncr_id IS NOT NULL AND n.id = ANY(q.ncr_id))
  );

COMMIT;
