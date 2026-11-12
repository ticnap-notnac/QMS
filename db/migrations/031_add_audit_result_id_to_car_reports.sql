BEGIN;

ALTER TABLE public.car_reports
  ADD COLUMN IF NOT EXISTS audit_result_id uuid NULL REFERENCES public.audit_results(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_car_reports_audit_result_id
  ON public.car_reports(audit_result_id);

COMMIT;
