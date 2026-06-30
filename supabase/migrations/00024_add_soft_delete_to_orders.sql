-- Migration: Add is_deleted column for soft delete support on orders
-- ============================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
