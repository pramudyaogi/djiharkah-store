-- Add original_price, discount_percent, and images array columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) CHECK (original_price >= 0),
ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Migrate existing products: set original_price to equal current price and initialize images array with image_url
UPDATE public.products 
SET original_price = COALESCE(original_price, price),
    images = CASE 
      WHEN (images IS NULL OR images = '{}') AND image_url IS NOT NULL THEN ARRAY[image_url]
      ELSE COALESCE(images, '{}')
    END;
