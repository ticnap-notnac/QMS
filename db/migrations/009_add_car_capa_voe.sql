-- Add CAPA and VoE columns to the car_reports table
ALTER TABLE car_reports
ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT,
ADD COLUMN IF NOT EXISTS corrective_action TEXT,
ADD COLUMN IF NOT EXISTS preventive_action TEXT,
ADD COLUMN IF NOT EXISTS capa_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
