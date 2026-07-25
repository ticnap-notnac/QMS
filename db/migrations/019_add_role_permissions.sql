-- Migration 019: Add permissions column to roles table and seed default permissions for updated roles

ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report"]}'::jsonb;

-- Seed / Insert roles if they do not exist
INSERT INTO public.roles (role_name, permissions)
VALUES 
  ('Admin', '{"pages": ["dashboard", "reports", "iso", "dcc", "audit_tools", "admin_panel", "settings"], "rights": ["accept_decline_report", "assign_report", "create_report", "edit_delete_report", "submit_capa", "verify_car", "manage_iso", "manage_users", "manage_audit_schedules"]}'::jsonb),
  ('Auditor', '{"pages": ["dashboard", "reports", "iso", "dcc", "audit_tools", "settings"], "rights": ["accept_decline_report", "assign_report", "create_report", "submit_capa", "manage_iso", "manage_audit_schedules"]}'::jsonb),
  ('Checker', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report", "verify_car"]}'::jsonb),
  ('Forklift Operator', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report"]}'::jsonb),
  ('Inventory Analyst', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report"]}'::jsonb),
  ('Team Leader', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report", "accept_decline_report"]}'::jsonb),
  ('Warehouse Checker', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report", "verify_car"]}'::jsonb),
  ('Warehouse Clerk', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report"]}'::jsonb),
  ('Warehouse Executive', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report", "accept_decline_report"]}'::jsonb),
  ('Warehouse Planner', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report"]}'::jsonb),
  ('Warehouse Supervisor', '{"pages": ["dashboard", "reports", "dcc", "settings"], "rights": ["create_report", "accept_decline_report", "assign_report"]}'::jsonb)
ON CONFLICT (role_name) 
DO UPDATE SET permissions = COALESCE(public.roles.permissions, EXCLUDED.permissions);
