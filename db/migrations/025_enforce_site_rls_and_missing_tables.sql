-- =============================================================================
-- Migration 025: Enforce Site-Scoped RLS & Protect Missing Tables
-- Resolves: SEC-03, Conflict 5
-- =============================================================================

BEGIN;

-- Helper function: checks if current authenticated user is Admin OR holds a specific permission right
CREATE OR REPLACE FUNCTION public.current_user_has_right(required_right text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_current_user_admin() OR EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON r.id = u.role_id
    WHERE u.auth_id = auth.uid()
      AND coalesce(u.status, 'ACTIVE')::text <> 'DEACTIVATED'
      AND r.permissions IS NOT NULL
      AND jsonb_typeof(r.permissions -> 'rights') = 'array'
      AND (r.permissions -> 'rights') ? required_right
  );
$$;

-- =============================================================================
-- 1. DROP LEFTOVER PERMISSIVE POLICIES OVERRIDING SITE ISOLATION
-- =============================================================================

-- On audit_schedules
DROP POLICY IF EXISTS "audit_schedules_select_authenticated" ON public.audit_schedules;
DROP POLICY IF EXISTS "audit_schedules_insert_authenticated" ON public.audit_schedules;
DROP POLICY IF EXISTS "audit_schedules_update_authenticated" ON public.audit_schedules;
DROP POLICY IF EXISTS "audit_schedules_delete_authenticated" ON public.audit_schedules;

-- On qddr_reports
DROP POLICY IF EXISTS "Allow authenticated select on qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Allow authenticated insert on qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Allow authenticated update on qddr_reports" ON public.qddr_reports;

-- On car_reports
DROP POLICY IF EXISTS "car_reports_select_authenticated" ON public.car_reports;
DROP POLICY IF EXISTS "car_reports_insert_authenticated" ON public.car_reports;
DROP POLICY IF EXISTS "car_reports_update_authenticated" ON public.car_reports;

-- On ncr_reports (drop permissive closed read that bypasses site scoping)
DROP POLICY IF EXISTS "authenticated users can read closed ncr reports" ON public.ncr_reports;

-- =============================================================================
-- 2. HARDEN SITE-SCOPED POLICIES WITH STRICT "WITH CHECK"
-- =============================================================================

-- ncr_reports
DROP POLICY IF EXISTS "Site-scoped select ncr_reports" ON public.ncr_reports;
DROP POLICY IF EXISTS "Site-scoped insert ncr_reports" ON public.ncr_reports;
DROP POLICY IF EXISTS "Site-scoped update ncr_reports" ON public.ncr_reports;
DROP POLICY IF EXISTS "Site-scoped delete ncr_reports" ON public.ncr_reports;

CREATE POLICY "Site-scoped select ncr_reports"
  ON public.ncr_reports FOR SELECT TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped insert ncr_reports"
  ON public.ncr_reports FOR INSERT TO authenticated
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped update ncr_reports"
  ON public.ncr_reports FOR UPDATE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()))
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped delete ncr_reports"
  ON public.ncr_reports FOR DELETE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

-- car_reports
DROP POLICY IF EXISTS "Site-scoped select car_reports" ON public.car_reports;
DROP POLICY IF EXISTS "Site-scoped insert car_reports" ON public.car_reports;
DROP POLICY IF EXISTS "Site-scoped update car_reports" ON public.car_reports;
DROP POLICY IF EXISTS "Site-scoped delete car_reports" ON public.car_reports;

CREATE POLICY "Site-scoped select car_reports"
  ON public.car_reports FOR SELECT TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped insert car_reports"
  ON public.car_reports FOR INSERT TO authenticated
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped update car_reports"
  ON public.car_reports FOR UPDATE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()))
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped delete car_reports"
  ON public.car_reports FOR DELETE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

