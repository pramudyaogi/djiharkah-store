-- Update create_guest_order RPC to support optional split pricing parameters
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_shipping_cost DECIMAL DEFAULT 0,
  p_promo_qty INT DEFAULT 0,
  p_promo_price DECIMAL DEFAULT 0,
  p_normal_qty INT DEFAULT 0,
  p_normal_price DECIMAL DEFAULT 0
) RETURNS jsonb AS $$
DECLARE
  v_order_id UUID;
  v_tracking_code VARCHAR(50);
  v_total_amount DECIMAL;
BEGIN
  -- Hitung total amount berdasarkan split jika disediakan
  IF (p_promo_qty IS NOT NULL AND p_promo_qty > 0) OR (p_normal_qty IS NOT NULL AND p_normal_qty > 0) THEN
    v_total_amount := (COALESCE(p_promo_qty, 0) * COALESCE(p_promo_price, 0)) + 
                      (COALESCE(p_normal_qty, 0) * COALESCE(p_normal_price, 0)) + 
                      p_shipping_cost;
  ELSE
    v_total_amount := (p_quantity * p_unit_price) + p_shipping_cost;
  END IF;

  -- Insert ke tabel orders (status pending)
  INSERT INTO public.orders (user_id, total_amount, shipping_cost, shipping_address, status)
  VALUES (
    NULL, 
    v_total_amount, 
    p_shipping_cost,
    p_name || ' - ' || p_phone || ' - ' || p_email || E'\n' || p_address,
    'pending'
  ) 
  RETURNING id, tracking_code INTO v_order_id, v_tracking_code;

  -- Insert ke tabel order_items
  IF (p_promo_qty IS NOT NULL AND p_promo_qty > 0) OR (p_normal_qty IS NOT NULL AND p_normal_qty > 0) THEN
    IF p_promo_qty IS NOT NULL AND p_promo_qty > 0 THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
      VALUES (v_order_id, p_product_id, p_promo_qty, p_promo_price);
    END IF;
    IF p_normal_qty IS NOT NULL AND p_normal_qty > 0 THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
      VALUES (v_order_id, p_product_id, p_normal_qty, p_normal_price);
    END IF;
  ELSE
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, p_product_id, p_quantity, p_unit_price);
  END IF;

  -- Mengembalikan data pesanan agar bisa ditampilkan di UI Checkout
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'tracking_code', v_tracking_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
