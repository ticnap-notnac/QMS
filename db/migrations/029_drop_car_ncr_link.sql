-- =============================================================================
-- Migration 029: Remove deprecated Link to NCR from CAR reports
-- =============================================================================
-- Drops the deprecated `ncr_id` column on `public.car_reports` and the unused
-- `public.car_ncr_links` table.

ALTER TABLE public.car_reports
  DROP COLUMN IF EXISTS ncr_id;

DROP TABLE IF EXISTS public.car_ncr_links;
