-- 1. Mengubah tabel products
-- Hapus constraint/kolom lama jika perlu, dan tambahkan images array
ALTER TABLE public.products
DROP COLUMN IF EXISTS image_url;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Membuat tabel product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  size TEXT,
  color TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price DECIMAL(10,2) CHECK (price >= 0), -- Opsional, jika null berarti ikut harga base produk
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Setup RLS untuk product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Policies untuk product_variants (mengikuti products)
DROP POLICY IF EXISTS "Active product variants are viewable by everyone" ON public.product_variants;
CREATE POLICY "Active product variants are viewable by everyone" 
ON public.product_variants FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.products WHERE products.id = product_variants.product_id AND (products.is_active = TRUE OR is_admin()))
);

DROP POLICY IF EXISTS "Admins can insert product variants" ON public.product_variants;
CREATE POLICY "Admins can insert product variants" 
ON public.product_variants FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update product variants" ON public.product_variants;
CREATE POLICY "Admins can update product variants" 
ON public.product_variants FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete product variants" ON public.product_variants;
CREATE POLICY "Admins can delete product variants" 
ON public.product_variants FOR DELETE USING (is_admin());

-- 4. Trigger updated_at
DROP TRIGGER IF EXISTS set_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER set_product_variants_updated_at 
BEFORE UPDATE ON public.product_variants 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Set up Storage Bucket for products (if not exists)
-- Catatan: Supabase Storage DDL harus dijalankan oleh superuser atau via dashboard jika error.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for products bucket
DROP POLICY IF EXISTS "Public Access to Product Images" ON storage.objects;
CREATE POLICY "Public Access to Product Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'products' AND is_admin() );

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'products' AND is_admin() );

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'products' AND is_admin() );
