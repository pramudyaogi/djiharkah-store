-- Update create_guest_order to handle multiple items
CREATE OR REPLACE FUNCTION public.create_guest_order_multi(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_shipping_cost DECIMAL,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
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
    -- promo
    v_subtotal := v_subtotal + ((v_item->>'promoQty')::INT * (v_item->>'promoPrice')::DECIMAL);
    -- normal
    v_subtotal := v_subtotal + ((v_item->>'normalQty')::INT * (v_item->>'normalPrice')::DECIMAL);
  END LOOP;

  v_total_amount := v_subtotal + COALESCE(p_shipping_cost, 0);

  -- Insert order
  INSERT INTO public.orders (user_id, total_amount, shipping_cost, shipping_address, status)
  VALUES (
    NULL,
    v_total_amount,
    COALESCE(p_shipping_cost, 0),
    CASE WHEN p_notes IS NOT NULL AND p_notes <> '' THEN p_name || ' - ' || p_phone || ' - ' || p_email || E'\n' || p_address || E'\n\nCatatan: ' || p_notes ELSE p_name || ' - ' || p_phone || ' - ' || p_email || E'\n' || p_address END,
    'pending'
  )
  RETURNING id, tracking_code INTO v_order_id, v_tracking_code;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'promoQty')::INT > 0 THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
      VALUES (v_order_id, (v_item->>'product_id')::UUID, (v_item->>'promoQty')::INT, (v_item->>'promoPrice')::DECIMAL);
    END IF;
    
    IF (v_item->>'normalQty')::INT > 0 THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
      VALUES (v_order_id, (v_item->>'product_id')::UUID, (v_item->>'normalQty')::INT, (v_item->>'normalPrice')::DECIMAL);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'tracking_code', v_tracking_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
