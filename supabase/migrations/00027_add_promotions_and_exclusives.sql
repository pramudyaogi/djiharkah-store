-- Add is_exclusive column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT FALSE NOT NULL;

-- Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT UNIQUE NOT NULL CHECK (type IN ('flash_sale', 'custom_promo')),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE NOT NULL,
  discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create promo_products join table
CREATE TABLE IF NOT EXISTS public.promo_products (
  promo_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (promo_id, product_id)
);

-- Insert default promotions if not exist
INSERT INTO public.promotions (type, name, description, is_active, discount_percent, ends_at)
VALUES
  ('flash_sale', 'Flash Sale Terbatas!', 'Diskon gila-gilaan waktu terbatas', false, 20, NOW() + INTERVAL '1 day'),
  ('custom_promo', 'Promo Ramadhan', 'Koleksi spesial menyambut bulan suci', false, 15, null)
ON CONFLICT (type) DO NOTHING;

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_products ENABLE ROW LEVEL SECURITY;

-- Policies for promotions
CREATE POLICY "Promotions are viewable by everyone" ON public.promotions
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert promotions" ON public.promotions
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update promotions" ON public.promotions
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete promotions" ON public.promotions
  FOR DELETE USING (public.is_admin());

-- Policies for promo_products
CREATE POLICY "Promo products are viewable by everyone" ON public.promo_products
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert promo products" ON public.promo_products
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete promo products" ON public.promo_products
  FOR DELETE USING (public.is_admin());

-- Trigger to update updated_at on promotions
DROP TRIGGER IF EXISTS set_promotions_updated_at ON public.promotions;
CREATE TRIGGER set_promotions_updated_at BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
