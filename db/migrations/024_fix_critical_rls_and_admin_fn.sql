-- =============================================================================
-- Migration 024: Fix Critical Public/Anon RLS Exposures & User Self-Escalation
-- Resolves: SEC-01, SEC-02, SEC-06 (Database Layer)
-- =============================================================================

BEGIN;

-- 1. Harden public.is_current_user_admin()
--    Remove insecure `lower(u.user_name) LIKE '%admin%'` check and require ACTIVE status.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON r.id = u.role_id
    WHERE u.auth_id = auth.uid()
      AND coalesce(u.status, 'ACTIVE')::text <> 'DEACTIVATED'
      AND lower(trim(coalesce(r.role_name, ''))) IN (
        'admin',
        'super admin',
        'system administrator',
        'superadmin'
      )
  );
$$;

-- 2. Prevent non-service-role sessions from escalating privileged columns on public.users
CREATE OR REPLACE FUNCTION public.prevent_user_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
BEGIN
  -- Allow backend service_role and direct database admin sessions (where jwt_role is not 'authenticated'/'anon')
  IF jwt_role = 'service_role'
     OR (jwt_role = '' AND current_user IN ('postgres', 'supabase_admin', 'service_role'))
  THEN
    RETURN NEW;
  END IF;

  -- For direct client updates (e.g. authenticated user updating own profile),
  -- forbid modifying privileged / security-sensitive columns.
  IF NEW.role_id IS DISTINCT FROM OLD.role_id
     OR NEW.site_id IS DISTINCT FROM OLD.site_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.position_id IS DISTINCT FROM OLD.position_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR NEW.auth_id IS DISTINCT FROM OLD.auth_id
     OR NEW.email IS DISTINCT FROM OLD.email
  THEN
    RAISE EXCEPTION 'Unauthorized modification of protected user fields (role, site, department, position, status, or credentials).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_self_escalation ON public.users;
CREATE TRIGGER trg_prevent_user_self_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_self_escalation();

-- 3. Fix public.users RLS policies (remove unauthenticated `public` access & make active-check RESTRICTIVE)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restrict access to active users only" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users (temporary)" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

CREATE POLICY "Restrict access to active users only"
  ON public.users
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (((coalesce(status, 'ACTIVE'))::text <> 'DEACTIVATED'::text));

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = auth_id));

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = auth_id))
  WITH CHECK ((auth.uid() = auth_id));

CREATE POLICY "Admins can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Authenticated users can read users (temporary)"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin());

-- 4. Fix public.positions RLS policies (restrict service_role policy to service_role, not public)
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions for service role" ON public.positions;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.positions;

CREATE POLICY "Allow read access to all authenticated users"
  ON public.positions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all actions for service role"
  ON public.positions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Fix public.trend_clusters RLS policies (restrict service_role policy to service_role, not public)
ALTER TABLE public.trend_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions for service role" ON public.trend_clusters;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.trend_clusters;

CREATE POLICY "Allow read access to all authenticated users"
  ON public.trend_clusters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all actions for service role"
  ON public.trend_clusters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Fix public.roles RLS policies (scope to authenticated instead of public, use is_current_user_admin())
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
DROP POLICY IF EXISTS "Allow select roles" ON public.roles;
DROP POLICY IF EXISTS "roles_insert_admin" ON public.roles;
DROP POLICY IF EXISTS "roles_update_admin" ON public.roles;
DROP POLICY IF EXISTS "roles_delete_admin" ON public.roles;

CREATE POLICY "Admins can read roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Authenticated users can read roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Allow select roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "roles_insert_admin"
  ON public.roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "roles_update_admin"
  ON public.roles
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "roles_delete_admin"
  ON public.roles
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin());

COMMIT;
