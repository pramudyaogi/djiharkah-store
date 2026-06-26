-- 1. Tambahkan kolom cancel_reason ke tabel orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. Perbarui RPC track_order agar mengembalikan cancel_reason
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

-- 3. Perbarui RPC create_guest_order agar default status-nya kembali ke 'pending'
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL
) RETURNS jsonb AS $$
DECLARE
  v_order_id UUID;
  v_tracking_code VARCHAR(50);
BEGIN
  -- Insert ke tabel orders (status pending)
  INSERT INTO public.orders (user_id, total_amount, shipping_address, status)
  VALUES (
    NULL, 
    p_quantity * p_unit_price, 
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
