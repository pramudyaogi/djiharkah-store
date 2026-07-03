-- Update order_items to support custom products
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS custom_product_name TEXT;

-- Create RPC for Admin Manual Order creation with multi-items and negotiated price
CREATE OR REPLACE FUNCTION public.create_manual_order(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_status TEXT,
  p_shipping_cost DECIMAL,
  p_negotiated_price DECIMAL,
  p_notes TEXT,
  p_items JSONB
) RETURNS jsonb AS $$
DECLARE
  v_order_id UUID;
  v_tracking_code VARCHAR(50);
  v_total_amount DECIMAL;
  v_subtotal DECIMAL := 0;
  v_item JSONB;
BEGIN
  -- Calculate subtotal from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + ((v_item->>'quantity')::INT * (v_item->>'unit_price')::DECIMAL);
  END LOOP;

  -- Use negotiated price if provided, otherwise use subtotal
  IF p_negotiated_price IS NOT NULL AND p_negotiated_price >= 0 THEN
    v_total_amount := p_negotiated_price + COALESCE(p_shipping_cost, 0);
  ELSE
    v_total_amount := v_subtotal + COALESCE(p_shipping_cost, 0);
  END IF;

  -- Insert order
  INSERT INTO public.orders (user_id, total_amount, shipping_cost, shipping_address, status)
  VALUES (
    NULL,
    v_total_amount,
    COALESCE(p_shipping_cost, 0),
    CASE WHEN p_notes IS NOT NULL AND p_notes <> '' THEN p_name || ' - ' || p_phone || ' - ' || p_email || E'\n' || p_address || E'\n\nCatatan: ' || p_notes ELSE p_name || ' - ' || p_phone || ' - ' || p_email || E'\n' || p_address END,
    p_status
  )
  RETURNING id, tracking_code INTO v_order_id, v_tracking_code;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, custom_product_name)
    VALUES (
      v_order_id,
      CASE WHEN (v_item->>'product_id') IS NULL OR (v_item->>'product_id') = '' THEN NULL ELSE (v_item->>'product_id')::UUID END,
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::DECIMAL,
      v_item->>'custom_product_name'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'tracking_code', v_tracking_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
