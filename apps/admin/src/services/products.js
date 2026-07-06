import { supabase } from '../lib/supabase';

// Generate a random string for file names to avoid collision
const generateRandomString = () => Math.random().toString(36).substring(2, 15);

/**
 * Upload single image to Supabase Storage
 * @param {File} file File object
 * @returns {Promise<string>} Public URL
 */
export async function uploadProductImage(file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${generateRandomString()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('products')
    .upload(fileName, file);

  if (error) {
    console.error('Upload error:', error.message);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('products')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Fetch all products with their category
 */
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (name)
    `)
    .eq('is_archived', false)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch all archived products
 */
export async function getArchivedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (name)
    `)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Restore an archived product by setting new stock
 */
export async function restoreProduct(id, newStock) {
  const { data, error } = await supabase
    .from('products')
    .update({ stock: newStock, is_archived: false, is_active: true, archived_at: null })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Permanently delete a product from the database
 */
export async function deleteProductPermanently(id) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch single product by ID
 */
export async function getProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (id, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new product (No variants)
 */
export async function createProduct(productData) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (productError) throw productError;
  return product;
}

/**
 * Update an existing product
 */
export async function updateProduct(id, productData) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();

  if (productError) throw productError;
  return product;
}

/**
 * Soft delete a product (set is_active to false)
 */
export async function softDeleteProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Fetch all active categories for dropdowns
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name');
    
  if (error) throw error;
  return data;
}

/**
 * Create a new category
 */
export async function createCategory(categoryData) {
  const { data, error } = await supabase
    .from('categories')
    .insert([categoryData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing category
 */
export async function updateCategory(id, categoryData) {
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a category
 */
export async function deleteCategory(id) {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Update multiple categories' order
 */
export async function updateCategoryOrders(updates) {
  // Supabase JS doesn't have a built-in bulk update for different values per row easily
  // So we run them concurrently in a Promise.all
  const promises = updates.map(update => 
    supabase.from('categories').update({ display_order: update.display_order }).eq('id', update.id)
  );
  
  await Promise.all(promises);
}

/**
 * Update multiple products' order
 */
export async function updateProductOrders(updates) {
  const promises = updates.map(update => 
    supabase.from('products').update({ display_order: update.display_order }).eq('id', update.id)
  );
  
  await Promise.all(promises);
}
