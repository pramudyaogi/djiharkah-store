-- Migration: Add Shipping Origin City to Store Settings, Shipping Cost to Orders, and create Shipping Rates table
-- ============================================================

-- 1. Tambahkan kolom shipping_origin_city ke tabel store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS shipping_origin_city TEXT NOT NULL DEFAULT 'Jakarta Barat';

-- 2. Tambahkan kolom shipping_cost ke tabel orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 3. Buat tabel tarif ongkir per provinsi (shipping_rates)
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  province TEXT UNIQUE NOT NULL,
  cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Buat policies untuk tabel shipping_rates
DROP POLICY IF EXISTS "Shipping rates are viewable by everyone" ON public.shipping_rates;
CREATE POLICY "Shipping rates are viewable by everyone" ON public.shipping_rates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage shipping rates" ON public.shipping_rates;
CREATE POLICY "Only admins can manage shipping rates" ON public.shipping_rates FOR ALL USING (is_admin());

-- Trigger set_updated_at untuk shipping_rates
DROP TRIGGER IF EXISTS set_shipping_rates_updated_at ON public.shipping_rates;
CREATE TRIGGER set_shipping_rates_updated_at BEFORE UPDATE ON public.shipping_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insert default shipping rates per provinsi di Indonesia
INSERT INTO public.shipping_rates (province, cost) VALUES
  ('Aceh', 45000),
  ('Bali', 25000),
  ('Banten', 12000),
  ('Bengkulu', 30000),
  ('DI Yogyakarta', 18000),
  ('DKI Jakarta', 10000),
  ('Gorontalo', 50000),
  ('Jambi', 28000),
  ('Jawa Barat', 13000),
  ('Jawa Tengah', 18000),
  ('Jawa Timur', 20000),
  ('Kalimantan Barat', 35000),
  ('Kalimantan Selatan', 38000),
  ('Kalimantan Tengah', 38000),
  ('Kalimantan Timur', 40000),
  ('Kalimantan Utara', 45000),
  ('Kepulauan Bangka Belitung', 32000),
  ('Kepulauan Riau', 35000),
  ('Lampung', 20000),
  ('Maluku', 60000),
  ('Maluku Utara', 65000),
  ('Nusa Tenggara Barat', 35000),
  ('Nusa Tenggara Timur', 45000),
  ('Papua', 75000),
  ('Papua Barat', 75000),
  ('Riau', 30000),
  ('Sulawesi Barat', 45000),
  ('Sulawesi Selatan', 40000),
  ('Sulawesi Tengah', 45000),
  ('Sulawesi Tenggara', 45000),
  ('Sulawesi Utara', 48000),
  ('Sumatera Barat', 28000),
  ('Sumatera Selatan', 25000),
  ('Sumatera Utara', 32000)
ON CONFLICT (province) DO NOTHING;

-- 4. Perbarui RPC create_guest_order untuk menyertakan p_shipping_cost
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_shipping_cost DECIMAL DEFAULT 0
) RETURNS jsonb AS $$
DECLARE
  v_order_id UUID;
  v_tracking_code VARCHAR(50);
BEGIN
  -- Insert ke tabel orders (status pending, total_amount = subtotal + shipping_cost)
  INSERT INTO public.orders (user_id, total_amount, shipping_cost, shipping_address, status)
  VALUES (
    NULL, 
    (p_quantity * p_unit_price) + p_shipping_cost, 
    p_shipping_cost,
    p_name || ' - ' || p_phone || ' - ' || p_email || E'\n' || p_address,
    'pending'
  ) 
  RETURNING id, tracking_code INTO v_order_id, v_tracking_code;

  -- Insert ke tabel order_items
  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
  VALUES (v_order_id, p_product_id, p_quantity, p_unit_price);

  -- Mengembalikan data pesanan agar bisa ditampilkan di UI Checkout
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'tracking_code', v_tracking_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Perbarui RPC track_order agar mengembalikan shipping_cost
CREATE OR REPLACE FUNCTION public.track_order(p_tracking_code TEXT)
RETURNS jsonb AS $$
DECLARE
  v_order jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'tracking_code', o.tracking_code,
    'tracking_number', o.tracking_number,
    'courier', o.courier,
    'status', o.status,
    'cancel_reason', o.cancel_reason,
    'shipping_cost', o.shipping_cost,
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
