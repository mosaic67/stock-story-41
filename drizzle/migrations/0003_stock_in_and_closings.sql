CREATE OR REPLACE FUNCTION public.sync_stock_from_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s numeric;
BEGIN
  IF TG_OP IN ('DELETE','UPDATE') AND OLD.product_id IS NOT NULL
     AND COALESCE((SELECT deduct_stock FROM transactions WHERE id = OLD.transaction_id), true) THEN
    s := CASE WHEN (SELECT kind FROM transactions WHERE id = OLD.transaction_id) = 'stock_in' THEN -1 ELSE 1 END;
    UPDATE products SET stock = stock + s * item_base_qty(OLD.product_id, OLD.unit_name, OLD.qty) WHERE id = OLD.product_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.product_id IS NOT NULL
     AND COALESCE((SELECT deduct_stock FROM transactions WHERE id = NEW.transaction_id), true) THEN
    s := CASE WHEN (SELECT kind FROM transactions WHERE id = NEW.transaction_id) = 'stock_in' THEN -1 ELSE 1 END;
    UPDATE products SET stock = stock - s * item_base_qty(NEW.product_id, NEW.unit_name, NEW.qty) WHERE id = NEW.product_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TABLE public.stock_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  month text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit text NOT NULL DEFAULT '',
  expected_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  sold_qty numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_closings TO authenticated;
GRANT ALL ON public.stock_closings TO service_role;
ALTER TABLE public.stock_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read closings" ON public.stock_closings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write closings" ON public.stock_closings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_audit_stock_closings AFTER INSERT OR UPDATE OR DELETE ON public.stock_closings FOR EACH ROW EXECUTE FUNCTION public.write_audit();