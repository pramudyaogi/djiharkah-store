-- 1. Buat kolom user_id boleh kosong (NULL) untuk order dari tamu (guest)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Perbarui Policy untuk tabel orders agar mengizinkan INSERT jika user_id NULL
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" ON public.orders 
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);

-- 3. Perbarui Policy untuk tabel order_items agar mengizinkan INSERT item untuk guest order
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items" ON public.order_items 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
  ) OR is_admin()
);
