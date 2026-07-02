-- Add description_en to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Add name_en and description_en to promotions table
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Add description_en to store_settings table
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Seed some EN names and descriptions for existing promotions
UPDATE public.promotions
SET name_en = 'Limited Flash Sale!',
    description_en = 'Crazy discounts for a limited time'
WHERE type = 'flash_sale';

UPDATE public.promotions
SET name_en = 'Special Promo',
    description_en = 'Special collection welcoming the holy month'
WHERE type = 'custom_promo';

UPDATE public.store_settings
SET description_en = 'Exclusive Muslim fashion center that presents luxury and comfort in every piece of fabric to perfect your worship.'
WHERE id = 1;
