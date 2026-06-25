-- 04_triggers.sql

-- 1. Trigger Auto Create Profile & Cart on User Registration
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    assigned_role VARCHAR;
BEGIN
    -- Assign role
    IF NEW.email = 'admin@djiharkah.com' THEN
        assigned_role := 'admin';
    ELSE
        assigned_role := 'customer';
    END IF;

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        assigned_role
    );

    -- Create empty cart for the user
    INSERT INTO public.cart (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- 2. Trigger Auto Update Stock & Create Stock Movement on Order Item Insert
CREATE OR REPLACE FUNCTION update_stock_on_order_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Kurangi stok di product_variant
    UPDATE public.product_variant
    SET stock = stock - NEW.quantity
    WHERE id = NEW.variant_id;

    -- Buat record di stock_movement
    INSERT INTO public.stock_movement (variant_id, type, quantity, reference_id, notes)
    VALUES (
        NEW.variant_id,
        'out',
        NEW.quantity,
        NEW.order_id::VARCHAR,
        'Order placement'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_order_item
    AFTER INSERT ON public.order_item
    FOR EACH ROW EXECUTE PROCEDURE update_stock_on_order_item();


-- 3. Trigger Auto Create Stock Movement on Manual Stock Update in product_variant
-- (Optional but requested: "Auto-create stock_movement saat stok berubah")
CREATE OR REPLACE FUNCTION log_stock_change()
RETURNS TRIGGER AS $$
DECLARE
    diff INT;
    movement_type VARCHAR;
BEGIN
    IF NEW.stock <> OLD.stock THEN
        diff := NEW.stock - OLD.stock;
        
        IF diff > 0 THEN
            movement_type := 'in';
        ELSE
            movement_type := 'adjustment'; -- 'out' diprioritaskan untuk order, selain itu 'adjustment' jika negatif tapi bukan karena order (meski logic ini sederhana, ini cukup)
            diff := abs(diff);
        END IF;

        -- Prevent infinite loop or duplicate logs jika update disebabkan oleh trigger update_stock_on_order_item
        -- Kita skip log ini jika konteksnya dari query insert order_item yang mengubah stok
        -- Agar sederhana, kita asumsikan manual update via Admin
        INSERT INTO public.stock_movement (variant_id, type, quantity, notes)
        VALUES (NEW.id, movement_type, diff, 'Manual/System stock update');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hati-hati dengan recursion, kita bisa menonaktifkan trigger log_stock_change saat order_item trigger berjalan,
-- Tapi di Postgres kita bisa menggunakan `pg_trigger_depth()`
CREATE OR REPLACE FUNCTION log_stock_change_safe()
RETURNS TRIGGER AS $$
DECLARE
    diff INT;
    movement_type VARCHAR;
BEGIN
    IF NEW.stock <> OLD.stock AND pg_trigger_depth() = 1 THEN
        diff := NEW.stock - OLD.stock;
        IF diff > 0 THEN movement_type := 'in'; ELSE movement_type := 'adjustment'; diff := abs(diff); END IF;
        INSERT INTO public.stock_movement (variant_id, type, quantity, notes)
        VALUES (NEW.id, movement_type, diff, 'Stock update');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_stock_change
    AFTER UPDATE OF stock ON public.product_variant
    FOR EACH ROW EXECUTE PROCEDURE log_stock_change_safe();
