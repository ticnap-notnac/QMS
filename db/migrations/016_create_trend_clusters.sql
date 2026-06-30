-- Migration: create trend_clusters table for AI summaries

CREATE TABLE IF NOT EXISTS public.trend_clusters (
    id BIGSERIAL PRIMARY KEY,
    product_type_id bigint REFERENCES public.product_types(id) ON DELETE SET NULL,
    issue_type_id bigint REFERENCES public.issue_types(id) ON DELETE SET NULL,
    department_id bigint REFERENCES public.departments(id) ON DELETE SET NULL,
    location_id bigint REFERENCES public.locations(id) ON DELETE SET NULL,
    keywords JSONB DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ncr_reports 
ADD COLUMN IF NOT EXISTS trend_cluster_id bigint REFERENCES public.trend_clusters(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.trend_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON public.trend_clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all actions for service role" ON public.trend_clusters USING (true) WITH CHECK (true);
