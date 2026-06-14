-- Migration 013: Multi-site isolation.
-- Creates a sites table, links users + all report tables to a site,
-- and applies RLS so each user only sees data for their own site.

-- ─── 1. SITES TABLE ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sites (
  id   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  site_name text NOT NULL UNIQUE,
  site_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the two known sites
INSERT INTO public.sites (site_name, site_code)
VALUES
  ('San Pedro', 'SAN_PEDRO'),
  ('Makati',    'MAKATI')
ON CONFLICT (site_code) DO NOTHING;

-- ─── 2. ADD site_id COLUMNS ──────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS site_id bigint REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.ncr_reports
  ADD COLUMN IF NOT EXISTS site_id bigint REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.car_reports
  ADD COLUMN IF NOT EXISTS site_id bigint REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.qddr_reports
  ADD COLUMN IF NOT EXISTS site_id bigint REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.audit_schedules
  ADD COLUMN IF NOT EXISTS site_id bigint REFERENCES public.sites(id) ON DELETE SET NULL;

-- ─── 3. INDEXES ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_site_id           ON public.users           (site_id);
CREATE INDEX IF NOT EXISTS idx_ncr_reports_site_id     ON public.ncr_reports     (site_id);
CREATE INDEX IF NOT EXISTS idx_car_reports_site_id     ON public.car_reports     (site_id);
CREATE INDEX IF NOT EXISTS idx_qddr_reports_site_id    ON public.qddr_reports    (site_id);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_site_id ON public.audit_schedules (site_id);

-- ─── 4. HELPER FUNCTION: resolve calling user's site_id ──────────────────────
-- Used inside RLS policies to avoid repeated sub-selects.

CREATE OR REPLACE FUNCTION public.current_user_site_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT site_id
  FROM   public.users
  WHERE  auth_id = auth.uid()
  LIMIT  1;
$$;

-- ─── 5. RLS — SITES TABLE (read-only for all authenticated users) ────────────

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read sites" ON public.sites;
CREATE POLICY "Authenticated users can read sites"
ON public.sites FOR SELECT
TO authenticated
USING (true);

-- ─── 6. RLS — NCR REPORTS ────────────────────────────────────────────────────

ALTER TABLE public.ncr_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site-scoped select ncr_reports"  ON public.ncr_reports;
DROP POLICY IF EXISTS "Site-scoped insert ncr_reports"  ON public.ncr_reports;
DROP POLICY IF EXISTS "Site-scoped update ncr_reports"  ON public.ncr_reports;
DROP POLICY IF EXISTS "Site-scoped delete ncr_reports"  ON public.ncr_reports;

CREATE POLICY "Site-scoped select ncr_reports"
ON public.ncr_reports FOR SELECT
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped insert ncr_reports"
ON public.ncr_reports FOR INSERT
TO authenticated
WITH CHECK (
  site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped update ncr_reports"
ON public.ncr_reports FOR UPDATE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped delete ncr_reports"
ON public.ncr_reports FOR DELETE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

-- ─── 7. RLS — CAR REPORTS ────────────────────────────────────────────────────

ALTER TABLE public.car_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site-scoped select car_reports" ON public.car_reports;
DROP POLICY IF EXISTS "Site-scoped insert car_reports" ON public.car_reports;
DROP POLICY IF EXISTS "Site-scoped update car_reports" ON public.car_reports;
DROP POLICY IF EXISTS "Site-scoped delete car_reports" ON public.car_reports;

CREATE POLICY "Site-scoped select car_reports"
ON public.car_reports FOR SELECT
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped insert car_reports"
ON public.car_reports FOR INSERT
TO authenticated
WITH CHECK (
  site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped update car_reports"
ON public.car_reports FOR UPDATE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped delete car_reports"
ON public.car_reports FOR DELETE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

-- ─── 8. RLS — QDDR REPORTS ───────────────────────────────────────────────────

ALTER TABLE public.qddr_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site-scoped select qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Site-scoped insert qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Site-scoped update qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Site-scoped delete qddr_reports" ON public.qddr_reports;

CREATE POLICY "Site-scoped select qddr_reports"
ON public.qddr_reports FOR SELECT
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped insert qddr_reports"
ON public.qddr_reports FOR INSERT
TO authenticated
WITH CHECK (
  site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped update qddr_reports"
ON public.qddr_reports FOR UPDATE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped delete qddr_reports"
ON public.qddr_reports FOR DELETE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

-- ─── 9. RLS — AUDIT SCHEDULES ────────────────────────────────────────────────

ALTER TABLE public.audit_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site-scoped select audit_schedules" ON public.audit_schedules;
DROP POLICY IF EXISTS "Site-scoped insert audit_schedules" ON public.audit_schedules;
DROP POLICY IF EXISTS "Site-scoped update audit_schedules" ON public.audit_schedules;
DROP POLICY IF EXISTS "Site-scoped delete audit_schedules" ON public.audit_schedules;

CREATE POLICY "Site-scoped select audit_schedules"
ON public.audit_schedules FOR SELECT
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped insert audit_schedules"
ON public.audit_schedules FOR INSERT
TO authenticated
WITH CHECK (
  site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped update audit_schedules"
ON public.audit_schedules FOR UPDATE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

CREATE POLICY "Site-scoped delete audit_schedules"
ON public.audit_schedules FOR DELETE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);
