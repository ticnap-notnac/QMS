-- Migration 014: Add Audit Checklist Templates & Run freeze columns
-- Creates templates and template items, adds template link to schedules, and adds requirement snapshot fields to results.

-- ─── 1. TEMPLATES TABLE ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_checklist_templates (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title       text NOT NULL,
  description text,
  standard_id uuid REFERENCES public.iso_standards(id) ON DELETE SET NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  site_id     bigint REFERENCES public.sites(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. CHECKLIST TEMPLATE ITEMS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_checklist_items (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  template_id     bigint NOT NULL REFERENCES public.audit_checklist_templates(id) ON DELETE CASCADE,
  clause_id       uuid REFERENCES public.iso_clauses(id) ON DELETE SET NULL,
  requirement     text NOT NULL,
  what_to_look_for text NOT NULL
);

-- ─── 3. MODIFY SCHEDULES & RESULTS TABLES ──────────────────────────────────────

-- Link schedules to templates
ALTER TABLE public.audit_schedules
  ADD COLUMN IF NOT EXISTS template_id bigint REFERENCES public.audit_checklist_templates(id) ON DELETE SET NULL;

-- Freeze/snapshot columns for audit results
ALTER TABLE public.audit_results
  ADD COLUMN IF NOT EXISTS requirement text,
  ADD COLUMN IF NOT EXISTS what_to_look_for text,
  ADD COLUMN IF NOT EXISTS notes text;

-- ─── 4. INDEXES ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_templates_site_id ON public.audit_checklist_templates(site_id);
CREATE INDEX IF NOT EXISTS idx_audit_templates_std_id  ON public.audit_checklist_templates(standard_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_temp_id ON public.audit_checklist_items(template_id);

-- ─── 5. ROW LEVEL SECURITY (RLS) FOR TEMPLATES ───────────────────────────────

ALTER TABLE public.audit_checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site-scoped select templates" ON public.audit_checklist_templates;
CREATE POLICY "Site-scoped select templates"
ON public.audit_checklist_templates FOR SELECT
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

DROP POLICY IF EXISTS "Site-scoped insert templates" ON public.audit_checklist_templates;
CREATE POLICY "Site-scoped insert templates"
ON public.audit_checklist_templates FOR INSERT
TO authenticated
WITH CHECK (
  site_id = public.current_user_site_id()
);

DROP POLICY IF EXISTS "Site-scoped update templates" ON public.audit_checklist_templates;
CREATE POLICY "Site-scoped update templates"
ON public.audit_checklist_templates FOR UPDATE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

DROP POLICY IF EXISTS "Site-scoped delete templates" ON public.audit_checklist_templates;
CREATE POLICY "Site-scoped delete templates"
ON public.audit_checklist_templates FOR DELETE
TO authenticated
USING (
  site_id IS NULL
  OR site_id = public.current_user_site_id()
);

-- ─── 6. ROW LEVEL SECURITY (RLS) FOR TEMPLATE ITEMS ──────────────────────────

ALTER TABLE public.audit_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site-scoped select checklist items" ON public.audit_checklist_items;
CREATE POLICY "Site-scoped select checklist items"
ON public.audit_checklist_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audit_checklist_templates t
    WHERE t.id = template_id
    AND (t.site_id IS NULL OR t.site_id = public.current_user_site_id())
  )
);

DROP POLICY IF EXISTS "Site-scoped insert checklist items" ON public.audit_checklist_items;
CREATE POLICY "Site-scoped insert checklist items"
ON public.audit_checklist_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.audit_checklist_templates t
    WHERE t.id = template_id
    AND t.site_id = public.current_user_site_id()
  )
);

DROP POLICY IF EXISTS "Site-scoped update checklist items" ON public.audit_checklist_items;
CREATE POLICY "Site-scoped update checklist items"
ON public.audit_checklist_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audit_checklist_templates t
    WHERE t.id = template_id
    AND (t.site_id IS NULL OR t.site_id = public.current_user_site_id())
  )
);

DROP POLICY IF EXISTS "Site-scoped delete checklist items" ON public.audit_checklist_items;
CREATE POLICY "Site-scoped delete checklist items"
ON public.audit_checklist_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audit_checklist_templates t
    WHERE t.id = template_id
    AND (t.site_id IS NULL OR t.site_id = public.current_user_site_id())
  )
);
