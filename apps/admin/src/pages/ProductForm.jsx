import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Save, X } from 'lucide-react';
import { getProductById, getCategories, createProduct, updateProduct, uploadProductImage } from '../services/products';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [categories, setCategories] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category_id: '',
    product_type: 'Stokis',
    price: '',
    stock: '',
    description: '',
    is_active: true,
  });

  // Image State (Single Image)
  const [existingImage, setExistingImage] = useState(null); // URL from DB
  const [newImage, setNewImage] = useState(null); // File object
  const [previewUrl, setPreviewUrl] = useState(null); // Object URL for preview

  useEffect(() => {
    async function loadData() {
      try {
        const catData = await getCategories();
        setCategories(catData);

        if (isEdit) {
          const product = await getProductById(id);
          setFormData({
            name: product.name || '',
            slug: product.slug || '',
            category_id: product.category_id || '',
            product_type: product.product_type || 'Stokis',
            price: product.price || '',
            stock: product.stock || '',
            description: product.description || '',
            is_active: product.is_active,
          });
          
          if (product.image_url) {
            setExistingImage(product.image_url);
          } else if (product.images && product.images.length > 0) { // Fallback for old schema
            setExistingImage(product.images[0]);
          }
        }
      } catch (error) {
        alert('Gagal memuat data: ' + error.message);
        navigate('/products');
      } finally {
        setInitialLoading(false);
      }
    }
    loadData();
  }, [id, isEdit, navigate]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Auto generate slug from name
    if (name === 'name' && !isEdit) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData(prev => ({ ...prev, name: value, slug }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setNewImage(file);
    
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setNewImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setExistingImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!existingImage && !newImage) {
      alert('Wajib upload 1 foto utama produk');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = existingImage;

      // 1. Upload new image if exists
      if (newImage) {
        finalImageUrl = await uploadProductImage(newImage);
      }

      // 2. Prepare payload
      const payload = {
        name: formData.name,
        slug: formData.slug,
        category_id: formData.category_id,
        product_type: formData.product_type,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock || 0),
        description: formData.description,
        is_active: formData.is_active,
        image_url: finalImageUrl
      };

      // 3. Save to DB
      if (isEdit) {
        await updateProduct(id, payload);
      } else {
        await createProduct(payload);
      }

      navigate('/products');
    } catch (error) {
      alert('Gagal menyimpan produk: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="text-gray-400 dark:text-zinc-500 py-10 text-center">Memuat data form...</div>;
  }

  const currentDisplayImage = previewUrl || existingImage;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/products')}
          className="p-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">Isi informasi produk dengan lengkap dan benar.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Info */}
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-yellow-500 border-b border-gray-200 dark:border-zinc-800 pb-3">Informasi Dasar</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Nama Produk *</label>
              <input 
                type="text" required name="name" value={formData.name} onChange={handleInputChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors"
                placeholder="Misal: Sarung BHS Masterpiece Royal Blue"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Slug URL *</label>
              <input 
                type="text" required name="slug" value={formData.slug} onChange={handleInputChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-500 dark:text-zinc-400 focus:border-yellow-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Kategori *</label>
              <select 
                required name="category_id" value={formData.category_id} onChange={handleInputChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors appearance-none"
              >
                <option value="">Pilih Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Tipe Produk *</label>
              <select 
                required name="product_type" value={formData.product_type} onChange={handleInputChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors appearance-none"
              >
                <option value="Stokis">Stokis</option>
                <option value="Pre-Order">Pre-Order</option>
                <option value="Consignment">Consignment</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Harga Dasar (Rp) *</label>
              <input 
                type="number" required min="0" name="price" value={formData.price} onChange={handleInputChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Stok Utama *</label>
              <input 
                type="number" required min="0" name="stock" value={formData.stock} onChange={handleInputChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Deskripsi Produk</label>
            <textarea 
              rows={4} name="description" value={formData.description} onChange={handleInputChange}
              className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors resize-y"
              placeholder="Jelaskan detail bahan, motif, keunggulan..."
            />
          </div>
        </div>

        {/* Upload Image */}
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-yellow-500">Foto Utama Produk</h2>
            <span className="text-xs text-gray-500 dark:text-zinc-400">1 Foto per Produk (Berdasarkan Motif/Warna)</span>
          </div>

          <div className="flex flex-wrap gap-4">
            {currentDisplayImage ? (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-yellow-500/50 group">
                <img src={currentDisplayImage} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label className="w-48 h-48 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-yellow-500 flex flex-col items-center justify-center text-zinc-500 hover:text-yellow-500 cursor-pointer transition-colors bg-white/50 dark:bg-zinc-950/50">
                <Upload size={32} className="mb-3" />
                <span className="text-sm font-medium">Upload Foto</span>
                <span className="text-xs mt-1 text-gray-400 dark:text-zinc-600">JPG, PNG (Max 5MB)</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Status & Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-zinc-800">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input 
                type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange}
                className="sr-only"
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.is_active ? 'translate-x-6' : ''}`}></div>
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white group-hover:text-yellow-500 transition-colors">
                {formData.is_active ? 'Produk Aktif' : 'Produk Nonaktif'}
              </div>
              <div className="text-xs text-gray-400 dark:text-zinc-500">Tampil/sembunyikan di toko pembeli</div>
            </div>
          </label>

          <div className="flex gap-4">
            <button 
              type="button" onClick={() => navigate('/products')}
              className="px-6 py-2.5 rounded-lg font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-black bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
            >
              {loading ? 'Menyimpan...' : <><Save size={18} /> {isEdit ? 'Update Produk' : 'Simpan Produk'}</>}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
