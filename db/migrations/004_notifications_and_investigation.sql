-- Migration: investigation fields on NCR reports and notifications support.

ALTER TABLE public.ncr_reports
  ADD COLUMN IF NOT EXISTS investigation_details text,
  ADD COLUMN IF NOT EXISTS resolution_details text,
  ADD COLUMN IF NOT EXISTS resolution_time interval,
  ADD COLUMN IF NOT EXISTS verification_date date,
  ADD COLUMN IF NOT EXISTS investigation_evidence_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ncr_reports_investigation_details ON public.ncr_reports (investigation_details);
CREATE INDEX IF NOT EXISTS idx_ncr_reports_verification_date ON public.ncr_reports (verification_date);

CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint,
  title varchar NOT NULL,
  message text NOT NULL,
  type varchar DEFAULT 'info',
  is_read boolean DEFAULT false,
  report_id bigint REFERENCES public.ncr_reports(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Allow authenticated select on notifications'
  ) THEN
    CREATE POLICY "Allow authenticated select on notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Allow authenticated update on notifications'
  ) THEN
    CREATE POLICY "Allow authenticated update on notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Allow authenticated insert on notifications'
  ) THEN
    CREATE POLICY "Allow authenticated insert on notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.notify_verification_due()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, reference_no, verification_date
    FROM public.ncr_reports
    WHERE verification_date = CURRENT_DATE
      AND investigation_details IS NOT NULL
  LOOP
    INSERT INTO public.notifications (title, message, type, report_id)
    VALUES (
      'Verification Due: ' || r.reference_no,
      'Report ' || r.reference_no || ' has reached its verification date. Please confirm if the issue has been resolved.',
      'warning',
      r.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.notify_verification_overdue()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, reference_no, verification_date
    FROM public.ncr_reports
    WHERE verification_date < CURRENT_DATE
      AND investigation_details IS NOT NULL
  LOOP
    INSERT INTO public.notifications (title, message, type, report_id)
    VALUES (
      'Verification Overdue: ' || r.reference_no,
      'Report ' || r.reference_no || ' is past its verification date and needs follow-up.',
      'overdue',
      r.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'check-verification-dates-due',
      '0 8 * * *',
      'SELECT public.notify_verification_due();'
    );

    PERFORM cron.schedule(
      'check-verification-dates-overdue',
      '0 8 * * *',
      'SELECT public.notify_verification_overdue();'
    );
  END IF;
END $$;
