-- Add archiving columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Update order_items foreign key to ON DELETE SET NULL so deleting products won't break transaction history
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Update the handle_order_item_insertion trigger to automatically archive on stock reaching 0
CREATE OR REPLACE FUNCTION public.handle_order_item_insertion()
RETURNS TRIGGER AS $$
DECLARE
  v_promo_id UUID;
  v_has_stock BOOLEAN;
BEGIN
  -- Kurangi stok pada produk utama
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;

  -- Cari promo aktif yang mencakup produk ini
  SELECT id INTO v_promo_id
  FROM public.promotions
  WHERE is_active = TRUE
    AND id IN (
      SELECT promo_id 
      FROM public.promo_products 
      WHERE product_id = NEW.product_id
    )
  LIMIT 1;

  -- Jika produk ini ada dalam promo aktif, kurangi stok promonya
  IF v_promo_id IS NOT NULL THEN
    UPDATE public.promo_products
    SET promo_stock = GREATEST(0, promo_stock - NEW.quantity)
    WHERE product_id = NEW.product_id
      AND promo_id = v_promo_id;

    -- Periksa apakah masih ada produk lain di promo ini yang memiliki promo_stock > 0
    SELECT EXISTS (
      SELECT 1 
      FROM public.promo_products 
      WHERE promo_id = v_promo_id 
        AND promo_stock > 0
    ) INTO v_has_stock;

    -- Jika tidak ada lagi produk dengan promo_stock > 0, matikan promonya secara otomatis
    IF NOT v_has_stock THEN
      UPDATE public.promotions
      SET is_active = FALSE
      WHERE id = v_promo_id;
    END IF;
  END IF;

  -- Jika stok habis, matikan is_active pada produk utama dan masukkan ke arsip
  UPDATE public.products
  SET is_active = false,
      is_archived = true,
      archived_at = NOW()
  WHERE id = NEW.product_id AND stock <= 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a BEFORE UPDATE trigger on products to automatically manage archiving state based on stock
CREATE OR REPLACE FUNCTION public.handle_product_stock_archive()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock = 0 THEN
    NEW.is_archived := true;
    NEW.archived_at := COALESCE(NEW.archived_at, NOW());
    NEW.is_active := false;
  ELSIF NEW.stock > 0 AND NEW.is_archived = true THEN
    NEW.is_archived := false;
    NEW.archived_at := NULL;
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_stock_archive ON public.products;
CREATE TRIGGER trigger_product_stock_archive
  BEFORE UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_stock_archive();
