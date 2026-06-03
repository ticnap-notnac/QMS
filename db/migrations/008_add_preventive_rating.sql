-- Migration: add preventive_rating column to ncr_reports.

ALTER TABLE public.ncr_reports
  ADD COLUMN IF NOT EXISTS preventive_rating text;
