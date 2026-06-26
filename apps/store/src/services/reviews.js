import { supabase } from '../lib/supabase';

/**
 * Fetch reviews for a specific product
 */
export async function getProductReviews(productId) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      profiles (full_name)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Submit a new review
 */
export async function submitReview(productId, rating, comment) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("Anda harus login untuk mengirim ulasan.");

  const { data, error } = await supabase
    .from('reviews')
    .insert([
      { 
        product_id: productId, 
        user_id: userData.user.id, 
        rating: rating, 
        comment: comment 
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}
