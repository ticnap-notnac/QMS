-- Migration: create positions table for positions management catalog

CREATE TABLE IF NOT EXISTS public.positions (
  id BIGSERIAL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  position_name text NOT NULL UNIQUE
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON public.positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role" ON public.positions USING (true) WITH CHECK (true);
