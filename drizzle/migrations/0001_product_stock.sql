ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.item_base_qty(_product uuid, _unit text, _qty numeric)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM products WHERE id=_product AND unit=_unit) THEN _qty
    ELSE _qty / NULLIF(COALESCE((SELECT qty_per FROM product_units WHERE product_id=_product AND unit_name=_unit LIMIT 1),1),0)
  END
$$;

CREATE OR REPLACE FUNCTION public.sync_stock_from_items()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('DELETE','UPDATE') AND OLD.product_id IS NOT NULL THEN
    UPDATE products SET stock = stock + item_base_qty(OLD.product_id, OLD.unit_name, OLD.qty) WHERE id = OLD.product_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.product_id IS NOT NULL THEN
    UPDATE products SET stock = stock - item_base_qty(NEW.product_id, NEW.unit_name, NEW.qty) WHERE id = NEW.product_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_sync_stock ON public.transaction_items;
CREATE TRIGGER trg_sync_stock AFTER INSERT OR UPDATE OR DELETE ON public.transaction_items
FOR EACH ROW EXECUTE FUNCTION public.sync_stock_from_items();

ALTER TABLE public.transaction_items DROP CONSTRAINT IF EXISTS transaction_items_transaction_id_fkey;
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;