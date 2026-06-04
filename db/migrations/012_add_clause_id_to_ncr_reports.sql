-- Migration: Add clause_id to ncr_reports
ALTER TABLE public.ncr_reports
ADD COLUMN IF NOT EXISTS clause_id UUID REFERENCES public.iso_clauses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ncr_reports_clause_id ON public.ncr_reports(clause_id);
