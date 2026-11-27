-- Migration: 30-day Recycle Bin auto-purge (zero schema/table changes)
-- Reuses existing `status = 'deleted'` and `updated_at` timestamp on car_reports and qddr_reports.

CREATE OR REPLACE FUNCTION public.purge_expired_recycle_bin_reports(retention_days integer DEFAULT 30)
RETURNS TABLE(deleted_cars integer, deleted_qddrs integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_ts timestamptz := NOW() - make_interval(days => GREATEST(retention_days, 1));
  car_count integer := 0;
  qddr_count integer := 0;
BEGIN
  -- Remove clause links for expired soft-deleted CAR reports first
  DELETE FROM public.car_clause_links
  WHERE car_report_id IN (
    SELECT id
    FROM public.car_reports
    WHERE status = 'deleted'
      AND COALESCE(updated_at, created_at) < cutoff_ts
  );

  -- Permanently delete expired CAR reports
  WITH purged_cars AS (
    DELETE FROM public.car_reports
    WHERE status = 'deleted'
      AND COALESCE(updated_at, created_at) < cutoff_ts
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO car_count FROM purged_cars;

  -- Permanently delete expired QDDR reports
  WITH purged_qddrs AS (
    DELETE FROM public.qddr_reports
    WHERE status = 'deleted'
      AND COALESCE(updated_at, created_at) < cutoff_ts
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO qddr_count FROM purged_qddrs;

  RETURN QUERY SELECT car_count, qddr_count;
END;
$$;

-- Schedule daily cleanup at 02:00 UTC if pg_cron is enabled on Supabase
DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO existing_job_id
    FROM cron.job
    WHERE jobname = 'purge-expired-recycle-bin-reports'
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
      'purge-expired-recycle-bin-reports',
      '0 2 * * *',
      'SELECT public.purge_expired_recycle_bin_reports(30);'
    );
  END IF;
END $$;
