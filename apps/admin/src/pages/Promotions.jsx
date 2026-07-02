import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Percent, Clock, Tag, Sparkles, Save, Search, RefreshCw, GripVertical, X, Check, Edit2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const translatePhrase = (phrase) => {
  const dictionary = {
    'spesial': 'Special',
    'ramadhan': 'Ramadhan',
    'ramadan': 'Ramadhan',
    'terbatas': 'Limited',
    'tahun baru': 'New Year',
    'natal': 'Christmas',
    'lebaran': 'Eid',
    'diskon': 'Discount',
    'cuci gudang': 'Clearance',
    'kilat': 'Flash',
    'akhir tahun': 'Year-End',
    'awal tahun': 'New Year',
    'klasik': 'Classic',
    'mewah': 'Luxury'
  };

  const cleanPhrase = phrase.trim();
  if (dictionary[cleanPhrase]) {
    return dictionary[cleanPhrase];
  }

  // Split by space and translate word by word
  return cleanPhrase.split(/\s+/).map(word => {
    // Remove punctuation for lookup
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
    if (dictionary[cleanWord]) {
      // Restore punctuation if there was any
      const suffix = word.slice(cleanWord.length);
      return dictionary[cleanWord] + suffix;
    }
    // Capitalize word
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

const autoTranslatePromoName = (val) => {
  if (!val) return '';
  let clean = val.toLowerCase().trim();
  
  // Handle "promo <something>" pattern
  if (clean.startsWith('promo ')) {
    let rest = val.substring(6).trim();
    let translatedRest = translatePhrase(rest);
    return `${translatedRest} Promo`;
  }
  
  // Handle "<something> promo" pattern
  if (clean.endsWith(' promo')) {
    let rest = val.substring(0, val.length - 6).trim();
    let translatedRest = translatePhrase(rest);
    return `${translatedRest} Promo`;
  }

  return translatePhrase(val);
};

export default function Promotions() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('flash_sale'); // 'flash_sale', 'custom_promo', 'exclusive'
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // '' for all

  // Data States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState({
    flash_sale: { id: '', name: '', description: '', is_active: false, discount_percent: 0, use_default_discount: true, ends_at: '' },
    custom_promo: { id: '', name: '', description: '', is_active: false, discount_percent: 0, use_default_discount: true, ends_at: '' }
  });

  // Selected Products States
  const [selectedFlashSaleProducts, setSelectedFlashSaleProducts] = useState([]);
  const [selectedCustomPromoProducts, setSelectedCustomPromoProducts] = useState([]);
  const [selectedExclusiveProducts, setSelectedExclusiveProducts] = useState([]);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Unified Configuration Modal State (for Stock & Discount per Product)
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configProduct, setConfigProduct] = useState(null);
  const [configPromoStock, setConfigPromoStock] = useState(0);
  const [configDiscountPercent, setConfigDiscountPercent] = useState(0);
  const [configIsEdit, setConfigIsEdit] = useState(false);
  const [configProductIndex, setConfigProductIndex] = useState(null);

  // Fetch initial data
  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setFetchError(null);

      // 1. Fetch active products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('id, name, price, original_price, discount_percent, image_url, is_exclusive, category_id')
        .eq('is_active', true)
        .order('name');
      if (prodError) throw prodError;
      setProducts(prodData || []);

      // 2. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');
      if (catError) throw catError;
      setCategories(catData || []);

      // 3. Fetch promotions
      const { data: promoData, error: promoError } = await supabase
        .from('promotions')
        .select('*');
      if (promoError) throw promoError;

      const promoMap = {
        flash_sale: { id: '', name: '', description: '', is_active: false, discount_percent: 0, use_default_discount: true, ends_at: '' },
        custom_promo: { id: '', name: '', description: '', is_active: false, discount_percent: 0, use_default_discount: true, ends_at: '' }
      };

      promoData?.forEach(p => {
        if (p.type === 'flash_sale') {
          let formattedDate = '';
          if (p.ends_at) {
            const date = new Date(p.ends_at);
            const pad = (n) => (n < 10 ? '0' + n : n);
            formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
          }
          promoMap.flash_sale = { 
            ...p, 
            ends_at: formattedDate,
            use_default_discount: p.use_default_discount !== null && p.use_default_discount !== undefined ? p.use_default_discount : true
          };
        } else if (p.type === 'custom_promo') {
          promoMap.custom_promo = {
            ...p,
            use_default_discount: p.use_default_discount !== null && p.use_default_discount !== undefined ? p.use_default_discount : true
          };
        }
      });
      setPromotions(promoMap);

      // 4. Fetch promo_products relations with discount_percent, sort_order, and promo_stock
      const { data: relData, error: relError } = await supabase
        .from('promo_products')
        .select('promo_id, product_id, discount_percent, sort_order, promo_stock')
        .order('sort_order', { ascending: true });
      if (relError) throw relError;

      const fsPromoId = promoMap.flash_sale.id;
      const cpPromoId = promoMap.custom_promo.id;

      // Map relation rows to full product details
      const fsProducts = relData
        ?.filter(r => r.promo_id === fsPromoId && r.promo_stock > 0)
        .map(r => {
          const prod = prodData.find(p => p.id === r.product_id);
          if (!prod) return null;
          return {
            ...prod,
            discount_percent: r.discount_percent !== null && r.discount_percent !== undefined ? r.discount_percent : 0,
            promo_stock: r.promo_stock || 0
          };
        })
        .filter(Boolean) || [];

      const cpProducts = relData
        ?.filter(r => r.promo_id === cpPromoId && r.promo_stock > 0)
        .map(r => {
          const prod = prodData.find(p => p.id === r.product_id);
          if (!prod) return null;
          return {
            ...prod,
            discount_percent: r.discount_percent !== null && r.discount_percent !== undefined ? r.discount_percent : 0,
            promo_stock: r.promo_stock || 0
          };
        })
        .filter(Boolean) || [];

      setSelectedFlashSaleProducts(fsProducts);
      setSelectedCustomPromoProducts(cpProducts);

      // Exclusive products sorted by display_order
      const exProducts = prodData
        ?.filter(p => p.is_exclusive)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) || [];
      setSelectedExclusiveProducts(exProducts);

    } catch (err) {
      console.error('Error fetching promotion data:', err);
      setFetchError(err.message || JSON.stringify(err));
      showToast('Gagal memuat data promosi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const saveFlashSaleData = async (promo = promotions.flash_sale, productsList = selectedFlashSaleProducts) => {
    if (promo.use_default_discount && (isNaN(promo.discount_percent) || promo.discount_percent <= 0 || promo.discount_percent > 100)) {
      showToast('Persentase diskon default harus lebih besar dari 0% dan maksimal 100%.', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Update promotions table
      const { error: promoError } = await supabase
        .from('promotions')
        .update({
          name: promo.name,
          name_en: promo.name_en,
          is_active: promo.is_active,
          discount_percent: parseInt(promo.discount_percent || 0),
          use_default_discount: promo.use_default_discount,
          ends_at: promo.ends_at ? new Date(promo.ends_at).toISOString() : null
        })
        .eq('id', promo.id);
      if (promoError) throw promoError;

      // 2. Clear old relations
      const { error: deleteError } = await supabase
        .from('promo_products')
        .delete()
        .eq('promo_id', promo.id);
      if (deleteError) throw deleteError;

      // 3. Insert new sorted ones
      if (productsList.length > 0) {
        const inserts = productsList.map((p, index) => ({
          promo_id: promo.id,
          product_id: p.id,
          discount_percent: promo.use_default_discount ? parseInt(promo.discount_percent || 0) : parseInt(p.discount_percent || 0),
          promo_stock: parseInt(p.promo_stock || 0),
          sort_order: index
        }));

        const { error: insertError } = await supabase
          .from('promo_products')
          .insert(inserts);
        if (insertError) throw insertError;
      }

      showToast('Pengaturan Flash Sale berhasil disimpan!', 'success');
      fetchData(true);
    } catch (err) {
      console.error('Error saving Flash Sale:', err);
      showToast('Gagal menyimpan Flash Sale: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomPromoData = async (promo = promotions.custom_promo, productsList = selectedCustomPromoProducts) => {
    if (promo.use_default_discount && (isNaN(promo.discount_percent) || promo.discount_percent <= 0 || promo.discount_percent > 100)) {
      showToast('Persentase diskon default harus lebih besar dari 0% dan maksimal 100%.', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Update promotions table
      const { error: promoError } = await supabase
        .from('promotions')
        .update({
          name: promo.name,
          name_en: promo.name_en,
          description: promo.description,
          description_en: promo.description_en,
          is_active: promo.is_active,
          discount_percent: parseInt(promo.discount_percent || 0),
          use_default_discount: promo.use_default_discount
        })
        .eq('id', promo.id);
      if (promoError) throw promoError;

      // 2. Clear old relations
      const { error: deleteError } = await supabase
        .from('promo_products')
        .delete()
        .eq('promo_id', promo.id);
      if (deleteError) throw deleteError;

      // 3. Insert new sorted ones
      if (productsList.length > 0) {
        const inserts = productsList.map((p, index) => ({
          promo_id: promo.id,
          product_id: p.id,
          discount_percent: promo.use_default_discount ? parseInt(promo.discount_percent || 0) : parseInt(p.discount_percent || 0),
          promo_stock: parseInt(p.promo_stock || 0),
          sort_order: index
        }));

        const { error: insertError } = await supabase
          .from('promo_products')
          .insert(inserts);
        if (insertError) throw insertError;
      }

      showToast('Pengaturan Promo Spesial berhasil disimpan!', 'success');
      fetchData(true);
    } catch (err) {
      console.error('Error saving Custom Promo:', err);
      showToast('Gagal menyimpan promo: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveExclusiveData = async (productsList = selectedExclusiveProducts) => {
    setSaving(true);
    try {
      const selectedIds = productsList.map(p => p.id);
      const unselectedIds = products
        .filter(p => p.is_exclusive && !selectedIds.includes(p.id))
        .map(p => p.id);

      const promises = [];

      // Mark unselected as false
      if (unselectedIds.length > 0) {
        promises.push(
          supabase
            .from('products')
            .update({ is_exclusive: false, display_order: 9999 })
            .in('id', unselectedIds)
        );
      }

      // Mark selected as true and set display_order
      productsList.forEach((p, index) => {
        promises.push(
          supabase
            .from('products')
            .update({ is_exclusive: true, display_order: index + 1 })
            .eq('id', p.id)
        );
      });

      const results = await Promise.all(promises);
      const errors = results.map(r => r.error).filter(Boolean);
      if (errors.length > 0) throw errors[0];

      showToast('Pengaturan Pilihan Eksklusif berhasil disimpan!', 'success');
      fetchData(true);
    } catch (err) {
      console.error('Error saving Pilihan Eksklusif:', err);
      showToast('Gagal menyimpan Pilihan Eksklusif: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIndex === targetIndex || isNaN(sourceIndex)) return;

    if (activeTab === 'flash_sale') {
      const list = [...selectedFlashSaleProducts];
      const [moved] = list.splice(sourceIndex, 1);
      list.splice(targetIndex, 0, moved);
      setSelectedFlashSaleProducts(list);
      saveFlashSaleData(promotions.flash_sale, list);
    } else if (activeTab === 'custom_promo') {
      const list = [...selectedCustomPromoProducts];
      const [moved] = list.splice(sourceIndex, 1);
      list.splice(targetIndex, 0, moved);
      setSelectedCustomPromoProducts(list);
      saveCustomPromoData(promotions.custom_promo, list);
    } else if (activeTab === 'exclusive') {
      const list = [...selectedExclusiveProducts];
      const [moved] = list.splice(sourceIndex, 1);
      list.splice(targetIndex, 0, moved);
      setSelectedExclusiveProducts(list);
      saveExclusiveData(list);
    }
    setDraggedIndex(null);
  };

  // Toggle active/inactive for selection
  const handleProductToggle = (product) => {
    if (activeTab === 'flash_sale') {
      const isSelected = selectedFlashSaleProducts.some(p => p.id === product.id);
      let list = [];
      if (isSelected) {
        list = selectedFlashSaleProducts.filter(p => p.id !== product.id);
      } else {
        const defaultDiscount = parseInt(promotions.flash_sale.discount_percent || 0);
        list = [...selectedFlashSaleProducts, { ...product, discount_percent: defaultDiscount }];
      }
      setSelectedFlashSaleProducts(list);
      
      // If list becomes empty, deactivate the promo
      const updatedPromo = {
        ...promotions.flash_sale,
        is_active: list.length === 0 ? false : promotions.flash_sale.is_active
      };
      if (list.length === 0) {
        setPromotions(prev => ({ ...prev, flash_sale: updatedPromo }));
      }
      saveFlashSaleData(updatedPromo, list);
    } else if (activeTab === 'custom_promo') {
      const isSelected = selectedCustomPromoProducts.some(p => p.id === product.id);
      let list = [];
      if (isSelected) {
        list = selectedCustomPromoProducts.filter(p => p.id !== product.id);
      } else {
        list = [...selectedCustomPromoProducts, { ...product, discount_percent: 10 }]; // default 10%
      }
      setSelectedCustomPromoProducts(list);

      // If list becomes empty, deactivate the promo
      const updatedPromo = {
        ...promotions.custom_promo,
        is_active: list.length === 0 ? false : promotions.custom_promo.is_active
      };
      if (list.length === 0) {
        setPromotions(prev => ({ ...prev, custom_promo: updatedPromo }));
      }
      saveCustomPromoData(updatedPromo, list);
    } else if (activeTab === 'exclusive') {
      const isSelected = selectedExclusiveProducts.some(p => p.id === product.id);
      let list = [];
      if (isSelected) {
        list = selectedExclusiveProducts.filter(p => p.id !== product.id);
      } else {
        list = [...selectedExclusiveProducts, { ...product, is_exclusive: true }];
      }
      setSelectedExclusiveProducts(list);
      saveExclusiveData(list);
    }
  };

  // Quick remove button from top grid
  const handleRemoveFromSelected = (productId) => {
    if (activeTab === 'flash_sale') {
      const list = selectedFlashSaleProducts.filter(p => p.id !== productId);
      setSelectedFlashSaleProducts(list);
      const updatedPromo = {
        ...promotions.flash_sale,
        is_active: list.length === 0 ? false : promotions.flash_sale.is_active
      };
      if (list.length === 0) {
        setPromotions(prev => ({ ...prev, flash_sale: updatedPromo }));
      }
      saveFlashSaleData(updatedPromo, list);
    } else if (activeTab === 'custom_promo') {
      const list = selectedCustomPromoProducts.filter(p => p.id !== productId);
      setSelectedCustomPromoProducts(list);
      const updatedPromo = {
        ...promotions.custom_promo,
        is_active: list.length === 0 ? false : promotions.custom_promo.is_active
      };
      if (list.length === 0) {
        setPromotions(prev => ({ ...prev, custom_promo: updatedPromo }));
      }
      saveCustomPromoData(updatedPromo, list);
    } else if (activeTab === 'exclusive') {
      const list = selectedExclusiveProducts.filter(p => p.id !== productId);
      setSelectedExclusiveProducts(list);
      saveExclusiveData(list);
    }
  };

  // Open product promo configuration modal handler
  const openProductConfigModal = (product, isEdit, index = null) => {
    setConfigProduct(product);
    setConfigIsEdit(isEdit);
    setConfigProductIndex(index);
    setConfigPromoStock(isEdit ? (product.promo_stock || 0) : 0);
    
    const promoInfo = activeTab === 'flash_sale' ? promotions.flash_sale : promotions.custom_promo;
    if (isEdit) {
      setConfigDiscountPercent(product.discount_percent || 0);
    } else {
      setConfigDiscountPercent(promoInfo.use_default_discount ? (promoInfo.discount_percent || 0) : 0);
    }
    
    setConfigModalOpen(true);
  };

  const saveProductConfig = () => {
    const stockVal = parseInt(configPromoStock);
    const discountVal = parseInt(configDiscountPercent);
    const promoInfo = activeTab === 'flash_sale' ? promotions.flash_sale : promotions.custom_promo;
    const isDefaultDiscountActive = promoInfo.use_default_discount;
    const finalDiscountPercent = isDefaultDiscountActive ? (promoInfo.discount_percent || 0) : discountVal;

    if (isNaN(stockVal) || stockVal <= 0) {
      showToast('Stok promo harus diisi dan lebih besar dari 0.', 'error');
      return;
    }
    if (isNaN(finalDiscountPercent) || finalDiscountPercent <= 0 || finalDiscountPercent > 100) {
      showToast('Persentase diskon promo harus lebih besar dari 0% dan maksimal 100%.', 'error');
      return;
    }

    const updatedProduct = {
      ...configProduct,
      promo_stock: stockVal,
      discount_percent: finalDiscountPercent
    };

    if (activeTab === 'flash_sale') {
      let newList;
      if (configIsEdit) {
        newList = [...selectedFlashSaleProducts];
        newList[configProductIndex] = updatedProduct;
      } else {
        const exists = selectedFlashSaleProducts.some(p => p.id === configProduct.id);
        if (exists) {
          newList = selectedFlashSaleProducts.map(p => p.id === configProduct.id ? updatedProduct : p);
        } else {
          newList = [...selectedFlashSaleProducts, updatedProduct];
        }
      }
      setSelectedFlashSaleProducts(newList);
      setConfigModalOpen(false);
      saveFlashSaleData(promotions.flash_sale, newList);
    } else if (activeTab === 'custom_promo') {
      let newList;
      if (configIsEdit) {
        newList = [...selectedCustomPromoProducts];
        newList[configProductIndex] = updatedProduct;
      } else {
        const exists = selectedCustomPromoProducts.some(p => p.id === configProduct.id);
        if (exists) {
          newList = selectedCustomPromoProducts.map(p => p.id === configProduct.id ? updatedProduct : p);
        } else {
          newList = [...selectedCustomPromoProducts, updatedProduct];
        }
      }
      setSelectedCustomPromoProducts(newList);
      setConfigModalOpen(false);
      saveCustomPromoData(promotions.custom_promo, newList);
    }

    showToast(`Konfigurasi promo untuk ${configProduct.name} berhasil diperbarui!`, 'success');
  };

  // Helpers to check if a product is active in current tab selection
  const isProductSelected = (productId) => {
    if (activeTab === 'flash_sale') {
      return selectedFlashSaleProducts.some(p => p.id === productId);
    } else if (activeTab === 'custom_promo') {
      return selectedCustomPromoProducts.some(p => p.id === productId);
    } else if (activeTab === 'exclusive') {
      return selectedExclusiveProducts.some(p => p.id === productId);
    }
    return false;
  };

  // Filter products by selected category and search input
  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryId ? product.category_id === selectedCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  // Get active tab list of selected products
  const getActiveTabSelectedProducts = () => {
    if (activeTab === 'flash_sale') return selectedFlashSaleProducts;
    if (activeTab === 'custom_promo') return selectedCustomPromoProducts;
    if (activeTab === 'exclusive') return selectedExclusiveProducts;
    return [];
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <RefreshCw className="w-10 h-10 text-yellow-500 animate-spin" />
        <span className="text-gray-500 dark:text-zinc-400 font-medium">Memuat pengaturan promo...</span>
      </div>
    );
  }

  const selectedProductsList = getActiveTabSelectedProducts();

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in text-gray-900 dark:text-zinc-100">
      {fetchError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl text-sm font-medium">
          Gagal mengambil data dari database: {fetchError}
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold tracking-wide">Pengaturan Promo & Eksklusif</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">
            Kelola Flash Sale terbatas, Promo Spesial kustom (Ramadhan, dll.), dan kurasi produk Pilihan Eksklusif.
          </p>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 mb-8 gap-2">
        <button
          onClick={() => { setActiveTab('flash_sale'); setSearchQuery(''); setSelectedCategoryId(''); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium transition-all text-sm ${
            activeTab === 'flash_sale'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200'
          }`}
        >
          <Clock size={16} /> Flash Sale
        </button>
        <button
          onClick={() => { setActiveTab('custom_promo'); setSearchQuery(''); setSelectedCategoryId(''); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium transition-all text-sm ${
            activeTab === 'custom_promo'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200'
          }`}
        >
          <Tag size={16} /> Promo Spesial (Kustom)
        </button>
        <button
          onClick={() => { setActiveTab('exclusive'); setSearchQuery(''); setSelectedCategoryId(''); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium transition-all text-sm ${
            activeTab === 'exclusive'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles size={16} /> Pilihan Eksklusif
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: VISUAL STRIP OF SELECTED PRODUCTS (WITH DRAG & DROP) */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4 mb-6 gap-2">
          <div>
            <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
              <Sparkles size={18} /> Urutan Tampilan Produk Terpilih ({selectedProductsList.length})
            </h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
              Geser produk di bawah untuk menyesuaikan urutan tampilannya di storefront. 
              {activeTab !== 'exclusive' && ' Klik kotak diskon produk untuk mengatur harga promo secara kustom.'}
            </p>
          </div>
          {activeTab === 'exclusive' && (
            <button
              onClick={() => saveExclusiveData()}
              disabled={saving}
              className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-1.5 transition-all shadow hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save size={14} />}
              Simpan Urutan Eksklusif
            </button>
          )}
        </div>

        {selectedProductsList.length === 0 ? (
          <div className="border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl py-10 text-center text-gray-400 dark:text-zinc-500 text-sm">
            Belum ada produk yang aktif. Silakan pilih dan aktifkan produk dari daftar di bawah.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {selectedProductsList.map((item, index) => {
              const displayPrice = item.price;
              const originalPrice = item.original_price || item.price;
              const hasDiscount = activeTab !== 'exclusive' && item.discount_percent > 0;
              const finalPrice = hasDiscount 
                ? originalPrice - (originalPrice * item.discount_percent / 100)
                : displayPrice;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`w-44 flex-shrink-0 bg-gray-50 dark:bg-zinc-950 border rounded-2xl p-3 relative flex flex-col group transition-all duration-200 ${
                    draggedIndex === index 
                      ? 'border-yellow-500/50 scale-95 opacity-50 bg-yellow-50/5 dark:bg-yellow-950/5' 
                      : 'border-gray-200 dark:border-zinc-800 hover:border-yellow-500/50 hover:shadow-soft'
                  }`}
                >
                  {/* Drag Grip Handle */}
                  <div className="absolute top-2 left-2 cursor-grab text-gray-400 dark:text-zinc-600 hover:text-yellow-500 transition-colors p-1">
                    <GripVertical size={16} />
                  </div>

                  {/* Position Indicator */}
                  <div className="absolute top-2 right-12 bg-zinc-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-full z-10">
                    #{index + 1}
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromSelected(item.id)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm"
                  >
                    <X size={12} />
                  </button>

                  {/* Image */}
                  <div className="w-full pt-[100%] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 relative mt-5 mb-2">
                    <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </div>

                  {/* Name */}
                  <span className="text-xs font-semibold line-clamp-1 text-center mb-2 px-1">
                    {item.name}
                  </span>

                  {/* Price info / Discount Edit */}
                  {activeTab !== 'exclusive' ? (
                    <div className="mt-auto flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => openProductConfigModal(item, true, index)}
                        className={`w-full py-1 px-2 rounded-lg flex items-center justify-between transition-colors border text-[10px] font-bold ${
                          hasDiscount
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/25'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <span>Promo:</span>
                        <span className="flex items-center gap-0.5">
                          {item.discount_percent || 0}% / {item.promo_stock || 0} Stk <Edit2 size={8} />
                        </span>
                      </button>

                      <div className="text-center">
                        {hasDiscount && (
                          <div className="text-[10px] text-zinc-400 line-through">
                            Rp {Number(originalPrice).toLocaleString('id-ID')}
                          </div>
                        )}
                        <div className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                          Rp {Math.round(finalPrice).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto text-center">
                      <div className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                        Rp {Number(item.price).toLocaleString('id-ID')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: MAIN FORMS & CATEGORY-BASED PRODUCT LIST */}
      {/* ======================================================== */}
      {activeTab === 'flash_sale' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Flash Sale Params */}
            <div className="lg:col-span-1 space-y-6">
              <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Clock size={20} /> Parameter Flash Sale
              </h3>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-850">
                <div>
                  <span className="font-semibold text-sm">Status Flash Sale</span>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Aktifkan untuk tampil di homepage</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={promotions.flash_sale.is_active}
                      onChange={(e) => {
                        const val = e.target.checked;
                        if (val && selectedFlashSaleProducts.length === 0) {
                          showToast('Status tidak bisa diaktifkan karena Urutan Tampilan Produk Terpilih masih kosong!', 'error');
                          return;
                        }
                        const updated = { ...promotions.flash_sale, is_active: val };
                        setPromotions(prev => ({
                          ...prev,
                          flash_sale: updated
                        }));
                        saveFlashSaleData(updated, selectedFlashSaleProducts);
                      }}
                      className="sr-only"
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${promotions.flash_sale.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow ${promotions.flash_sale.is_active ? 'translate-x-6' : ''}`}></div>
                  </div>
                </label>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Judul Flash Sale</label>
                <input
                  type="text"
                  required
                  value={promotions.flash_sale.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setPromotions(prev => {
                      const currentNameEn = prev.flash_sale.name_en;
                      const oldAutoTranslated = autoTranslatePromoName(prev.flash_sale.name);
                      const shouldAutoUpdate = !currentNameEn || currentNameEn === oldAutoTranslated;
                      return {
                        ...prev,
                        flash_sale: {
                          ...prev.flash_sale,
                          name: newName,
                          name_en: shouldAutoUpdate ? autoTranslatePromoName(newName) : currentNameEn
                        }
                      };
                    });
                  }}
                  onBlur={() => saveFlashSaleData(promotions.flash_sale, selectedFlashSaleProducts)}
                  className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Misal: Flash Sale Terbatas!"
                />
              </div>

              {/* Title EN */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-500">Judul Flash Sale (English)</label>
                <input
                  type="text"
                  value={promotions.flash_sale.name_en || ''}
                  onChange={(e) => setPromotions(prev => ({
                    ...prev,
                    flash_sale: { ...prev.flash_sale, name_en: e.target.value }
                  }))}
                  onBlur={() => saveFlashSaleData(promotions.flash_sale, selectedFlashSaleProducts)}
                  className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Example: Limited Flash Sale!"
                />
              </div>

              {/* Default Discount Toggle & Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-850">
                  <div>
                    <span className="font-semibold text-sm">Gunakan Diskon Default</span>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Semua produk menggunakan diskon yang sama</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={promotions.flash_sale.use_default_discount}
                        onChange={(e) => {
                          const val = e.target.checked;
                          const updated = { ...promotions.flash_sale, use_default_discount: val };
                          setPromotions(prev => ({
                            ...prev,
                            flash_sale: updated
                          }));
                          saveFlashSaleData(updated, selectedFlashSaleProducts);
                        }}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors ${promotions.flash_sale.use_default_discount ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow ${promotions.flash_sale.use_default_discount ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>

                {promotions.flash_sale.use_default_discount && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Persentase Diskon Default (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={promotions.flash_sale.discount_percent}
                      onChange={(e) => setPromotions(prev => ({
                        ...prev,
                        flash_sale: { ...prev.flash_sale, discount_percent: parseInt(e.target.value || 0) }
                      }))}
                      onBlur={() => saveFlashSaleData(promotions.flash_sale, selectedFlashSaleProducts)}
                      className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                      placeholder="20"
                    />
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                      Diskon ini digunakan sebagai diskon promo default pada produk yang baru ditambahkan.
                    </p>
                  </div>
                )}
              </div>

              {/* Ends At */}
              <div>
                <label className="block text-sm font-medium mb-2">Berakhir Pada (Tanggal & Waktu)</label>
                <input
                  type="datetime-local"
                  required
                  value={promotions.flash_sale.ends_at}
                  onChange={(e) => setPromotions(prev => ({
                    ...prev,
                    flash_sale: { ...prev.flash_sale, ends_at: e.target.value }
                  }))}
                  onBlur={() => saveFlashSaleData(promotions.flash_sale, selectedFlashSaleProducts)}
                  className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                />
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                  Waktu hitung mundur real-time di storefront pembeli mengacu pada tanggal ini.
                </p>
              </div>
            </div>

            {/* Selection Area (Category Filtered) */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Percent size={20} /> Pilih Produk Flash Sale
              </h3>

              {/* Category selector strip */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-50 dark:border-zinc-800/40">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryId === ''
                      ? 'bg-yellow-500 text-black font-bold'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200'
                  }`}
                >
                  Semua Produk
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedCategoryId === cat.id
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Search Bar for Selection */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari produk berdasarkan nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-yellow-500 text-xs"
                />
              </div>

              {/* Product Selection Table */}
              <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-zinc-950 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400">
                      <th className="p-3">Produk</th>
                      <th className="p-3">Harga</th>
                      <th className="p-3 text-center w-28">Aktifkan Promo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-gray-400 dark:text-zinc-500">
                          Tidak ada produk yang cocok dengan penyaringan Anda.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(prod => {
                        const isSelected = isProductSelected(prod.id);
                        return (
                          <tr
                            key={prod.id}
                            className="border-b border-gray-100 dark:border-zinc-850 hover:bg-white dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            <td className="p-3 flex items-center gap-3">
                              <img src={prod.image_url} alt="" className="w-9 h-9 object-cover rounded-lg" />
                              <span className="font-semibold">{prod.name}</span>
                            </td>
                            <td className="p-3 font-medium">
                              Rp {Number(prod.price).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3">
                              {isSelected ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded-lg font-bold text-[10px] uppercase">
                                    Terpilih
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const selectedProd = selectedFlashSaleProducts.find(p => p.id === prod.id);
                                      const index = selectedFlashSaleProducts.findIndex(p => p.id === prod.id);
                                      if (selectedProd) {
                                        openProductConfigModal(selectedProd, true, index);
                                      }
                                    }}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg text-gray-500 hover:text-yellow-600 transition-colors"
                                    title="Edit Pengaturan Promo"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromSelected(prod.id)}
                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                    title="Batal Pilih"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => openProductConfigModal(prod, false)}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 py-1 rounded-lg transition-all hover:scale-105"
                                  >
                                    Select
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SPECIAL / CUSTOM PROMO TAB */}
      {/* ======================================================== */}
      {activeTab === 'custom_promo' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Tag size={20} /> Parameter Promo Spesial
              </h3>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-850">
                <div>
                  <span className="font-semibold text-sm">Status Promo</span>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Aktifkan untuk tampil di homepage</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={promotions.custom_promo.is_active}
                      onChange={(e) => {
                        const val = e.target.checked;
                        if (val && selectedCustomPromoProducts.length === 0) {
                          showToast('Status tidak bisa diaktifkan karena Urutan Tampilan Produk Terpilih masih kosong!', 'error');
                          return;
                        }
                        const updated = { ...promotions.custom_promo, is_active: val };
                        setPromotions(prev => ({
                          ...prev,
                          custom_promo: updated
                        }));
                        saveCustomPromoData(updated, selectedCustomPromoProducts);
                      }}
                      className="sr-only"
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${promotions.custom_promo.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow ${promotions.custom_promo.is_active ? 'translate-x-6' : ''}`}></div>
                  </div>
                </label>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Nama Promo</label>
                <input
                  type="text"
                  required
                  value={promotions.custom_promo.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setPromotions(prev => {
                      const currentNameEn = prev.custom_promo.name_en;
                      const oldAutoTranslated = autoTranslatePromoName(prev.custom_promo.name);
                      const shouldAutoUpdate = !currentNameEn || currentNameEn === oldAutoTranslated;
                      return {
                        ...prev,
                        custom_promo: {
                          ...prev.custom_promo,
                          name: newName,
                          name_en: shouldAutoUpdate ? autoTranslatePromoName(newName) : currentNameEn
                        }
                      };
                    });
                  }}
                  onBlur={() => saveCustomPromoData(promotions.custom_promo, selectedCustomPromoProducts)}
                  className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Misal: Promo Spesial Ramadhan"
                />
              </div>

              {/* Title EN */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-500">Nama Promo (English)</label>
                <input
                  type="text"
                  value={promotions.custom_promo.name_en || ''}
                  onChange={(e) => setPromotions(prev => ({
                    ...prev,
                    custom_promo: { ...prev.custom_promo, name_en: e.target.value }
                  }))}
                  onBlur={() => saveCustomPromoData(promotions.custom_promo, selectedCustomPromoProducts)}
                  className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Example: Ramadhan Special Promo"
                />
              </div>

              {/* Default Discount Toggle & Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-850">
                  <div>
                    <span className="font-semibold text-sm">Gunakan Diskon Default</span>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Semua produk menggunakan diskon yang sama</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={promotions.custom_promo.use_default_discount}
                        onChange={(e) => {
                          const val = e.target.checked;
                          const updated = { ...promotions.custom_promo, use_default_discount: val };
                          setPromotions(prev => ({
                            ...prev,
                            custom_promo: updated
                          }));
                          saveCustomPromoData(updated, selectedCustomPromoProducts);
                        }}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors ${promotions.custom_promo.use_default_discount ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow ${promotions.custom_promo.use_default_discount ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>

                {promotions.custom_promo.use_default_discount && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Persentase Diskon Default (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={promotions.custom_promo.discount_percent}
                      onChange={(e) => setPromotions(prev => ({
                        ...prev,
                        custom_promo: { ...prev.custom_promo, discount_percent: parseInt(e.target.value || 0) }
                      }))}
                      onBlur={() => saveCustomPromoData(promotions.custom_promo, selectedCustomPromoProducts)}
                      className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500"
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                      Diskon ini digunakan sebagai diskon promo default pada produk yang baru ditambahkan.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Deskripsi Promo</label>
                <textarea
                  rows={4}
                  value={promotions.custom_promo.description || ''}
                  onChange={(e) => setPromotions(prev => ({
                    ...prev,
                    custom_promo: { ...prev.custom_promo, description: e.target.value }
                  }))}
                  onBlur={() => saveCustomPromoData(promotions.custom_promo, selectedCustomPromoProducts)}
                  className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 resize-none"
                  placeholder="Tuliskan info promo menarik..."
                />
              </div>

              {/* Description EN */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-500">Deskripsi Promo (English)</label>
                <textarea
                  rows={4}
                  value={promotions.custom_promo.description_en || ''}
                  onChange={(e) => setPromotions(prev => ({
                    ...prev,
                    custom_promo: { ...prev.custom_promo, description_en: e.target.value }
                  }))}
                  onBlur={() => saveCustomPromoData(promotions.custom_promo, selectedCustomPromoProducts)}
                  className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 resize-none"
                  placeholder="Write interesting promo details..."
                />
              </div>
            </div>

            {/* Selection Area (Category Filtered) */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Tag size={20} /> Pilih Produk Promo Spesial
              </h3>

              {/* Category selector strip */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-50 dark:border-zinc-800/40">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryId === ''
                      ? 'bg-yellow-500 text-black font-bold'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200'
                  }`}
                >
                  Semua Produk
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedCategoryId === cat.id
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Search Bar for Selection */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari produk berdasarkan nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-yellow-500 text-xs"
                />
              </div>

              {/* Product Selection Table */}
              <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-zinc-950 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400">
                      <th className="p-3">Produk</th>
                      <th className="p-3">Harga</th>
                      <th className="p-3 text-center w-28">Aktifkan Promo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-gray-400 dark:text-zinc-500">
                          Tidak ada produk yang cocok dengan penyaringan Anda.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(prod => {
                        const isSelected = isProductSelected(prod.id);
                        return (
                          <tr
                            key={prod.id}
                            className="border-b border-gray-100 dark:border-zinc-850 hover:bg-white dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            <td className="p-3 flex items-center gap-3">
                              <img src={prod.image_url} alt="" className="w-9 h-9 object-cover rounded-lg" />
                              <span className="font-semibold">{prod.name}</span>
                            </td>
                            <td className="p-3 font-medium">
                              Rp {Number(prod.price).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3">
                              {isSelected ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded-lg font-bold text-[10px] uppercase">
                                    Terpilih
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const selectedProd = selectedCustomPromoProducts.find(p => p.id === prod.id);
                                      const index = selectedCustomPromoProducts.findIndex(p => p.id === prod.id);
                                      if (selectedProd) {
                                        openProductConfigModal(selectedProd, true, index);
                                      }
                                    }}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg text-gray-500 hover:text-yellow-600 transition-colors"
                                    title="Edit Pengaturan Promo"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromSelected(prod.id)}
                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                    title="Batal Pilih"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => openProductConfigModal(prod, false)}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 py-1 rounded-lg transition-all hover:scale-105"
                                  >
                                    Select
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EXCLUSIVE TAB SELECTOR AREA */}
      {/* ======================================================== */}
      {activeTab === 'exclusive' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="border-b border-gray-100 dark:border-zinc-800 pb-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
              <Sparkles size={20} /> Pilih & Tampilkan Produk Eksklusif
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Aktifkan toggle produk di bawah untuk menambahkannya ke Pilihan Eksklusif. Anda dapat menggeser urutan produk terpilih di grid atas.
            </p>
          </div>

          {/* Category selector strip */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-gray-50 dark:border-zinc-800/40 mb-4">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategoryId === ''
                  ? 'bg-yellow-500 text-black font-bold'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200'
              }`}
            >
              Semua Produk
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategoryId === cat.id
                    ? 'bg-yellow-500 text-black font-bold'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari produk berdasarkan nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-yellow-500 text-xs"
            />
          </div>

          {/* Product list */}
          <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-zinc-950">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400">
                  <th className="p-3">Produk</th>
                  <th className="p-3">Harga</th>
                  <th className="p-3 text-center w-28">Aktifkan Eksklusif</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-gray-400 dark:text-zinc-500">
                      Tidak ada produk yang cocok dengan penyaringan Anda.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(prod => {
                    const isSelected = isProductSelected(prod.id);
                    return (
                      <tr
                        key={prod.id}
                        className="border-b border-gray-100 dark:border-zinc-850 hover:bg-white dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="p-3 flex items-center gap-3">
                          <img src={prod.image_url} alt="" className="w-9 h-9 object-cover rounded-lg" />
                          <span className="font-semibold">{prod.name}</span>
                        </td>
                        <td className="p-3 font-medium">
                          Rp {Number(prod.price).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            <label className="flex items-center cursor-pointer">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleProductToggle(prod)}
                                  className="sr-only"
                                />
                                <div className={`block w-11 h-6 rounded-full transition-colors ${isSelected ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-zinc-700'}`}></div>
                                <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow ${isSelected ? 'translate-x-5' : ''}`}></div>
                              </div>
                            </label>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT DISCOUNT PERCENT MODAL */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* UNIFIED PROMO PRODUCT CONFIGURATION MODAL */}
      {/* ======================================================== */}
      {configModalOpen && configProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-zinc-800 p-6 md:p-8 animate-scale-up text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-playfair text-hitam-gelap flex items-center gap-2">
                <Percent className="text-yellow-500" size={20} />
                {configIsEdit ? 'Edit Pengaturan Promo' : 'Atur Stok & Diskon Promo'}
              </h3>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {(() => {
              const originalPrice = configProduct.original_price || configProduct.price;
              const discountPercent = parseInt(configDiscountPercent || 0);
              const discountValue = (originalPrice * discountPercent) / 100;
              const finalPrice = originalPrice - discountValue;
              const promoInfo = activeTab === 'flash_sale' ? promotions.flash_sale : promotions.custom_promo;
              const isDefaultDiscountActive = promoInfo.use_default_discount;

              return (
                <div className="space-y-6">
                  {/* Product quick preview */}
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-950 p-3 rounded-2xl border border-gray-100 dark:border-zinc-850">
                    <img src={configProduct.image_url} alt="" className="w-14 h-14 object-cover rounded-xl border border-gray-100 dark:border-zinc-800" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm block truncate">{configProduct.name}</span>
                      <span className="text-xs text-gray-400 dark:text-zinc-500 block">Harga Normal: Rp {Number(originalPrice).toLocaleString('id-ID')}</span>
                      <span className="text-xs text-gray-400 dark:text-zinc-500 block">Stok Gudang: {configProduct.stock || 0} unit</span>
                    </div>
                  </div>

                  {/* Input Promo Stock */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Alokasi Stok Promo</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={configPromoStock}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = parseInt(val);
                        setConfigPromoStock(isNaN(num) ? 0 : Math.max(0, num));
                      }}
                      className="w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 font-bold"
                      placeholder="Masukkan stok untuk promo"
                    />
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                      Stok promo terpisah dari stok gudang utama.
                    </p>
                  </div>

                  {/* Input Discount Percent */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold">Persentase Diskon Promo (%)</label>
                      {isDefaultDiscountActive && (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-2 py-0.5 rounded-full font-bold">
                          Default Aktif
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        disabled={isDefaultDiscountActive}
                        value={isDefaultDiscountActive ? (promoInfo.discount_percent || 0) : configDiscountPercent}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = parseInt(val);
                          setConfigDiscountPercent(isNaN(num) ? 0 : Math.min(100, Math.max(0, num)));
                        }}
                        className={`w-full text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 pr-12 font-bold ${
                          isDefaultDiscountActive ? 'opacity-60 bg-gray-100 dark:bg-zinc-950 cursor-not-allowed' : ''
                        }`}
                        placeholder="Masukkan diskon (0-100)"
                      />
                      <span className="absolute right-4 top-3.5 font-bold text-gray-400 dark:text-zinc-500 text-sm">%</span>
                    </div>
                    {isDefaultDiscountActive && (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-2 leading-relaxed">
                        Input dinonaktifkan karena Anda menggunakan pengaturan diskon default di form utama ({promoInfo.discount_percent || 0}%).
                      </p>
                    )}
                  </div>

                  {/* Pricing preview */}
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4 space-y-2 text-sm font-medium">
                    <div className="flex justify-between text-zinc-500">
                      <span>Harga Awal:</span>
                      <span>Rp {Number(originalPrice).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-red-500 border-b border-gray-100 dark:border-zinc-800 pb-2">
                      <span>Nilai Potongan ({isDefaultDiscountActive ? (promoInfo.discount_percent || 0) : discountPercent}%):</span>
                      <span>- Rp {Math.round(isDefaultDiscountActive ? (originalPrice * (promoInfo.discount_percent || 0)) / 100 : discountValue).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-hitam-gelap pt-1">
                      <span>Harga Akhir Promo:</span>
                      <span className="text-yellow-600 dark:text-yellow-500">
                        Rp {Math.round(isDefaultDiscountActive ? originalPrice - (originalPrice * (promoInfo.discount_percent || 0)) / 100 : finalPrice).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfigModalOpen(false)}
                      className="flex-1 py-3 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all text-gray-700 dark:text-zinc-300"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={saveProductConfig}
                      className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Check size={16} /> Terapkan
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
