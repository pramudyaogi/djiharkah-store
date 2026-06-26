-- Menambahkan kolom display_order ke tabel categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Mengatur ulang urutan display_order berdasarkan abjad nama kategori secara default (sekali jalan saat migrasi)
-- Ini opsional tapi bagus agar urutan awal tidak semua nol
WITH OrderedCategories AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) as new_order
    FROM public.categories
)
UPDATE public.categories
SET display_order = OrderedCategories.new_order
FROM OrderedCategories
WHERE public.categories.id = OrderedCategories.id;
