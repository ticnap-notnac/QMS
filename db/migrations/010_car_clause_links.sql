-- Junction table: links one CAR to one or more ISO standard clauses.
-- Enables hard relational traceability between corrective actions and the
-- specific ISO requirements they address.
--
-- NOTE: iso_clauses.id is UUID, car_reports.id is BIGINT (serial).
CREATE TABLE IF NOT EXISTS car_clause_links (
  id            BIGSERIAL PRIMARY KEY,
  car_report_id BIGINT NOT NULL REFERENCES car_reports(id) ON DELETE CASCADE,
  clause_id     UUID   NOT NULL REFERENCES iso_clauses(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(car_report_id, clause_id)
);

-- Index for fast lookup of all CARs linked to a given clause
CREATE INDEX IF NOT EXISTS idx_car_clause_links_clause_id ON car_clause_links(clause_id);

-- Index for fast lookup of all clauses linked to a given CAR
CREATE INDEX IF NOT EXISTS idx_car_clause_links_car_id ON car_clause_links(car_report_id);
