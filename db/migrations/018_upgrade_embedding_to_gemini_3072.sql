-- ============================================================
-- Migration 018 (CORRECTED): Upgrade embedding to gemini-embedding-001
-- Uses outputDimensionality: 768 on API side → vector(768) in DB
-- HNSW index supports up to 2000 dims → 768 is safe
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Clean up anything from the failed previous attempt
DROP INDEX IF EXISTS case_repository_embedding_idx;
DROP FUNCTION IF EXISTS match_cases(vector, float, int);
DROP FUNCTION IF EXISTS match_cases(vector(3072), float, int);
DROP FUNCTION IF EXISTS match_cases(vector(768), float, int);

-- Step 2: Drop whatever embedding column exists (768 or 3072)
ALTER TABLE public.case_repository DROP COLUMN IF EXISTS embedding;

-- Step 3: Add embedding column at 768 dims
-- (gemini-embedding-001 with outputDimensionality:768 returns exactly 768 floats)
ALTER TABLE public.case_repository
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Step 4: Create the HNSW index (768 < 2000 dim limit, this will succeed)
CREATE INDEX IF NOT EXISTS case_repository_embedding_idx
  ON public.case_repository
  USING hnsw (embedding vector_cosine_ops);

-- Step 5: Recreate match_cases RPC for vector(768)
CREATE OR REPLACE FUNCTION match_cases(
  query_embedding vector(768),
  match_threshold float,
  match_count     int
)
RETURNS TABLE (
  id                  bigint,
  corrective_action   text,
  preventive_action   text,
  effectiveness_score float,
  issue_type          text,
  times_used          int,
  severity            text,
  department_id       bigint,
  product_type        text,
  similarity          float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cr.id,
    cr.corrective_action,
    cr.preventive_action,
    cr.effectiveness_score,
    cr.issue_type,
    cr.times_used,
    cr.severity,
    cr.department_id,
    cr.product_type,
    1 - (cr.embedding <=> query_embedding) AS similarity
  FROM public.case_repository cr
  WHERE cr.embedding IS NOT NULL
    AND 1 - (cr.embedding <=> query_embedding) > match_threshold
  ORDER BY cr.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Done. Verify with:
-- SELECT column_name, data_type, udt_name FROM information_schema.columns
-- WHERE table_name = 'case_repository' AND column_name = 'embedding';
