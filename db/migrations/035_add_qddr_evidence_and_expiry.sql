BEGIN;

-- 1. Add evidence_urls column to public.qddr_reports
ALTER TABLE public.qddr_reports
  ADD COLUMN IF NOT EXISTS evidence_urls jsonb NULL DEFAULT '[]'::jsonb;

-- 2. Ensure storage bucket for QDDR / Audit evidence exists and is public for viewing
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-evidence', 'audit-evidence', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
