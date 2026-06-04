-- Migration: Add audit_schedule_id to car_reports
ALTER TABLE car_reports
ADD COLUMN IF NOT EXISTS audit_schedule_id UUID REFERENCES audit_schedules(id) ON DELETE SET NULL;
