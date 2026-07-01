-- Menambahkan kolom display_order ke tabel products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Mengatur ulang urutan display_order berdasarkan created_at ASC secara default
WITH OrderedProducts AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
    FROM public.products
)
UPDATE public.products
SET display_order = OrderedProducts.new_order
FROM OrderedProducts
WHERE public.products.id = OrderedProducts.id;
