-- Migration 040: Restrict default report creation (CAR & QDDR) to Team Leader, QA Officer, and Admin only
-- Updates default column value and strips create_report/create_car_report/create_qddr_report from other roles.

ALTER TABLE public.roles
  ALTER COLUMN permissions SET DEFAULT '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["view_car_reports", "view_qddr_reports", "view_audit_schedules", "view_audit_reports"]}'::jsonb;

-- 1. Remove report creation rights from all roles except Admin variants, QA Officer, and Team Leader
UPDATE public.roles
SET permissions = jsonb_set(
  COALESCE(permissions, '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": []}'::jsonb),
  '{rights}',
  COALESCE(
    (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements_text(COALESCE(permissions->'rights', '[]'::jsonb)) AS elem
      WHERE elem NOT IN ('create_report', 'create_car_report', 'create_qddr_report')
    ),
    '[]'::jsonb
  )
)
WHERE lower(trim(role_name)) NOT IN (
  'admin',
  'super admin',
  'super_admin',
  'system administrator',
  'system_administrator',
  'administrator',
  'superadmin',
  'qa officer',
  'team leader'
);

-- 2. Ensure Admin variants, QA Officer, and Team Leader have create_car_report and create_qddr_report
UPDATE public.roles
SET permissions = jsonb_set(
  COALESCE(permissions, '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": []}'::jsonb),
  '{rights}',
  (
    SELECT jsonb_agg(DISTINCT elem)
    FROM jsonb_array_elements_text(
      COALESCE(permissions->'rights', '[]'::jsonb) || '["create_car_report", "create_qddr_report", "create_report"]'::jsonb
    ) AS elem
  )
)
WHERE lower(trim(role_name)) IN (
  'admin',
  'super admin',
  'super_admin',
  'system administrator',
  'system_administrator',
  'administrator',
  'superadmin',
  'qa officer',
  'team leader'
);
