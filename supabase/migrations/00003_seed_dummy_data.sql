-- 00003_seed_dummy_data.sql
-- Script untuk memasukkan ulang data dummy agar sesuai dengan skema tabel terbaru

-- 1. Bersihkan data lama jika ada
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.products CASCADE;

-- 2. Masukkan Kategori
INSERT INTO public.categories (name, slug, description) VALUES
('Excellent', 'excellent', 'Koleksi Sarung Excellent premium dari Djiharkah'),
('Royal', 'royal', 'Koleksi Sarung Royal dengan kualitas terbaik'),
('Masterpiece', 'masterpiece', 'Koleksi Masterpiece edisi terbatas'),
('Gajah Duduk', 'gajah-duduk', 'Koleksi Sarung Gajah Duduk asli');

-- 3. Masukkan Produk Menggunakan DO Block
DO $$
DECLARE
    cat_excellent UUID;
    cat_royal UUID;
    cat_masterpiece UUID;
    p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID;
BEGIN
    -- Ambil ID kategori
    SELECT id INTO cat_excellent FROM public.categories WHERE slug = 'excellent';
    SELECT id INTO cat_royal FROM public.categories WHERE slug = 'royal';
    SELECT id INTO cat_masterpiece FROM public.categories WHERE slug = 'masterpiece';

    -- Insert Produk
    INSERT INTO public.products (category_id, name, slug, description, price, stock, is_active, image_url, product_type)
    VALUES 
    (cat_excellent, 'Sarung Excellent Gold', 'sarung-excellent-gold', 'Sarung premium dengan sentuhan warna emas.', 350000, 50, true, 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=600', 'Stokis') RETURNING id INTO p1;
    
    INSERT INTO public.products (category_id, name, slug, description, price, stock, is_active, image_url, product_type)
    VALUES 
    (cat_excellent, 'Sarung Excellent Silver', 'sarung-excellent-silver', 'Sarung premium dengan sentuhan warna silver.', 320000, 30, true, 'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?q=80&w=600', 'Stokis') RETURNING id INTO p2;

    INSERT INTO public.products (category_id, name, slug, description, price, stock, is_active, image_url, product_type)
    VALUES 
    (cat_royal, 'Sarung Royal Black', 'sarung-royal-black', 'Sarung royal elegan berwarna hitam legam.', 450000, 20, true, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600', 'Stokis') RETURNING id INTO p3;
    
    INSERT INTO public.products (category_id, name, slug, description, price, stock, is_active, image_url, product_type)
    VALUES 
    (cat_royal, 'Sarung Royal White', 'sarung-royal-white', 'Sarung royal suci berwarna putih.', 450000, 25, true, 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?q=80&w=600', 'Stokis') RETURNING id INTO p4;

    INSERT INTO public.products (category_id, name, slug, description, price, stock, is_active, image_url, product_type)
    VALUES 
    (cat_masterpiece, 'Sarung Masterpiece Signature', 'sarung-masterpiece-signature', 'Karya seni dalam bentuk sarung.', 850000, 10, true, 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=600', 'Stokis') RETURNING id INTO p5;
    
    INSERT INTO public.products (category_id, name, slug, description, price, stock, is_active, image_url, product_type)
    VALUES 
    (cat_masterpiece, 'Sarung Masterpiece Classic', 'sarung-masterpiece-classic', 'Desain klasik yang tak lekang oleh waktu.', 800000, 12, true, 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=600', 'Stokis') RETURNING id INTO p6;

END $$;
