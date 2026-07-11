import { supabase } from '../lib/supabase';

/**
 * Fetch expenses filtered by date range
 */
export async function getExpenses(startDate, endDate) {
  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });

  if (startDate) {
    query = query.gte('expense_date', `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    query = query.lte('expense_date', `${endDate}T23:59:59Z`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Create a new expense.
 * If category is 'restock' and qty > 0, we can also trigger allocateStock in the same flow.
 */
export async function createExpense(expenseData) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expenseData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing expense
 */
export async function updateExpense(id, expenseData) {
  const { data, error } = await supabase
    .from('expenses')
    .update(expenseData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an expense
 */
export async function deleteExpense(id) {
  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Trigger the allocate_stock RPC on Supabase database
 * @param {number} qty Quantity of newly added product stock to allocate
 */
export async function allocateStock(qty) {
  if (!qty || qty <= 0) return;
  const { error } = await supabase.rpc('allocate_stock', { allocated_qty: qty });
  if (error) {
    console.error('Error invoking allocate_stock RPC:', error);
  }
}

/**
 * Fetch statistics of the stock queue
 * Returns { totalPurchased, totalUnallocated }
 */
export async function getStockQueueStats() {
  const { data, error } = await supabase
    .from('expenses')
    .select('title, quantity, allocated_quantity')
    .eq('category', 'restock');

  if (error) {
    // If the table doesn't exist yet, return defaults
    if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
      return { totalPurchased: 0, totalUnallocated: 0, breakdown: {} };
    }
    throw error;
  }

  let totalPurchased = 0;
  let totalUnallocated = 0;
  const breakdown = {};

  data.forEach(item => {
    const qty = item.quantity || 0;
    const allocated = item.allocated_quantity || 0;
    const unallocated = qty - allocated;
    
    totalPurchased += qty;
    totalUnallocated += unallocated;

    if (unallocated > 0) {
      const categoryName = item.title || 'Lainnya';
      breakdown[categoryName] = (breakdown[categoryName] || 0) + unallocated;
    }
  });

  return {
    totalPurchased,
    totalUnallocated: Math.max(0, totalUnallocated),
    breakdown
  };
}
