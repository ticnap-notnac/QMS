UPDATE public.roles
SET permissions = jsonb_set(
  permissions,
  '{rights}',
  (
    SELECT jsonb_agg(DISTINCT elem)
    FROM jsonb_array_elements_text(
      COALESCE(permissions->'rights', '[]'::jsonb) || '["view_ncr_reports", "view_car_reports", "view_qddr_reports"]'::jsonb
    ) AS elem
  )
)
WHERE role_name IN ('Admin', 'Auditor', 'Team Leader', 'Warehouse Supervisor', 'Warehouse Executive');

UPDATE public.roles
SET permissions = jsonb_set(
  permissions,
  '{rights}',
  (
    SELECT jsonb_agg(DISTINCT elem)
    FROM jsonb_array_elements_text(
      COALESCE(permissions->'rights', '[]'::jsonb) || '["view_ncr_reports", "view_car_reports"]'::jsonb
    ) AS elem
  )
)
WHERE role_name IN ('Checker', 'Warehouse Checker');

UPDATE public.roles
SET permissions = jsonb_set(
  permissions,
  '{rights}',
  (
    SELECT jsonb_agg(DISTINCT elem)
    FROM jsonb_array_elements_text(
      COALESCE(permissions->'rights', '[]'::jsonb) || '["view_ncr_reports"]'::jsonb
    ) AS elem
  )
)
WHERE role_name NOT IN ('Admin', 'Auditor', 'Team Leader', 'Warehouse Supervisor', 'Warehouse Executive', 'Checker', 'Warehouse Checker');
