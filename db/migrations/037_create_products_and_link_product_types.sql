-- Migration 037: Separate Products (child items) and Product Types (parent categories)
-- 1. Create `public.products` table with foreign key `product_type_id` -> `public.product_types(id)`.
-- 2. Migrate existing individual product entries from `public.product_types` into `public.products`.
-- 3. Clear migrated individual SKU items from `public.product_types` so `product_types` holds true categories.

BEGIN;

CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  product_name text NOT NULL UNIQUE,
  product_type_id bigint REFERENCES public.product_types(id) ON DELETE SET NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow read access to all authenticated users'
  ) THEN
    CREATE POLICY "Allow read access to all authenticated users"
      ON public.products FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow all actions for service role'
  ) THEN
    CREATE POLICY "Allow all actions for service role"
      ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Copy existing product entries from product_types into products (if products table is empty)
INSERT INTO public.products (product_name)
SELECT DISTINCT trim(coalesce(pt.product_name, pt.product_type_name))
FROM public.product_types pt
WHERE trim(coalesce(pt.product_name, pt.product_type_name, '')) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.products p
    WHERE lower(trim(p.product_name)) = lower(trim(coalesce(pt.product_name, pt.product_type_name)))
  );

-- Clear old individual product records from product_types that were moved into products
DELETE FROM public.product_types pt
WHERE EXISTS (
  SELECT 1 FROM public.products p
  WHERE lower(trim(p.product_name)) = lower(trim(coalesce(pt.product_name, pt.product_type_name)))
);

COMMIT;
