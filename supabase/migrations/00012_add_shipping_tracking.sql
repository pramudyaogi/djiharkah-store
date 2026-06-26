-- Tambahkan kolom tracking_number untuk menyimpan resi kurir pengiriman (JNE/J&T/Sicepat dll)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
