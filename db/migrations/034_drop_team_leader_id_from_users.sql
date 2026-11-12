BEGIN;

-- 1. Update trigger function so it no longer references team_leader_id
CREATE OR REPLACE FUNCTION public.prevent_user_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
BEGIN
  IF jwt_role = 'service_role'
     OR (jwt_role = '' AND current_user IN ('postgres', 'supabase_admin', 'service_role')) THEN
    RETURN NEW;
  END IF;

  IF NEW.role_id IS DISTINCT FROM OLD.role_id
     OR NEW.site_id IS DISTINCT FROM OLD.site_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.position_id IS DISTINCT FROM OLD.position_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR NEW.auth_id IS DISTINCT FROM OLD.auth_id
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Insufficient privileges to modify protected user fields (role, site, department, position, status, email, or credentials).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Drop index and column from public.users
DROP INDEX IF EXISTS public.idx_users_team_leader_id;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS team_leader_id;

COMMIT;
