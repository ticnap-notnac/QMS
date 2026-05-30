-- Migration: create locations and product types tables, plus NCR report foreign keys.

CREATE TABLE IF NOT EXISTS public.locations (
  id BIGSERIAL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  location_name text NOT NULL UNIQUE
);

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS location_name text;

CREATE TABLE IF NOT EXISTS public.product_types (
  id BIGSERIAL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  product_name text NOT NULL UNIQUE
);

ALTER TABLE public.product_types
  ADD COLUMN IF NOT EXISTS product_name text;

ALTER TABLE public.product_types
  ADD COLUMN IF NOT EXISTS product_type_name text;

ALTER TABLE public.ncr_reports
  ADD COLUMN IF NOT EXISTS location_id bigint,
  ADD COLUMN IF NOT EXISTS product_type_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'ncr_reports'
      AND constraint_name = 'ncr_reports_location_id_fkey'
  ) THEN
    ALTER TABLE public.ncr_reports
      ADD CONSTRAINT ncr_reports_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'ncr_reports'
      AND constraint_name = 'ncr_reports_product_type_id_fkey'
  ) THEN
    ALTER TABLE public.ncr_reports
      ADD CONSTRAINT ncr_reports_product_type_id_fkey
      FOREIGN KEY (product_type_id) REFERENCES public.product_types(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ncr_reports_location_id ON public.ncr_reports (location_id);
CREATE INDEX IF NOT EXISTS idx_ncr_reports_product_type_id ON public.ncr_reports (product_type_id);

INSERT INTO public.locations (location_name)
SELECT DISTINCT source.complaint_location
FROM public.ncr_reports AS source
WHERE source.complaint_location IS NOT NULL AND source.complaint_location <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.locations existing
    WHERE lower(trim(existing.location_name)) = lower(trim(source.complaint_location))
  );

UPDATE public.ncr_reports r
SET location_id = l.id
FROM public.locations l
WHERE r.location_id IS NULL
  AND r.complaint_location IS NOT NULL
  AND lower(trim(r.complaint_location)) = lower(trim(l.location_name));

INSERT INTO public.product_types (product_name)
SELECT DISTINCT source.product_type
FROM public.ncr_reports AS source
WHERE source.product_type IS NOT NULL AND source.product_type <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_types existing
    WHERE lower(trim(existing.product_name)) = lower(trim(source.product_type))
  );

UPDATE public.ncr_reports r
SET product_type_id = p.id
FROM public.product_types p
WHERE r.product_type_id IS NULL
  AND r.product_type IS NOT NULL
  AND lower(trim(r.product_type)) = lower(trim(p.product_name));
