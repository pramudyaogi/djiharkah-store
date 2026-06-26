-- 1. Hapus tabel varian (Drop variants table completely)
DROP TABLE IF EXISTS public.product_variants CASCADE;

-- 2. Refactor tabel products
ALTER TABLE public.products
DROP COLUMN IF EXISTS images;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'Stokis';

-- 3. Hapus relasi order_items dengan product_variants jika ada (karena kita hapus varian)
-- Untungnya di skema kita, order_items menunjuk langsung ke products.id, jadi aman.

-- 4. Kembalikan dummy data yang bersih (Opsional tapi membantu testing)
-- Karena struktur berubah, mari kita pastikan data yang ada aman.
UPDATE public.products 
SET product_type = 'Stokis' 
WHERE product_type IS NULL;
