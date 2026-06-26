-- 1. Tambahkan kolom admin_reply
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;

-- 2. Update policy untuk Admin update (tapi karena kita pakai RPC jika perlu, atau langsung update)
-- Saat ini kebijakan UPDATE pada tabel ini hanya untuk admin, namun ini sudah ditangani di RLS dasar atau via service role.
-- Tapi untuk amannya, kita buat policy Admin bisa mengupdate
DO $$ BEGIN
    CREATE POLICY "Admin can update store reviews" ON public.store_reviews FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
