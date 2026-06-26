import { supabase } from '../lib/supabase';

/**
 * Fetch all reviews across all products for admin to monitor
 */
export async function getAllReviews() {
  const { data, error } = await supabase
    .from('store_reviews')
    .select(`
      id,
      rating,
      comment,
      guest_name,
      guest_phone,
      created_at,
      admin_reply,
      profiles (full_name, phone_number)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Delete a review (Moderation)
 */
export async function deleteReview(id) {
  const { data, error } = await supabase
    .from('store_reviews')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Reply to a review
 */
export async function replyToReview(id, replyText) {
  const { data, error } = await supabase
    .from('store_reviews')
    .update({ admin_reply: replyText })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}
