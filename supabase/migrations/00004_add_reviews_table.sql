-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view reviews
DO $$ BEGIN
    CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policy: Authenticated users can insert reviews
DO $$ BEGIN
    CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policy: Admins can delete reviews
DO $$ BEGIN
    CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add a dummy review to one of the products for demonstration purposes
DO $$
DECLARE
    dummy_user_id UUID;
    first_product_id UUID;
BEGIN
    -- Get or create a dummy user
    SELECT id INTO dummy_user_id FROM public.profiles LIMIT 1;
    IF dummy_user_id IS NULL THEN
        -- Fallback if no user exists, which shouldn't happen, but just in case
        RETURN;
    END IF;

    -- Get the first product
    SELECT id INTO first_product_id FROM public.products LIMIT 1;
    IF first_product_id IS NULL THEN
        RETURN;
    END IF;

    -- Insert a dummy review if it doesn't already exist for this user and product
    IF NOT EXISTS (SELECT 1 FROM public.reviews WHERE product_id = first_product_id AND user_id = dummy_user_id) THEN
        INSERT INTO public.reviews (product_id, user_id, rating, comment)
        VALUES (
            first_product_id, 
            dummy_user_id, 
            5, 
            'Sarung ini sangat luar biasa! Bahannya adem, jahitannya sangat rapi. Sangat cocok dipakai untuk beribadah dan acara resmi. Benar-benar produk premium dari Djiharkah Store.'
        );
    END IF;
END $$;
