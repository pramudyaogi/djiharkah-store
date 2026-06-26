-- Create store_reviews table
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view store reviews (but we will limit what fields they see via the app, RLS allows selecting all rows)
DO $$ BEGIN
    CREATE POLICY "Store reviews are viewable by everyone" ON public.store_reviews FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policy: Anyone can insert reviews (Guests and Authenticated)
DO $$ BEGIN
    CREATE POLICY "Anyone can create store reviews" ON public.store_reviews FOR INSERT WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policy: Admins can delete reviews
DO $$ BEGIN
    CREATE POLICY "Admins can delete store reviews" ON public.store_reviews FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add a dummy review for demonstration purposes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.store_reviews) THEN
        INSERT INTO public.store_reviews (guest_name, rating, comment)
        VALUES (
            'Budi Santoso', 
            5, 
            'Pelayanan toko sangat luar biasa! Barangnya asli dan pengirimannya sangat cepat. Terima kasih Djiharkah Store.'
        );
    END IF;
END $$;
