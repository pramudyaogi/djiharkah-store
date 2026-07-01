-- Add discount_percent and sort_order to promo_products table
ALTER TABLE public.promo_products ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.promo_products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0 NOT NULL;

-- Enable admin update policy for promo_products
DROP POLICY IF EXISTS "Only admins can update promo products" ON public.promo_products;
CREATE POLICY "Only admins can update promo products" ON public.promo_products
  FOR UPDATE USING (public.is_admin());
