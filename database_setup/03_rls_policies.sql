-- 03_rls_policies.sql

-- 1. Enable RLS di semua tabel
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE address ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- 2. Buat fungsi helper untuk cek apakah user adalah Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Policy Public (Tanpa Login)
-- Bisa melihat produk, kategori, brand, banner, dll.
CREATE POLICY "Public can view active categories" ON category FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active brands" ON brand FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active products" ON product FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view product variants" ON product_variant FOR SELECT USING (true);
CREATE POLICY "Public can view product images" ON product_image FOR SELECT USING (true);
CREATE POLICY "Public can view active banners" ON banner FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view reviews" ON review FOR SELECT USING (true);
CREATE POLICY "Public can view settings" ON settings FOR SELECT USING (true);

-- 4. Policy Admin (Full Access ke semua tabel)
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (is_admin());', 'Admin full access on ' || t_name, t_name);
    END LOOP;
END
$$;

-- 5. Policy Customer (Berdasarkan user_id)
-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Cart & Cart Item
CREATE POLICY "Users can manage own cart" ON cart FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cart items" ON cart_item FOR ALL USING (
    EXISTS (SELECT 1 FROM cart WHERE id = cart_item.cart_id AND user_id = auth.uid())
);

-- Address
CREATE POLICY "Users can manage own addresses" ON address FOR ALL USING (auth.uid() = user_id);

-- Order
CREATE POLICY "Users can view own orders" ON "order" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON "order" FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Customer cannot update or delete order status, only Admin

-- Order Item
CREATE POLICY "Users can view own order items" ON order_item FOR SELECT USING (
    EXISTS (SELECT 1 FROM "order" WHERE id = order_item.order_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own order items" ON order_item FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "order" WHERE id = order_item.order_id AND user_id = auth.uid())
);

-- Shipment
CREATE POLICY "Users can view own shipments" ON shipment FOR SELECT USING (
    EXISTS (SELECT 1 FROM "order" WHERE id = shipment.order_id AND user_id = auth.uid())
);

-- Review
CREATE POLICY "Users can manage own reviews" ON review FOR ALL USING (auth.uid() = user_id);

-- Notification
CREATE POLICY "Users can view own notifications" ON notification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notification FOR UPDATE USING (auth.uid() = user_id);

