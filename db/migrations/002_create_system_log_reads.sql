-- Migration: create system_log_reads audit table and retention helper
-- Creates a table to record when someone reads system logs

CREATE TABLE IF NOT EXISTS public.system_log_reads (
  id BIGSERIAL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_auth_id uuid,
  query text,
  result_count integer
);

CREATE INDEX IF NOT EXISTS idx_system_log_reads_user_auth_id ON public.system_log_reads (user_auth_id);
CREATE INDEX IF NOT EXISTS idx_system_log_reads_created_at ON public.system_log_reads (created_at);

-- Retention helper: deletes rows older than the given number of days.
-- Call manually or wire to a scheduler (pg_cron) if available.
CREATE OR REPLACE FUNCTION public.purge_old_system_logs(days integer)
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.system_logs WHERE created_at < now() - (days || ' days')::interval;
$$;

CREATE OR REPLACE FUNCTION public.purge_old_system_log_reads(days integer)
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.system_log_reads WHERE created_at < now() - (days || ' days')::interval;
$$;

-- NOTE: Schedule purging with pg_cron or a background job. Do NOT run automatically in this migration.
