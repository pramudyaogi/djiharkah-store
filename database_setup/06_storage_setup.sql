-- 06_storage_setup.sql

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
('products', 'products', true),
('banners', 'banners', true),
('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup RLS for storage.objects

-- Pastikan RLS aktif (biasanya sudah aktif di Supabase, tapi untuk berjaga-jaga)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- BUCKET: products
CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admin Insert Products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND is_admin());
CREATE POLICY "Admin Update Products" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND is_admin());
CREATE POLICY "Admin Delete Products" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND is_admin());

-- BUCKET: banners
CREATE POLICY "Public Access Banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admin Insert Banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND is_admin());
CREATE POLICY "Admin Update Banners" ON storage.objects FOR UPDATE USING (bucket_id = 'banners' AND is_admin());
CREATE POLICY "Admin Delete Banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND is_admin());

-- BUCKET: profiles
CREATE POLICY "Public Access Profiles" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');

-- Customer can upload to profiles (folder based on their user ID)
-- The file path usually starts with user_id/filename.ext
CREATE POLICY "User Upload Avatar" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'profiles' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "User Update Avatar" ON storage.objects FOR UPDATE USING (
    bucket_id = 'profiles' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "User Delete Avatar" ON storage.objects FOR DELETE USING (
    bucket_id = 'profiles' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin can also manage profiles bucket
CREATE POLICY "Admin Insert Profiles" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles' AND is_admin());
CREATE POLICY "Admin Update Profiles" ON storage.objects FOR UPDATE USING (bucket_id = 'profiles' AND is_admin());
CREATE POLICY "Admin Delete Profiles" ON storage.objects FOR DELETE USING (bucket_id = 'profiles' AND is_admin());
