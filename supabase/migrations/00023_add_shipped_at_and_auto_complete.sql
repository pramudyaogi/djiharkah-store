-- Migration: Add shipped_at to orders, status tracking trigger, and order delivery RPCs
-- ============================================================

-- 1. Tambahkan kolom shipped_at ke tabel orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

-- 2. Trigger untuk mengisi shipped_at secara otomatis saat status diubah menjadi 'shipped'
CREATE OR REPLACE FUNCTION public.set_shipped_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'shipped'::order_status AND (OLD.status IS NULL OR OLD.status <> 'shipped'::order_status) THEN
    NEW.shipped_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_shipped_at ON public.orders;
CREATE TRIGGER trigger_set_shipped_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_shipped_at();

-- 3. RPC confirm_order_delivery: Mengubah status menjadi 'delivered' dengan aman berdasarkan tracking_code rahasia
CREATE OR REPLACE FUNCTION public.confirm_order_delivery(p_tracking_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.orders
  SET status = 'delivered'::order_status, updated_at = NOW()
  WHERE tracking_code = p_tracking_code AND status = 'shipped'::order_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC auto_complete_orders: Secara otomatis menyelesaikan pesanan yang dikirim lebih dari 7 hari lalu
CREATE OR REPLACE FUNCTION public.auto_complete_orders()
RETURNS VOID AS $$
BEGIN
  UPDATE public.orders
  SET status = 'delivered'::order_status, updated_at = NOW()
  WHERE status = 'shipped'::order_status
    AND (shipped_at IS NOT NULL AND shipped_at <= NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
