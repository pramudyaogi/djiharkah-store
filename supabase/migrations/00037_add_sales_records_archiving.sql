-- Create sales_records table to store lightweight historical sales data of deleted orders
CREATE TABLE IF NOT EXISTS public.sales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID, -- Reference to the original order ID
  tracking_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered',
  customer_name TEXT,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- Create policy for Admin access using the public.is_admin() helper
DROP POLICY IF EXISTS "Admins can do everything on sales_records" ON public.sales_records;
CREATE POLICY "Admins can do everything on sales_records" 
  ON public.sales_records 
  FOR ALL 
  USING (public.is_admin());

-- Create BEFORE DELETE trigger function to archive completed/processing orders before they are removed
CREATE OR REPLACE FUNCTION public.archive_order_before_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_items_count INTEGER;
BEGIN
  -- Archive only if order status is processing, shipped, or delivered (successful/revenue-generating)
  -- Status is stored as order_status type, cast to text for comparison
  IF OLD.status::text IN ('processing', 'shipped', 'delivered') THEN
    -- Get customer name from profile
    IF OLD.user_id IS NOT NULL THEN
      SELECT full_name INTO v_customer_name
      FROM public.profiles
      WHERE id = OLD.user_id;
    END IF;
    
    -- Fallback: extract name from shipping_address (typically formats like "Name - Phone - Address")
    IF v_customer_name IS NULL THEN
      v_customer_name := SPLIT_PART(OLD.shipping_address, ' - ', 1);
    END IF;

    -- Final fallback
    IF v_customer_name IS NULL OR v_customer_name = '' THEN
      v_customer_name := 'Tamu';
    END IF;

    -- Calculate total items count from order_items
    SELECT COALESCE(SUM(quantity), 0) INTO v_items_count
    FROM public.order_items
    WHERE order_id = OLD.id;

    -- Insert lightweight record into sales_records
    INSERT INTO public.sales_records (
      order_id,
      tracking_code,
      created_at,
      status,
      customer_name,
      net_amount,
      items_count
    ) VALUES (
      OLD.id,
      OLD.tracking_code,
      OLD.created_at,
      'delivered', -- Permanently archive as 'delivered' (Selesai)
      v_customer_name,
      GREATEST(0, OLD.total_amount - OLD.shipping_cost),
      v_items_count
    );
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Bind the trigger to orders table
DROP TRIGGER IF EXISTS trigger_archive_order_before_delete ON public.orders;
CREATE TRIGGER trigger_archive_order_before_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_order_before_delete();
