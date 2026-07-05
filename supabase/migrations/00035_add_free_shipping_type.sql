-- Add free_shipping_type to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS free_shipping_type TEXT DEFAULT 'all';