-- qddr_reports
DROP POLICY IF EXISTS "Site-scoped select qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Site-scoped insert qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Site-scoped update qddr_reports" ON public.qddr_reports;
DROP POLICY IF EXISTS "Site-scoped delete qddr_reports" ON public.qddr_reports;

CREATE POLICY "Site-scoped select qddr_reports"
  ON public.qddr_reports FOR SELECT TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped insert qddr_reports"
  ON public.qddr_reports FOR INSERT TO authenticated
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped update qddr_reports"
  ON public.qddr_reports FOR UPDATE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()))
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped delete qddr_reports"
  ON public.qddr_reports FOR DELETE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

-- audit_schedules
DROP POLICY IF EXISTS "Site-scoped select audit_schedules" ON public.audit_schedules;
DROP POLICY IF EXISTS "Site-scoped insert audit_schedules" ON public.audit_schedules;
DROP POLICY IF EXISTS "Site-scoped update audit_schedules" ON public.audit_schedules;
DROP POLICY IF EXISTS "Site-scoped delete audit_schedules" ON public.audit_schedules;

CREATE POLICY "Site-scoped select audit_schedules"
  ON public.audit_schedules FOR SELECT TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped insert audit_schedules"
  ON public.audit_schedules FOR INSERT TO authenticated
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped update audit_schedules"
  ON public.audit_schedules FOR UPDATE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()))
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped delete audit_schedules"
  ON public.audit_schedules FOR DELETE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

-- audit_checklist_templates
DROP POLICY IF EXISTS "Site-scoped select templates" ON public.audit_checklist_templates;
DROP POLICY IF EXISTS "Site-scoped insert templates" ON public.audit_checklist_templates;
DROP POLICY IF EXISTS "Site-scoped update templates" ON public.audit_checklist_templates;
DROP POLICY IF EXISTS "Site-scoped delete templates" ON public.audit_checklist_templates;

CREATE POLICY "Site-scoped select templates"
  ON public.audit_checklist_templates FOR SELECT TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped insert templates"
  ON public.audit_checklist_templates FOR INSERT TO authenticated
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped update templates"
  ON public.audit_checklist_templates FOR UPDATE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()))
  WITH CHECK (((site_id IS NOT DISTINCT FROM public.current_user_site_id()) OR public.is_current_user_admin()));

CREATE POLICY "Site-scoped delete templates"
  ON public.audit_checklist_templates FOR DELETE TO authenticated
  USING (((site_id IS NULL) OR (site_id = public.current_user_site_id()) OR public.is_current_user_admin()));

-- =============================================================================
-- 3. RESTRICT ISO STANDARDS AND CLAUSES TO ADMINS / MANAGE_ISO HOLDERS
-- =============================================================================

-- iso_standards
DROP POLICY IF EXISTS "auth_insert_iso_standards" ON public.iso_standards;
DROP POLICY IF EXISTS "auth_update_iso_standards" ON public.iso_standards;
DROP POLICY IF EXISTS "auth_delete_iso_standards" ON public.iso_standards;
DROP POLICY IF EXISTS "admin_insert_iso_standards" ON public.iso_standards;
DROP POLICY IF EXISTS "admin_update_iso_standards" ON public.iso_standards;
DROP POLICY IF EXISTS "admin_delete_iso_standards" ON public.iso_standards;

CREATE POLICY "admin_insert_iso_standards"
  ON public.iso_standards FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_right('manage_iso'));

CREATE POLICY "admin_update_iso_standards"
  ON public.iso_standards FOR UPDATE TO authenticated
  USING (public.current_user_has_right('manage_iso'))
  WITH CHECK (public.current_user_has_right('manage_iso'));

CREATE POLICY "admin_delete_iso_standards"
  ON public.iso_standards FOR DELETE TO authenticated
  USING (public.current_user_has_right('manage_iso'));

