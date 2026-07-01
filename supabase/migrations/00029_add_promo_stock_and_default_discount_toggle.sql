-- Add use_default_discount to promotions table
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS use_default_discount BOOLEAN DEFAULT TRUE NOT NULL;

-- Add promo_stock to promo_products table
ALTER TABLE public.promo_products ADD COLUMN IF NOT EXISTS promo_stock INTEGER DEFAULT 0 NOT NULL;

-- Update the handle_order_item_insertion trigger to also decrement promo_stock
CREATE OR REPLACE FUNCTION public.handle_order_item_insertion()
RETURNS TRIGGER AS $$
BEGIN
  -- Kurangi stok pada produk utama
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;

  -- Kurangi stok promo jika produk sedang dipromosikan secara aktif
  UPDATE public.promo_products
  SET promo_stock = GREATEST(0, promo_stock - NEW.quantity)
  WHERE product_id = NEW.product_id
    AND promo_id IN (SELECT id FROM public.promotions WHERE is_active = TRUE);

  -- Jika stok habis, matikan is_active pada produk utama
  UPDATE public.products
  SET is_active = false
  WHERE id = NEW.product_id AND stock <= 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
