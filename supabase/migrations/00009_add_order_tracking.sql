-- 1. Tambahkan kolom tracking_code
ALTER TABLE public.orders ADD COLUMN tracking_code VARCHAR(50) UNIQUE;

-- 2. Buat fungsi untuk generate kode unik sebelum insert
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(50);
  is_unique BOOLEAN := false;
BEGIN
  -- Loop sampai dapat kode unik (kemungkinan bentrok sangat kecil tapi untuk aman)
  WHILE NOT is_unique LOOP
    -- Format: ORD-YYMMDD-XXXX (4 karakter random alphanumeric)
    new_code := 'ORD-' || to_char(NOW(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    
    -- Cek apakah sudah ada
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE tracking_code = new_code) THEN
      is_unique := true;
    END IF;
  END LOOP;
  
  NEW.tracking_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Pasang trigger di tabel orders
DROP TRIGGER IF EXISTS set_tracking_code_before_insert ON public.orders;
CREATE TRIGGER set_tracking_code_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_tracking_code();

-- 4. Generate kode untuk pesanan lama (yang sudah ada)
UPDATE public.orders 
SET tracking_code = 'ORD-' || to_char(created_at, 'YYMMDD') || '-' || upper(substring(md5(id::text) from 1 for 4))
WHERE tracking_code IS NULL;

-- SET NOT NULL setelah semua pesanan lama di-update
ALTER TABLE public.orders ALTER COLUMN tracking_code SET NOT NULL;

-- 5. Buat RPC (Remote Procedure Call) untuk melacak pesanan tanpa perlu otentikasi (bypass RLS)
CREATE OR REPLACE FUNCTION public.track_order(p_tracking_code TEXT)
RETURNS jsonb AS $$
DECLARE
  v_order jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'tracking_code', o.tracking_code,
    'status', o.status,
    'total_amount', o.total_amount,
    'shipping_address', o.shipping_address,
    'created_at', o.created_at,
    'customer_name', COALESCE(pr.full_name, 'Guest'),
    'items', (
       SELECT jsonb_agg(
         jsonb_build_object(
           'product_name', p.name,
           'quantity', oi.quantity,
           'unit_price', oi.unit_price,
           'image_url', p.image_url
         )
       )
       FROM public.order_items oi
       JOIN public.products p ON p.id = oi.product_id
       WHERE oi.order_id = o.id
    )
  ) INTO v_order
  FROM public.orders o
  LEFT JOIN public.profiles pr ON pr.id = o.user_id
  WHERE o.tracking_code = p_tracking_code;

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
