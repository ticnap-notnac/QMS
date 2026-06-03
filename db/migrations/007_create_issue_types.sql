-- Migration: create issue_types table, plus NCR report foreign keys.

CREATE TABLE IF NOT EXISTS public.issue_types (
  id BIGSERIAL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  issue_type_name text NOT NULL UNIQUE
);

ALTER TABLE public.ncr_reports
  ADD COLUMN IF NOT EXISTS issue_type_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'ncr_reports'
      AND constraint_name = 'ncr_reports_issue_type_id_fkey'
  ) THEN
    ALTER TABLE public.ncr_reports
      ADD CONSTRAINT ncr_reports_issue_type_id_fkey
      FOREIGN KEY (issue_type_id) REFERENCES public.issue_types(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ncr_reports_issue_type_id ON public.ncr_reports (issue_type_id);

INSERT INTO public.issue_types (issue_type_name) VALUES
  ('Quality / Food Safety Issue'),
  ('Environment, Health & Safety Issue'),
  ('Security Issue'),
  ('Internal Audit'),
  ('Customer Complaint'),
  ('Government Agency Audit Non-Conformance'),
  ('Customer Audit Non-Conformance'),
  ('Vendor Non-Conformance')
ON CONFLICT (issue_type_name) DO NOTHING;

INSERT INTO public.issue_types (issue_type_name)
SELECT DISTINCT source.issue_type
FROM public.ncr_reports AS source
WHERE source.issue_type IS NOT NULL AND source.issue_type <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.issue_types existing
    WHERE lower(trim(existing.issue_type_name)) = lower(trim(source.issue_type))
  );

UPDATE public.ncr_reports r
SET issue_type_id = i.id
FROM public.issue_types i
WHERE r.issue_type_id IS NULL
  AND r.issue_type IS NOT NULL
  AND (
    lower(trim(r.issue_type)) = lower(trim(i.issue_type_name))
    OR
    (r.issue_type = 'quality_food_safety' AND i.issue_type_name = 'Quality / Food Safety Issue') OR
    (r.issue_type = 'environment_health_safety' AND i.issue_type_name = 'Environment, Health & Safety Issue') OR
    (r.issue_type = 'security_issue' AND i.issue_type_name = 'Security Issue') OR
    (r.issue_type = 'internal_audit' AND i.issue_type_name = 'Internal Audit') OR
    (r.issue_type = 'customer_complaint' AND i.issue_type_name = 'Customer Complaint') OR
    (r.issue_type = 'government_agency_audit' AND i.issue_type_name = 'Government Agency Audit Non-Conformance') OR
    (r.issue_type = 'customer_audit_nonconformance' AND i.issue_type_name = 'Customer Audit Non-Conformance') OR
    (r.issue_type = 'vendor_nonconformance' AND i.issue_type_name = 'Vendor Non-Conformance')
  );
