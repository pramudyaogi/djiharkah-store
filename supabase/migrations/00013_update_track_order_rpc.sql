-- Perbarui fungsi RPC track_order agar juga mengembalikan 'tracking_number' (Resi JNE/J&T)
CREATE OR REPLACE FUNCTION public.track_order(p_tracking_code TEXT)
RETURNS jsonb AS $$
DECLARE
  v_order jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'tracking_code', o.tracking_code,
    'tracking_number', o.tracking_number,
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
