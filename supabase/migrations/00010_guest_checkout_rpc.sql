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
  -- Insert into orders
  INSERT INTO public.orders (user_id, total_amount, shipping_address, status)
  VALUES (
    NULL,
    p_quantity * p_unit_price,
    p_name || ' - ' || p_phone || ' - ' || p_email || E'\n' || p_address,
    'processing'
  )
  RETURNING id, tracking_code INTO v_order_id, v_tracking_code;

  -- Insert into order_items
  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
  VALUES (
    v_order_id,
    p_product_id,
    p_quantity,
    p_unit_price
  );

  RETURN jsonb_build_object(
    'id', v_order_id,
    'tracking_code', v_tracking_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
