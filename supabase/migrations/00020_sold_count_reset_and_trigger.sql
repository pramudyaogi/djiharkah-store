-- Migration: Reset sold_count to 0 & auto-increment on order completion
-- ============================================================

-- 1. Pastikan kolom sold_count ada di tabel products
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER NOT NULL DEFAULT 0;

-- 2. Reset semua sold_count ke 0
UPDATE products SET sold_count = 0;

-- 3. Fungsi trigger: increment sold_count ketika status order berubah jadi 'processing'
CREATE OR REPLACE FUNCTION increment_sold_count_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Hanya jalankan jika status berubah MENJADI 'processing'
  IF NEW.status = 'processing'::order_status AND (OLD.status IS NULL OR OLD.status <> 'processing'::order_status) THEN
    -- Update sold_count untuk setiap item dalam order
    UPDATE products p
    SET sold_count = sold_count + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop trigger lama jika ada, lalu buat baru
DROP TRIGGER IF EXISTS trg_increment_sold_count ON orders;

CREATE TRIGGER trg_increment_sold_count
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_sold_count_on_complete();
