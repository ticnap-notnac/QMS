-- Migration: Add audit_schedule_id to qddr_reports and create qddr_clause_links table

-- 1. Add audit_schedule_id to qddr_reports
ALTER TABLE qddr_reports
ADD COLUMN IF NOT EXISTS audit_schedule_id UUID REFERENCES audit_schedules(id) ON DELETE SET NULL;

-- 2. Create qddr_clause_links table
CREATE TABLE IF NOT EXISTS qddr_clause_links (
  id            BIGSERIAL PRIMARY KEY,
  qddr_report_id BIGINT NOT NULL REFERENCES qddr_reports(id) ON DELETE CASCADE,
  clause_id     UUID   NOT NULL REFERENCES iso_clauses(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(qddr_report_id, clause_id)
);

-- Index for fast lookup of all QDDRs linked to a given clause
CREATE INDEX IF NOT EXISTS idx_qddr_clause_links_clause_id ON qddr_clause_links(clause_id);

-- Index for fast lookup of all clauses linked to a given QDDR
CREATE INDEX IF NOT EXISTS idx_qddr_clause_links_qddr_id ON qddr_clause_links(qddr_report_id);