-- iso_clause_groups
DROP POLICY IF EXISTS "auth_insert_iso_clause_groups" ON public.iso_clause_groups;
DROP POLICY IF EXISTS "auth_update_iso_clause_groups" ON public.iso_clause_groups;
DROP POLICY IF EXISTS "admin_insert_iso_clause_groups" ON public.iso_clause_groups;
DROP POLICY IF EXISTS "admin_update_iso_clause_groups" ON public.iso_clause_groups;
DROP POLICY IF EXISTS "admin_delete_iso_clause_groups" ON public.iso_clause_groups;

CREATE POLICY "admin_insert_iso_clause_groups"
  ON public.iso_clause_groups FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_right('manage_iso'));

CREATE POLICY "admin_update_iso_clause_groups"
  ON public.iso_clause_groups FOR UPDATE TO authenticated
  USING (public.current_user_has_right('manage_iso'))
  WITH CHECK (public.current_user_has_right('manage_iso'));

CREATE POLICY "admin_delete_iso_clause_groups"
  ON public.iso_clause_groups FOR DELETE TO authenticated
  USING (public.current_user_has_right('manage_iso'));

-- iso_clauses
DROP POLICY IF EXISTS "auth_insert_iso_clauses" ON public.iso_clauses;
DROP POLICY IF EXISTS "auth_update_iso_clauses" ON public.iso_clauses;
DROP POLICY IF EXISTS "auth_delete_iso_clauses" ON public.iso_clauses;
DROP POLICY IF EXISTS "admin_insert_iso_clauses" ON public.iso_clauses;
DROP POLICY IF EXISTS "admin_update_iso_clauses" ON public.iso_clauses;
DROP POLICY IF EXISTS "admin_delete_iso_clauses" ON public.iso_clauses;

CREATE POLICY "admin_insert_iso_clauses"
  ON public.iso_clauses FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_right('manage_iso'));

CREATE POLICY "admin_update_iso_clauses"
  ON public.iso_clauses FOR UPDATE TO authenticated
  USING (public.current_user_has_right('manage_iso'))
  WITH CHECK (public.current_user_has_right('manage_iso'));

CREATE POLICY "admin_delete_iso_clauses"
  ON public.iso_clauses FOR DELETE TO authenticated
  USING (public.current_user_has_right('manage_iso'));

-- =============================================================================
-- 4. ENABLE RLS AND ADD POLICIES FOR THE 12 UNPROTECTED TABLES (+ car_clause_links)
-- =============================================================================

-- car_clause_links (allow authenticated select + audit schedule managers to unlink)
ALTER TABLE public.car_clause_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow admin and auditor read access to car_clause_links" ON public.car_clause_links;
DROP POLICY IF EXISTS "Allow authenticated select on car_clause_links" ON public.car_clause_links;
DROP POLICY IF EXISTS "Allow authorized delete on car_clause_links" ON public.car_clause_links;
DROP POLICY IF EXISTS "Allow all actions for service role on car_clause_links" ON public.car_clause_links;

CREATE POLICY "Allow authenticated select on car_clause_links"
  ON public.car_clause_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authorized delete on car_clause_links"
  ON public.car_clause_links FOR DELETE TO authenticated
  USING (public.current_user_has_right('manage_audit_schedules') OR public.current_user_has_right('edit_delete_report'));
CREATE POLICY "Allow all actions for service role on car_clause_links"
  ON public.car_clause_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1. issue_types
ALTER TABLE public.issue_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on issue_types" ON public.issue_types;
DROP POLICY IF EXISTS "Allow all actions for service role on issue_types" ON public.issue_types;

CREATE POLICY "Allow authenticated select on issue_types"
  ON public.issue_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on issue_types"
  ON public.issue_types FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. qddr_clause_links
ALTER TABLE public.qddr_clause_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on qddr_clause_links" ON public.qddr_clause_links;
DROP POLICY IF EXISTS "Allow authorized delete on qddr_clause_links" ON public.qddr_clause_links;
DROP POLICY IF EXISTS "Allow all actions for service role on qddr_clause_links" ON public.qddr_clause_links;

