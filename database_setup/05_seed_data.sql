-- 05_seed_data.sql

-- 1. Insert Categories
INSERT INTO category (name, slug, description, image_url, sort_order) VALUES
('Excellent', 'excellent', 'Koleksi Sarung Excellent premium dari Djiharkah', 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=600', 1),
('Royal', 'royal', 'Koleksi Sarung Royal dengan kualitas terbaik', 'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?q=80&w=600', 2),
('Masterpiece', 'masterpiece', 'Koleksi Masterpiece edisi terbatas', 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=600', 3),
('Second', 'second', 'Koleksi Sarung Second berkualitas', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600', 4),
('Gajah Duduk', 'gajah-duduk', 'Koleksi Sarung Gajah Duduk asli', 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?q=80&w=600', 5);

-- 2. Insert Brand
INSERT INTO brand (name, slug, description, image_url) VALUES
('Djiharkah', 'djiharkah', 'Brand resmi Djiharkah', 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=600'),
('Gajah Duduk', 'gajah-duduk-brand', 'Brand resmi Gajah Duduk', 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?q=80&w=600');

-- 3. Insert Products (10 items)
-- Untuk memudahkan, kita ambil UUID dari category yang baru diinsert.
-- Tapi di SQL murni tanpa procedural, kita bisa pakai subquery.

DO $$
DECLARE
    cat_excellent UUID;
    cat_royal UUID;
    cat_masterpiece UUID;
    brand_djiharkah UUID;
    brand_gd UUID;
    p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID; p7 UUID; p8 UUID; p9 UUID; p10 UUID;
BEGIN
    SELECT id INTO cat_excellent FROM category WHERE slug = 'excellent';
    SELECT id INTO cat_royal FROM category WHERE slug = 'royal';
    SELECT id INTO cat_masterpiece FROM category WHERE slug = 'masterpiece';
    SELECT id INTO brand_djiharkah FROM brand WHERE slug = 'djiharkah';
    SELECT id INTO brand_gd FROM brand WHERE slug = 'gajah-duduk-brand';

    -- Insert Products
    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_excellent, brand_djiharkah, 'Sarung Excellent Gold', 'sarung-excellent-gold', 'Sarung premium dengan sentuhan warna emas.', 350000, 500, true) RETURNING id INTO p1;
    
    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_excellent, brand_djiharkah, 'Sarung Excellent Silver', 'sarung-excellent-silver', 'Sarung premium dengan sentuhan warna silver.', 320000, 500, false) RETURNING id INTO p2;
    
    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_excellent, brand_djiharkah, 'Sarung Excellent Bronze', 'sarung-excellent-bronze', 'Sarung premium varian bronze.', 300000, 500, false) RETURNING id INTO p3;

    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_royal, brand_djiharkah, 'Sarung Royal Black', 'sarung-royal-black', 'Sarung royal elegan berwarna hitam legam.', 450000, 550, true) RETURNING id INTO p4;
    
    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_royal, brand_djiharkah, 'Sarung Royal White', 'sarung-royal-white', 'Sarung royal suci berwarna putih.', 450000, 550, false) RETURNING id INTO p5;
    
    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_royal, brand_djiharkah, 'Sarung Royal Maroon', 'sarung-royal-maroon', 'Sarung royal maroon.', 450000, 550, false) RETURNING id INTO p6;

    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_masterpiece, brand_djiharkah, 'Sarung Masterpiece Signature', 'sarung-masterpiece-signature', 'Karya seni dalam bentuk sarung.', 850000, 600, true) RETURNING id INTO p7;
    
    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_masterpiece, brand_djiharkah, 'Sarung Masterpiece Classic', 'sarung-masterpiece-classic', 'Desain klasik yang tak lekang oleh waktu.', 800000, 600, false) RETURNING id INTO p8;
    
    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES 
    (cat_masterpiece, brand_djiharkah, 'Sarung Masterpiece Modern', 'sarung-masterpiece-modern', 'Karya masterpiece dengan sentuhan modern.', 820000, 600, false) RETURNING id INTO p9;

    INSERT INTO product (category_id, brand_id, name, slug, description, base_price, weight, is_featured)
    VALUES (cat_excellent, brand_gd, 'Gajah Duduk Excellent', 'gajah-duduk-excellent', 'Sarung Gajah Duduk varian excellent.', 250000, 500, true) RETURNING id INTO p10;

    -- Insert Variants
    INSERT INTO product_variant (product_id, size, color, sku, price, stock) VALUES
    (p1, 'All Size', 'Gold-Black', 'EXC-GLD-01', 350000, 50),
    (p2, 'All Size', 'Silver-Black', 'EXC-SLV-01', 320000, 30),
    (p3, 'All Size', 'Bronze', 'EXC-BRZ-01', 300000, 40),
    (p4, 'All Size', 'Black', 'RYL-BLK-01', 450000, 20),
    (p5, 'All Size', 'White', 'RYL-WHT-01', 450000, 25),
    (p6, 'All Size', 'Maroon', 'RYL-MRN-01', 450000, 15),
    (p7, 'All Size', 'Multicolor', 'MST-SIG-01', 850000, 10),
    (p8, 'All Size', 'Classic', 'MST-CLS-01', 800000, 12),
    (p9, 'All Size', 'Modern', 'MST-MDR-01', 820000, 15),
    (p10, 'All Size', 'Mix', 'GD-EXC-01', 250000, 100);

    -- Insert Images
    INSERT INTO product_image (product_id, image_url, sort_order) VALUES
    (p1, 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=600', 1),
    (p2, 'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?q=80&w=600', 1),
    (p3, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=600', 1),
    (p4, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600', 1),
    (p5, 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?q=80&w=600', 1),
    (p6, 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=600', 1),
    (p7, 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=600', 1),
    (p8, 'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?q=80&w=600', 1),
    (p9, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=600', 1),
    (p10, 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?q=80&w=600', 1);

END $$;

-- 4. Insert Banners
INSERT INTO banner (title, subtitle, image_url, link_url, sort_order) VALUES
('Koleksi Ramadhan', 'Sambut bulan suci dengan koleksi terbaik dari Djiharkah', 'https://images.unsplash.com/photo-1606822214690-67c4ee3a9f02?q=80&w=1200', '/category/masterpiece', 1),
('Gajah Duduk Special', 'Diskon khusus untuk koleksi Gajah Duduk', 'https://images.unsplash.com/photo-1582214680872-9654157ce871?q=80&w=1200', '/category/gajah-duduk', 2);

-- 5. Insert Settings
INSERT INTO settings (key, value, group_name) VALUES
('store_info', '{"name": "Djiharkah Store", "phone": "+6281234567890", "email": "admin@djiharkah.com", "address": "Jl. Raya Djiharkah No. 1, Jakarta"}', 'general'),
('social_media', '{"instagram": "https://instagram.com/djiharkah", "facebook": "https://facebook.com/djiharkah"}', 'general');

