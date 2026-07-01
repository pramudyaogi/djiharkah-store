-- Add tiktok column to store_settings
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '@djiharkah.store';
