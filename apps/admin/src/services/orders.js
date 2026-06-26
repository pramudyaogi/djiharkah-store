import { supabase } from '../lib/supabase';

/**
 * Fetch all orders with basic user profile info
 */
export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch a single order by ID, including order items and product details
 */
export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (full_name),
      order_items (
        *,
        products (name, image_url)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update the status of an order and optionally tracking number
 */
export async function updateOrderStatus(id, status, trackingNumber = null, courier = null, cancelReason = null) {
  const updateData = { status };
  if (trackingNumber !== null) {
    updateData.tracking_number = trackingNumber;
  }
  if (courier !== null) {
    updateData.courier = courier;
  }
  if (cancelReason !== null) {
    updateData.cancel_reason = cancelReason;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update the status of an order item (if tracking item level) - Not strictly needed now
 */
export async function updateOrderItemStatus(itemId, status) {
  // Can be used if order items have independent statuses in the future
  return null;
}