CREATE POLICY "Allow authenticated select on qddr_clause_links"
  ON public.qddr_clause_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authorized delete on qddr_clause_links"
  ON public.qddr_clause_links FOR DELETE TO authenticated
  USING (public.current_user_has_right('manage_audit_schedules') OR public.current_user_has_right('edit_delete_report'));
CREATE POLICY "Allow all actions for service role on qddr_clause_links"
  ON public.qddr_clause_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. car_ncr_links
ALTER TABLE public.car_ncr_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on car_ncr_links" ON public.car_ncr_links;
DROP POLICY IF EXISTS "Allow all actions for service role on car_ncr_links" ON public.car_ncr_links;

CREATE POLICY "Allow authenticated select on car_ncr_links"
  ON public.car_ncr_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on car_ncr_links"
  ON public.car_ncr_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. qddr_ncr_links
ALTER TABLE public.qddr_ncr_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on qddr_ncr_links" ON public.qddr_ncr_links;
DROP POLICY IF EXISTS "Allow all actions for service role on qddr_ncr_links" ON public.qddr_ncr_links;

CREATE POLICY "Allow authenticated select on qddr_ncr_links"
  ON public.qddr_ncr_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on qddr_ncr_links"
  ON public.qddr_ncr_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. corrective_actions
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on corrective_actions" ON public.corrective_actions;
DROP POLICY IF EXISTS "Allow all actions for service role on corrective_actions" ON public.corrective_actions;

CREATE POLICY "Allow authenticated select on corrective_actions"
  ON public.corrective_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on corrective_actions"
  ON public.corrective_actions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. preventive_actions
ALTER TABLE public.preventive_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on preventive_actions" ON public.preventive_actions;
DROP POLICY IF EXISTS "Allow all actions for service role on preventive_actions" ON public.preventive_actions;

CREATE POLICY "Allow authenticated select on preventive_actions"
  ON public.preventive_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on preventive_actions"
  ON public.preventive_actions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. ncr_report_ratings
ALTER TABLE public.ncr_report_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on ncr_report_ratings" ON public.ncr_report_ratings;
DROP POLICY IF EXISTS "Allow all actions for service role on ncr_report_ratings" ON public.ncr_report_ratings;

CREATE POLICY "Allow authenticated select on ncr_report_ratings"
  ON public.ncr_report_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on ncr_report_ratings"
  ON public.ncr_report_ratings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. case_repository
ALTER TABLE public.case_repository ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on case_repository" ON public.case_repository;
DROP POLICY IF EXISTS "Allow all actions for service role on case_repository" ON public.case_repository;

CREATE POLICY "Allow authenticated select on case_repository"
  ON public.case_repository FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on case_repository"
  ON public.case_repository FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. ai_predictions
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on ai_predictions" ON public.ai_predictions;
DROP POLICY IF EXISTS "Allow all actions for service role on ai_predictions" ON public.ai_predictions;

CREATE POLICY "Allow authenticated select on ai_predictions"
  ON public.ai_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on ai_predictions"
  ON public.ai_predictions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all actions for service role on documents" ON public.documents;

CREATE POLICY "Allow authenticated select on documents"
  ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role on documents"
  ON public.documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all actions for service role on audit_logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (public.is_current_user_admin());
CREATE POLICY "Allow all actions for service role on audit_logs"
  ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 12. system_log_reads
ALTER TABLE public.system_log_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view system_log_reads" ON public.system_log_reads;
DROP POLICY IF EXISTS "Allow all actions for service role on system_log_reads" ON public.system_log_reads;

CREATE POLICY "Admins can view system_log_reads"
  ON public.system_log_reads FOR SELECT TO authenticated USING (public.is_current_user_admin());
CREATE POLICY "Allow all actions for service role on system_log_reads"
  ON public.system_log_reads FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
