-- Update the handle_order_item_insertion trigger to support automatic promotion deactivation
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

  -- Jika stok habis, matikan is_active pada produk utama
  UPDATE public.products
  SET is_active = false
  WHERE id = NEW.product_id AND stock <= 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
