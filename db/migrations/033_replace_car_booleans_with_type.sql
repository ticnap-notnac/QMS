BEGIN;

-- 1. Seed / upsert default Types of Non-Conformance into public.issue_types
INSERT INTO public.issue_types (issue_type_name)
VALUES
  ('Quality/Food Safety Issue'),
  ('Environment, Health and Safety Issue'),
  ('Security Issue'),
  ('Internal Audit'),
  ('Customer Complaint'),
  ('Government Agency Audit Non-Conformance'),
  ('Customer Audit Non-Conformance'),
  ('Vendor Non-Conformance')
ON CONFLICT (issue_type_name) DO NOTHING;

-- 2. Add single type_of_nonconformance column to car_reports
ALTER TABLE public.car_reports
  ADD COLUMN IF NOT EXISTS type_of_nonconformance varchar NULL;

-- 3. Drop the 8 legacy boolean columns from car_reports
ALTER TABLE public.car_reports
  DROP COLUMN IF EXISTS quality_food_safety,
  DROP COLUMN IF EXISTS environment_health_safety,
  DROP COLUMN IF EXISTS security_issue,
  DROP COLUMN IF EXISTS internal_audit,
  DROP COLUMN IF EXISTS customer_complaint,
  DROP COLUMN IF EXISTS government_agency_audit,
  DROP COLUMN IF EXISTS customer_audit_nonconformance,
  DROP COLUMN IF EXISTS vendor_nonconformance;

COMMIT;
