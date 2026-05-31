-- Migration: NCR assignment support, user-scoped notifications, and audit log table.

ALTER TABLE public.ncr_reports
  ADD COLUMN IF NOT EXISTS assigned_to bigint REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by bigint REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ncr_reports_assigned_to ON public.ncr_reports (assigned_to);
CREATE INDEX IF NOT EXISTS idx_ncr_reports_assigned_by ON public.ncr_reports (assigned_by);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated update on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;

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

CREATE POLICY "Allow authenticated insert notifications"
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

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module_name text NOT NULL,
  record_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_name ON public.audit_logs (module_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs (record_id);
