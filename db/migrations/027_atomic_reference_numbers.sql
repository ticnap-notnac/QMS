-- =============================================================================
-- Migration 027: Atomic Reference Number Generation & Unique Constraints
-- Resolves: BUG-13
-- =============================================================================

BEGIN;

-- 1. Ensure no duplicate reference_no values exist in car_reports before adding UNIQUE constraint
DO $$
DECLARE
  rec RECORD;
  v_max int;
BEGIN
  SELECT COALESCE(MAX(CAST(substring(reference_no FROM '^CAR-([0-9]+)$') AS integer)), 0)
  INTO v_max
  FROM public.car_reports
  WHERE reference_no ~ '^CAR-[0-9]+$';

  FOR rec IN
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY reference_no ORDER BY id) AS rn
      FROM public.car_reports
      WHERE reference_no IS NOT NULL
    ) t
    WHERE t.rn > 1
    ORDER BY id
  LOOP
    v_max := v_max + 1;
    UPDATE public.car_reports
    SET reference_no = 'CAR-' || lpad(v_max::text, 3, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 2. Ensure no duplicate reference_no values exist in qddr_reports before adding UNIQUE constraint
DO $$
DECLARE
  rec RECORD;
  v_max int;
BEGIN
  SELECT COALESCE(MAX(CAST(substring(reference_no FROM '^QDDR-([0-9]+)$') AS integer)), 0)
  INTO v_max
  FROM public.qddr_reports
  WHERE reference_no ~ '^QDDR-[0-9]+$';

  FOR rec IN
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY reference_no ORDER BY id) AS rn
      FROM public.qddr_reports
      WHERE reference_no IS NOT NULL
    ) t
    WHERE t.rn > 1
    ORDER BY id
  LOOP
    v_max := v_max + 1;
    UPDATE public.qddr_reports
    SET reference_no = 'QDDR-' || lpad(v_max::text, 3, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 3. Add UNIQUE constraints to car_reports(reference_no) and qddr_reports(reference_no)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.car_reports'::regclass
      AND contype = 'u'
      AND conname = 'car_reports_reference_no_key'
  ) THEN
    ALTER TABLE public.car_reports
      ADD CONSTRAINT car_reports_reference_no_key UNIQUE (reference_no);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.qddr_reports'::regclass
      AND contype = 'u'
      AND conname = 'qddr_reports_reference_no_key'
  ) THEN
    ALTER TABLE public.qddr_reports
      ADD CONSTRAINT qddr_reports_reference_no_key UNIQUE (reference_no);
  END IF;
END $$;

-- 4. Create atomic database RPC function for generating the next sequential reference_no
--    Avoids PostgREST 1,000-row truncation and serializes sequence calculation via advisory lock.
CREATE OR REPLACE FUNCTION public.next_report_reference(
  p_type text,
  p_year integer DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := upper(trim(coalesce(p_type, '')));
  v_year integer := coalesce(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  v_next_seq integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('next_report_reference_' || v_type));

  IF v_type = 'NCR' THEN
    SELECT COALESCE(
      MAX(CAST(substring(reference_no FROM ('^NCR-' || v_year::text || '-([0-9]+)$')) AS integer)),
      0
    ) + 1
    INTO v_next_seq
    FROM public.ncr_reports
    WHERE reference_no ~ ('^NCR-' || v_year::text || '-[0-9]+$');

    RETURN 'NCR-' || v_year::text || '-' || lpad(v_next_seq::text, 4, '0');

  ELSIF v_type = 'CAR' THEN
    SELECT COALESCE(
      MAX(CAST(substring(reference_no FROM '^CAR-([0-9]+)$') AS integer)),
      0
    ) + 1
    INTO v_next_seq
    FROM public.car_reports
    WHERE reference_no ~ '^CAR-[0-9]+$';

    RETURN 'CAR-' || lpad(v_next_seq::text, 3, '0');

  ELSIF v_type = 'QDDR' THEN
    SELECT COALESCE(
      MAX(CAST(substring(reference_no FROM '^QDDR-([0-9]+)$') AS integer)),
      0
    ) + 1
    INTO v_next_seq
    FROM public.qddr_reports
    WHERE reference_no ~ '^QDDR-[0-9]+$';

    RETURN 'QDDR-' || lpad(v_next_seq::text, 3, '0');

  ELSE
    RAISE EXCEPTION 'Unsupported report type for reference generation: %', p_type;
  END IF;
END;
$$;

COMMIT;
