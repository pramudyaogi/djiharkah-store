import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Save, X, GripVertical, Play } from 'lucide-react';
import { getProductById, getCategories, getProducts, createProduct, updateProduct, uploadProductImage } from '../services/products';
import { useToast } from '../contexts/ToastContext';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [categories, setCategories] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category_id: '',
    product_type: 'Stokis',
    price: '',
    original_price: '',
    discount_percent: '0',
    stock: '',
    description: '',
    is_active: true,
    free_shipping: true,
    free_shipping_type: 'all',
    is_exclusive: false,
  });

  // Validation State
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    slug: ''
  });

  // Images State (Max 5)
  const [imagesList, setImagesList] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [catData, prodList] = await Promise.all([
          getCategories(),
          getProducts()
        ]);
        setCategories(catData);
        
        // Filter out current product if editing
        const filteredProds = isEdit ? prodList.filter(p => p.id !== id) : prodList;
        setExistingProducts(filteredProds);

        if (isEdit) {
          const product = await getProductById(id);
          setFormData({
            name: product.name || '',
            slug: product.slug || '',
            category_id: product.category_id || '',
            product_type: product.product_type || 'Stokis',
            price: product.price || '',
            original_price: product.original_price || product.price || '',
            discount_percent: product.discount_percent || '0',
            stock: product.stock || '',
            description: product.description || '',
            is_active: product.is_active,
            free_shipping: product.free_shipping ?? true,
            free_shipping_type: product.free_shipping_type || 'all',
            is_exclusive: product.is_exclusive ?? false,
          });
          
          let initialImages = [];
          if (product.images && product.images.length > 0) {
            initialImages = product.images.map((imgUrl, idx) => ({
              id: `existing-${idx}`,
              url: imgUrl,
              file: null
            }));
          } else if (product.image_url) {
            initialImages = [{
              id: 'existing-0',
              url: product.image_url,
              file: null
            }];
          }
          setImagesList(initialImages);
        }
      } catch (error) {
        showToast('Gagal memuat data: ' + error.message, 'error');
        navigate('/products');
      } finally {
        setInitialLoading(false);
      }
    }
    loadData();
  }, [id, isEdit, navigate]);

  // Validation functions
  const validateFields = (nameVal, slugVal, currentProds = existingProducts) => {
    const errors = { name: '', slug: '' };
    
    if (nameVal.trim()) {
      const nameExists = currentProds.some(p => p.name.toLowerCase().trim() === nameVal.toLowerCase().trim());
      if (nameExists) {
        errors.name = 'Nama produk sudah terdaftar. Silakan gunakan nama produk yang unik.';
      }
    }
    
    if (slugVal.trim()) {
      const slugExists = currentProds.some(p => p.slug.toLowerCase().trim() === slugVal.toLowerCase().trim());
      if (slugExists) {
        errors.slug = 'Slug URL sudah terdaftar. Silakan gunakan Slug URL yang unik.';
      }
    }
    
    setValidationErrors(errors);
  };

  const generateUniqueSlug = (nameVal, currentProds = existingProducts) => {
    let baseSlug = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) return '';
    
    let uniqueSlug = baseSlug;
    let counter = 2;
    
    while (currentProds.some(p => p.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return uniqueSlug;
  };

  // Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'name') {
      if (!isEdit) {
        const uniqueSlug = generateUniqueSlug(value);
        setFormData(prev => {
          const updated = { ...prev, name: value, slug: uniqueSlug };
          validateFields(value, uniqueSlug);
          return updated;
        });
      } else {
        setFormData(prev => {
          const updated = { ...prev, name: value };
          validateFields(value, prev.slug);
          return updated;
        });
      }
      return;
    }

    if (name === 'slug') {
      const cleanSlug = value.toLowerCase().replace(/\s+/g, '-');
      setFormData(prev => {
        const updated = { ...prev, slug: cleanSlug };
        validateFields(prev.name, cleanSlug);
        return updated;
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      const origPriceVal = name === 'original_price' ? value : prev.original_price;
      const sellPriceVal = name === 'price' ? value : prev.price;
      const discPercentVal = name === 'discount_percent' ? value : prev.discount_percent;

      const origPrice = parseFloat(origPriceVal) || 0;
      const sellPrice = parseFloat(sellPriceVal) || 0;
      const discPercent = parseFloat(discPercentVal) || 0;

      if (name === 'original_price') {
        if (value === '') {
          updated.price = '';
          updated.discount_percent = '0';
        } else if (origPrice > 0) {
          if (discPercentVal !== '' && discPercent > 0) {
            const calculatedPrice = Math.round(origPrice - (origPrice * (discPercent / 100)));
            updated.price = calculatedPrice.toString();
          } else if (sellPriceVal !== '' && sellPrice > 0) {
            const calculatedDisc = Math.round(((origPrice - sellPrice) / origPrice) * 100);
            updated.discount_percent = Math.max(0, calculatedDisc).toString();
          }
        }
      } 
      else if (name === 'price') {
        if (value === '') {
          updated.discount_percent = '0';
        } else if (origPrice > 0) {
          const calculatedDisc = Math.round(((origPrice - sellPrice) / origPrice) * 100);
          updated.discount_percent = Math.max(0, calculatedDisc).toString();
        }
      } 
      else if (name === 'discount_percent') {
        if (value === '') {
          updated.price = origPriceVal;
        } else if (origPrice > 0) {
          const calculatedPrice = Math.round(origPrice - (origPrice * (discPercent / 100)));
          updated.price = calculatedPrice.toString();
        }
      }

      return updated;
    });
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    const currentTotal = imagesList.length;
    const currentVideos = imagesList.filter(item => {
      if (item.file) {
        return item.file.type.startsWith('video/');
      }
      return item.url && item.url.match(/\.(mp4|webm|ogg|mov|avi|mkv|3gp)($|\?)/i);
    }).length;

    let validNewItems = [];
    let addedTotal = currentTotal;
    let addedVideos = currentVideos;

    for (const file of files) {
      if (addedTotal >= 5) {
        showToast('Maksimal gabungan 5 foto dan video per produk', 'warning');
        break;
      }

      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        showToast(`File "${file.name}" tidak didukung. Harus berupa foto atau video.`, 'warning');
        continue;
      }

      if (isVideo) {
        if (addedVideos >= 2) {
          showToast(`File "${file.name}" dilewati. Maksimal 2 file video per produk.`, 'warning');
          continue;
        }
        if (file.size > 25 * 1024 * 1024) {
          showToast(`File "${file.name}" dilewati. Ukuran video maksimal 25MB.`, 'warning');
          continue;
        }

        // Validate video duration asynchronously
        try {
          const duration = await new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src);
              resolve(video.duration);
            };
            video.onerror = () => {
              window.URL.revokeObjectURL(video.src);
              reject(new Error('Gagal memuat metadata video'));
            };
            video.src = URL.createObjectURL(file);
          });

          if (duration > 30) {
            showToast(`File "${file.name}" dilewati. Durasi video maksimal 30 detik.`, 'warning');
            continue;
          }
        } catch (err) {
          showToast(`File "${file.name}" dilewati. Format video tidak valid atau rusak.`, 'warning');
          continue;
        }

        addedVideos++;
      } else {
        // Image validation
        if (file.size > 2 * 1024 * 1024) {
          showToast(`File "${file.name}" dilewati. Ukuran foto maksimal 2MB.`, 'warning');
          continue;
        }
      }

      validNewItems.push({
        id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        url: URL.createObjectURL(file),
        file: file
      });
      addedTotal++;
    }

    if (validNewItems.length > 0) {
      setImagesList(prev => [...prev, ...validNewItems]);
    }
  };

  const removeImage = (idToRemove) => {
    setImagesList(prev => {
      const itemToRemove = prev.find(item => item.id === idToRemove);
      if (itemToRemove && itemToRemove.file && itemToRemove.url) {
        URL.revokeObjectURL(itemToRemove.url);
      }
      return prev.filter(item => item.id !== idToRemove);
    });
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newList = [...imagesList];
    const draggedItem = newList[draggedIndex];
    newList.splice(draggedIndex, 1);
    newList.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setImagesList(newList);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Custom client-side validation to avoid browser tooltips
    if (!formData.name.trim()) {
      showToast('Nama Produk wajib diisi', 'warning');
      return;
    }
    if (!formData.slug.trim()) {
      showToast('Slug URL wajib diisi', 'warning');
      return;
    }
    if (!formData.category_id) {
      showToast('Silakan pilih Kategori produk', 'warning');
      return;
    }
    if (!formData.product_type) {
      showToast('Tipe Produk wajib diisi', 'warning');
      return;
    }
    if (!formData.original_price) {
      showToast('Harga Asli wajib diisi', 'warning');
      return;
    }
    if (!formData.price) {
      showToast('Harga Penjualan wajib diisi', 'warning');
      return;
    }
    if (formData.stock === '' || formData.stock === undefined || formData.stock === null) {
      showToast('Stok Utama wajib diisi', 'warning');
      return;
    }
    if (imagesList.length === 0) {
      showToast('Wajib upload minimal 1 foto produk', 'warning');
      return;
    }

    if (validationErrors.name || validationErrors.slug) {
      showToast('Harap perbaiki kesalahan input nama atau slug yang terduplikasi.', 'warning');
      return;
    }

    const nameExists = existingProducts.some(p => p.name.toLowerCase().trim() === formData.name.toLowerCase().trim());
    if (nameExists) {
      showToast('Nama produk sudah terdaftar. Silakan gunakan nama produk lain yang unik.', 'warning');
      return;
    }

    const slugExists = existingProducts.some(p => p.slug.toLowerCase().trim() === formData.slug.toLowerCase().trim());
    if (slugExists) {
      showToast('Slug URL sudah terdaftar. Silakan gunakan Slug URL lain yang unik.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload new images if they exist
      const uploadPromises = imagesList.map(async (item) => {
        if (item.file) {
          const uploadedUrl = await uploadProductImage(item.file);
          return uploadedUrl;
        }
        return item.url;
      });
      
      const finalImageUrls = await Promise.all(uploadPromises);
      const firstImageUrl = finalImageUrls[0] || null;

      // 2. Prepare payload
      const payload = {
        name: formData.name,
        slug: formData.slug,
        category_id: formData.category_id,
        product_type: formData.product_type,
        price: parseFloat(formData.price || formData.original_price),
        original_price: parseFloat(formData.original_price),
        discount_percent: parseInt(formData.discount_percent || 0),
        stock: parseInt(formData.stock || 0),
        description: formData.description,
        is_active: formData.is_active,
        free_shipping: formData.free_shipping,
        free_shipping_type: formData.free_shipping ? (formData.free_shipping_type || 'all') : null,
        is_exclusive: formData.is_exclusive,
        image_url: firstImageUrl,
        images: finalImageUrls
      };

      // 3. Save to DB
      if (isEdit) {
        await updateProduct(id, payload);
        showToast('Produk berhasil diperbarui!', 'success');
      } else {
        await createProduct(payload);
        showToast('Produk baru berhasil ditambahkan!', 'success');
      }

      navigate('/products');
    } catch (error) {
      if (error.code === '23505' || (error.message && error.message.includes('products_slug_key'))) {
        showToast('Slug URL ini sudah digunakan oleh produk lain. Silakan ubah sedikit kolom "Slug URL" agar unik.', 'error');
      } else {
        showToast('Gagal menyimpan produk: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="text-gray-400 dark:text-zinc-500 py-10 text-center">Memuat data form...</div>;
  }


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

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        
        {/* Basic Info */}
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-yellow-500 border-b border-gray-200 dark:border-zinc-800 pb-3">Informasi Dasar</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Nama Produk *</label>
              <input 
                type="text" required name="name" value={formData.name} onChange={handleInputChange}
                className={`w-full bg-white dark:bg-zinc-950 border rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none transition-colors ${
                  validationErrors.name 
                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' 
                    : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-500'
                }`}
                placeholder="Misal: Sarung BHS Masterpiece Royal Blue"
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500 font-medium">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Slug URL *</label>
              <input 
                type="text" required name="slug" value={formData.slug} onChange={handleInputChange}
                className={`w-full bg-white dark:bg-zinc-950 border rounded-lg px-4 py-2.5 text-gray-500 dark:text-zinc-450 focus:outline-none transition-colors ${
                  validationErrors.slug 
                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' 
                    : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-500'
                }`}
              />
              {validationErrors.slug && (
                <p className="text-xs text-red-500 font-medium">{validationErrors.slug}</p>
              )}
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
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Harga Asli (Rp) *</label>
              <input 
                type="number" required min="0" name="original_price" value={formData.original_price} onChange={handlePriceChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors"
                placeholder="Misal: 500000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Diskon (%)</label>
              <input 
                type="number" min="0" max="100" name="discount_percent" value={formData.discount_percent} onChange={handlePriceChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors"
                placeholder="Misal: 10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Harga Penjualan (Rp) *</label>
              <input 
                type="number" required min="0" name="price" value={formData.price} onChange={handlePriceChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-yellow-500 focus:outline-none transition-colors"
                placeholder="Misal: 450000"
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

          {/* Gratis Ongkir Toggle */}
          <div className="space-y-3 p-4 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-2">
                  <span className="text-green-500">🚚</span> Gratis Ongkir
                </div>
                <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                  {formData.free_shipping ? 'Produk ini gratis ongkir untuk pembeli' : 'Produk ini tidak gratis ongkir'}
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="free_shipping"
                    checked={formData.free_shipping}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${formData.free_shipping ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow ${formData.free_shipping ? 'translate-x-6' : ''}`}></div>
                </div>
              </label>
            </div>

            {formData.free_shipping && (
              <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Kategori Wilayah Gratis Ongkir
                </label>
                <select
                  name="free_shipping_type"
                  value={formData.free_shipping_type || 'all'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 transition-all cursor-pointer"
                >
                  <option value="jabodetabek">Jabodetabek (Jakarta, Bogor, Depok, Tangerang, Bekasi)</option>
                  <option value="indonesia">Gratis Ongkir Se-Indonesia</option>
                  <option value="all">Gratis Ongkir Semua Wilayah (Global)</option>
                </select>
              </div>
            )}
          </div>

        </div>

        {/* Upload Image & Video Gallery */}
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-yellow-500">Foto & Video Galeri Produk</h2>
            <span className="text-xs text-gray-500 dark:text-zinc-400">Maks 5 file (Foto maks 2MB, Video maks 2 file, maks 25MB & 30 detik)</span>
          </div>

          <div className="flex flex-wrap gap-4">
            {imagesList.map((item, index) => {
              const isVideo = item.file 
                ? item.file.type.startsWith('video/')
                : (item.url && item.url.match(/\.(mp4|webm|ogg|mov|avi|mkv|3gp)($|\?)/i));
                
              return (
                <div 
                  key={item.id} 
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative w-36 h-36 rounded-xl overflow-hidden border group shadow-sm bg-gray-50 dark:bg-zinc-950 cursor-grab active:cursor-grabbing transition-all select-none ${
                    index === 0 
                      ? 'border-yellow-500 ring-2 ring-yellow-500/20' 
                      : 'border-gray-200 dark:border-zinc-800 hover:border-yellow-500/50'
                  } ${draggedIndex === index ? 'opacity-40 scale-95 border-dashed' : ''}`}
                >
                  {isVideo ? (
                    <div className="relative w-full h-full bg-black">
                      <video src={item.url} className="w-full h-full object-cover pointer-events-none" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play size={20} className="text-white fill-white opacity-80" />
                      </div>
                      <div className="absolute top-2 left-2 bg-yellow-500 text-hitam text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                        VIDEO
                      </div>
                    </div>
                  ) : (
                    <img src={item.url} alt="Preview" className="w-full h-full object-cover pointer-events-none" />
                  )}
                  
                  {/* Drag handle overlay */}
                  <div className="absolute top-2 left-2 p-1 bg-black/40 backdrop-blur-sm rounded text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <GripVertical size={12} />
                  </div>

                  {/* Main Photo Badge */}
                  {index === 0 && (
                    <div className="absolute bottom-2 left-2 bg-yellow-500 text-hitam text-[10px] font-bold px-2 py-0.5 rounded shadow-sm pointer-events-none">
                      Utama
                    </div>
                  )}

                  <button 
                    type="button" 
                    onClick={() => removeImage(item.id)} 
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg z-10"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            
            {imagesList.length < 5 && (
              <label className="w-36 h-36 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-yellow-500 flex flex-col items-center justify-center text-zinc-500 hover:text-yellow-500 cursor-pointer transition-colors bg-white/50 dark:bg-zinc-950/50">
                <Upload size={24} className="mb-2" />
                <span className="text-xs font-semibold">Upload File</span>
                <span className="text-[10px] mt-0.5 text-gray-400 dark:text-zinc-600">({imagesList.length}/5)</span>
                <input type="file" multiple accept="image/*,video/*" onChange={handleImageChange} className="hidden" />
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
