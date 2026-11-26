-- Migration 038: Remove QDDR auditing links
-- QDDR is no longer part of ISO auditing.
-- Run this migration only after confirming you want to permanently drop
-- the qddr_clause_links table and audit columns on qddr_reports.

BEGIN;

DROP TABLE IF EXISTS public.qddr_clause_links;

ALTER TABLE public.qddr_reports
  DROP COLUMN IF EXISTS audit_schedule_id,
  DROP COLUMN IF EXISTS audit_result_id;

COMMIT;
