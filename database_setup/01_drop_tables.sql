-- 01_drop_tables.sql
-- Hapus triggers jika ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Trigger pada tabel order otomatis terhapus saat tabelnya didrop

-- Hapus fungsi
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS update_stock_on_order() CASCADE;
DROP FUNCTION IF EXISTS update_stock_on_order_item() CASCADE;

-- Hapus tabel berurutan dari anak (foreign key) ke induk
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS stock_movement CASCADE;
DROP TABLE IF EXISTS voucher CASCADE;
DROP TABLE IF EXISTS review CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS banner CASCADE;
DROP TABLE IF EXISTS shipment CASCADE;
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS "order" CASCADE;
DROP TABLE IF EXISTS address CASCADE;
DROP TABLE IF EXISTS cart_item CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS product_image CASCADE;
DROP TABLE IF EXISTS product_variant CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS brand CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Catatan: auth.users tidak dihapus karena itu bawaan Supabase
