-- Migration: Tambah kolom free_shipping pada tabel products
ALTER TABLE products ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN NOT NULL DEFAULT true;
