CREATE TABLE public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expected numeric NOT NULL DEFAULT 0,
  actual numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_counts TO authenticated;
GRANT ALL ON public.stock_counts TO service_role;
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON public.stock_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write" ON public.stock_counts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.stock_counts FOR EACH ROW EXECUTE FUNCTION public.write_audit();