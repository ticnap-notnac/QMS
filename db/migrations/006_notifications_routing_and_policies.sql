-- Migration: align notification routing and RLS with user-scoped delivery.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Users select own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  user_id = (
    SELECT id
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "Allow insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (
  user_id = (
    SELECT id
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1
  )
);

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
      AND COALESCE(status, '') ILIKE 'open'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, report_id, is_read, created_at)
    SELECT
      u.id,
      'Verification Due: ' || r.reference_no,
      'Report ' || r.reference_no || ' has reached its verification date. Please verify closure.',
      'warning',
      r.id,
      false,
      now()
    FROM public.users u
    JOIN public.roles ro ON ro.id = u.role_id
    WHERE ro.role_name ILIKE 'admin' OR ro.role_name ILIKE 'auditor'
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = u.id
        AND n.report_id = r.id
        AND n.title = 'Verification Due: ' || r.reference_no
        AND n.created_at::date = CURRENT_DATE
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
      AND COALESCE(status, '') ILIKE 'open'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, report_id, is_read, created_at)
    SELECT
      u.id,
      'Verification Due: ' || r.reference_no,
      'Report ' || r.reference_no || ' is past due for verification and needs follow-up.',
      'warning',
      r.id,
      false,
      now()
    FROM public.users u
    JOIN public.roles ro ON ro.id = u.role_id
    WHERE ro.role_name ILIKE 'admin' OR ro.role_name ILIKE 'auditor'
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = u.id
        AND n.report_id = r.id
        AND n.title = 'Verification Due: ' || r.reference_no
        AND n.created_at::date = CURRENT_DATE
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
