-- 015_add_performance_indexes.sql
-- Description: Adds B-tree indexes to frequently searched and filtered columns to improve query performance at scale.

-- 1. Users Table Indexes
-- Improves performance when filtering users by department or role (e.g., fetching all auditors)
CREATE INDEX IF NOT EXISTS idx_users_department_id ON public.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
-- Improves performance when searching by authentication ID (which happens on every login)
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

-- 2. NCR Reports Indexes
-- Improves performance when filtering reports by status (e.g., fetching all "OPEN" reports)
CREATE INDEX IF NOT EXISTS idx_ncr_reports_status ON public.ncr_reports(status);
-- Improves performance when filtering reports by department
CREATE INDEX IF NOT EXISTS idx_ncr_reports_department_id ON public.ncr_reports(department_id);
-- Improves performance when searching for a specific batch number
CREATE INDEX IF NOT EXISTS idx_ncr_reports_batch_number ON public.ncr_reports(batch_number);

-- 3. Notifications Indexes
-- Extremely critical: Improves performance for fetching a specific user's unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications(user_id, is_read);
