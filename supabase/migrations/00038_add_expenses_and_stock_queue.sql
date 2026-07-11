-- 00038_add_expenses_and_stock_queue.sql

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    expense_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('restock', 'operasional', 'marketing', 'shipping', 'lainnya')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
    allocated_quantity INTEGER DEFAULT 0 CHECK (allocated_quantity <= quantity),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Admins have full access to expenses" ON public.expenses;
CREATE POLICY "Admins have full access to expenses" 
ON public.expenses 
FOR ALL 
USING (public.is_admin());

-- 4. Create allocate_stock RPC
CREATE OR REPLACE FUNCTION public.allocate_stock(allocated_qty INT)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    qty_to_allocate INT := allocated_qty;
    available_qty INT;
    allocate_amount INT;
BEGIN
    IF qty_to_allocate <= 0 THEN
        RETURN;
    END IF;

    -- Find all restock expenses that have unallocated quantity, ordered by expense_date ASC
    FOR r IN 
        SELECT id, quantity, allocated_quantity 
        FROM public.expenses 
        WHERE category = 'restock' AND (quantity - allocated_quantity) > 0
        ORDER BY expense_date ASC, created_at ASC
    LOOP
        available_qty := r.quantity - r.allocated_quantity;
        
        IF qty_to_allocate <= available_qty THEN
            allocate_amount := qty_to_allocate;
        ELSE
            allocate_amount := available_qty;
        END IF;
        
        UPDATE public.expenses 
        SET allocated_quantity = allocated_quantity + allocate_amount
        WHERE id = r.id;
        
        qty_to_allocate := qty_to_allocate - allocate_amount;
        
        IF qty_to_allocate <= 0 THEN
            EXIT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
