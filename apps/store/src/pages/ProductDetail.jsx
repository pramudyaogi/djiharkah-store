import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, Star, Share2, Heart, ShieldCheck, ShoppingCart, User, AlertCircle, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
import PopupModal from '../components/PopupModal';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [originCity, setOriginCity] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const scrollContainerRef = useRef(null);

  const handleScroll = (e) => {
    const container = e.target;
    if (!container.clientWidth) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    if (index !== activeImageIndex && index >= 0 && index < productImages.length) {
      setActiveImageIndex(index);
    }
  };

  const handleThumbnailClick = (idx) => {
    setActiveImageIndex(idx);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: idx * scrollContainerRef.current.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  const productImages = product?.images && product.images.length > 0
    ? product.images
    : (product?.image_url ? [product.image_url] : []);

  // Popup Modal State
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, type: 'info', title: '', message: '', actionText: '', actionLink: '' 
  });
  
  const showModal = (config) => setModalConfig({ ...config, isOpen: true });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  useEffect(() => {
    async function fetchProductAndReviews() {
      try {
        setLoading(true);
        // Fetch Product
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*, categories(name, slug)')
          .eq('slug', slug)
          .single();
        
        if (prodError) throw prodError;

        // Check if there is any active promotion (Flash Sale or Special Promo)
        const { data: activePromos, error: promoError } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_active', true);

        let finalProduct = prodData;

        if (!promoError && activePromos && activePromos.length > 0 && prodData) {
          const promoIds = activePromos.map(p => p.id);
          const { data: promoProds, error: promoProdError } = await supabase
            .from('promo_products')
            .select('promo_id, discount_percent, promo_stock')
            .eq('product_id', prodData.id)
            .in('promo_id', promoIds);

          if (!promoProdError && promoProds && promoProds.length > 0) {
            const flashSalePromo = activePromos.find(p => p.type === 'flash_sale');
            const customPromo = activePromos.find(p => p.type === 'custom_promo');
            
            let matchedPromoRel = null;
            let matchedPromo = null;

            if (flashSalePromo && promoProds.some(rp => rp.promo_id === flashSalePromo.id)) {
              matchedPromoRel = promoProds.find(rp => rp.promo_id === flashSalePromo.id);
              matchedPromo = flashSalePromo;
            } else if (customPromo && promoProds.some(rp => rp.promo_id === customPromo.id)) {
              matchedPromoRel = promoProds.find(rp => rp.promo_id === customPromo.id);
              matchedPromo = customPromo;
            }

            if (matchedPromo && matchedPromoRel) {
              const finalDiscount = matchedPromo.use_default_discount
                ? (matchedPromo.discount_percent || 0)
                : (matchedPromoRel.discount_percent !== null && matchedPromoRel.discount_percent !== undefined ? matchedPromoRel.discount_percent : (matchedPromo.discount_percent || 0));
              
              const origPrice = Number(prodData.original_price || prodData.price);
              const discountPrice = origPrice - (origPrice * finalDiscount / 100);
              
              finalProduct = {
                ...prodData,
                discount_percent: finalDiscount,
                original_price: origPrice,
                price: discountPrice,
                stock: matchedPromoRel.promo_stock !== null && matchedPromoRel.promo_stock !== undefined ? matchedPromoRel.promo_stock : prodData.stock,
                original_stock: prodData.stock,
                promo_type: matchedPromo.type,
                regular_price: prodData.price
              };
            }
          }
        }
        
        setProduct(finalProduct);

        // Fetch Store Settings for Origin City
        const { data: settingsData, error: settingsError } = await supabase
          .from('store_settings')
          .select('shipping_origin_city')
          .eq('id', 1)
          .single();
        if (!settingsError && settingsData) {
          setOriginCity(settingsData.shipping_origin_city);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProductAndReviews();
  }, [slug]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight' && productImages.length > 1) {
        setActiveImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
      }
      if (e.key === 'ArrowLeft' && productImages.length > 1) {
        setActiveImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, productImages]);

  const handleQuantityChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '') {
      setQuantity('');
      return;
    }
    const parsedVal = parseInt(value, 10);
    if (parsedVal >= 1) {
      const maxStock = product?.promo_type ? (product.original_stock || 0) : (product?.stock || 0);
      const clampedVal = Math.min(parsedVal, maxStock || 1);
      setQuantity(clampedVal);
    }
  };

  const handleQuantityBlur = () => {
    if (quantity === '' || quantity < 1) {
      setQuantity(1);
    }
  };

  const handleBuyNow = () => {
    const finalQuantity = quantity === '' ? 1 : quantity;
    navigate('/checkout', { state: { product, quantity: finalQuantity } });
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[75vh] w-full">
      <div className="w-12 h-12 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!product) return <div className="text-hitam font-playfair text-xl py-20 text-center">Produk tidak ditemukan.</div>;

  const soldCount = product.sold_count ?? 0;

  return (
    <div className="max-w-[1200px] mx-auto pt-6 px-4 pb-20">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emas transition-colors mb-5 group">
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Kembali
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center text-sm mb-4 text-gray-500">
        <Link to="/" className="hover:text-emas transition-colors text-emas font-medium">Djiharkah</Link>
        <span className="mx-2">{'>'}</span>
        <Link to={`/products?category=${product.categories?.slug}`} className="hover:text-emas transition-colors">{product.categories?.name}</Link>
        <span className="mx-2">{'>'}</span>
        <span className="text-hitam truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-soft flex flex-col md:flex-row gap-10 mb-8 border border-gray-100">
        {/* Left: Image Gallery */}
        <div className="w-full md:w-[450px] shrink-0 space-y-4">
          <div className="w-full pt-[100%] relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
            {productImages.length > 0 ? (
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="absolute inset-0 flex overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar cursor-zoom-in"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {productImages.map((imgUrl, idx) => (
                  <div 
                    key={idx} 
                    className="w-full h-full shrink-0 snap-start relative"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`${product.name} ${idx + 1}`} 
                      className="w-full h-full object-cover pointer-events-none" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-bold bg-gray-100">NO IMG</div>
            )}
            {product.promo_type === 'flash_sale' && (
              <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-md shadow-md z-10 flex items-center gap-1.5 border border-red-500/30 animate-pulse">
                ⚡ Flash Sale {product.discount_percent > 0 && `-${product.discount_percent}%`}
              </div>
            )}
            {product.promo_type === 'custom_promo' && (
              <div className="absolute top-4 left-4 bg-amber-500 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-md shadow-md z-10 flex items-center gap-1.5 border border-amber-400/30 animate-pulse">
                ✨ Promo Spesial {product.discount_percent > 0 && `-${product.discount_percent}%`}
              </div>
            )}
            {!product.promo_type && product.discount_percent > 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 animate-pulse">
                DISKON {product.discount_percent}%
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {productImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto py-1 hide-scrollbar">
              {productImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleThumbnailClick(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    idx === activeImageIndex ? 'border-emas shadow-sm scale-95' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <img src={imgUrl} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="flex-1 py-2 flex flex-col">
          {product.promo_type === 'flash_sale' && (
            <div className="flex mb-2">
              <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-black uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1 animate-pulse border border-red-200">
                ⚡ Flash Sale
              </span>
            </div>
          )}
          {product.promo_type === 'custom_promo' && (
            <div className="flex mb-2">
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-black uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1 animate-pulse border border-amber-200">
                ✨ Promo Spesial
              </span>
            </div>
          )}
          <h1 className="text-xl md:text-2xl font-medium text-hitam mb-2 leading-tight">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-4 text-sm mb-4">
            <div className="text-hitam"><span className="font-bold">{soldCount}</span> Terjual</div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-2xl border border-gray-100 mb-8 shadow-sm">
            {product.discount_percent > 0 && product.original_price ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    Diskon {product.discount_percent}%
                  </span>
                  <span className="text-gray-400 line-through">
                    Rp {Number(product.original_price).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-3xl font-bold text-hitam-gelap">
                  Rp {Number(product.price).toLocaleString('id-ID')}
                </div>
              </div>
            ) : (
              <div className="text-3xl font-bold text-hitam-gelap flex items-center gap-2">
                Rp {product.price ? Number(product.price).toLocaleString('id-ID') : '-'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 mb-8 flex-1">
            <div className="flex items-start gap-6">
              <span className="text-gray-500 w-24 shrink-0 text-sm mt-0.5">Pengiriman</span>
              <div className="flex flex-col gap-1.5 text-sm text-hitam">
                <div className="flex items-center gap-2 font-medium">
                  <span>Dikirim dari:</span>
                  <span className="font-bold text-emas flex items-center gap-1">
                    <MapPin size={14} /> {originCity || 'Jakarta Barat'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {product.free_shipping !== false ? (
                    <>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 text-xs rounded-sm font-bold flex items-center gap-1">
                        <ShieldCheck size={12}/> Gratis Ongkir
                      </span>
                      <span className="text-gray-600">Pengiriman ke Kota Anda</span>
                    </>
                  ) : (
                    <span className="text-gray-600">Ongkos kirim dihitung saat checkout</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-gray-500 w-24 shrink-0 text-sm">Kuantitas</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-white shadow-sm">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-emas transition-colors"
                  >-</button>
                  <input 
                    type="text" 
                    value={quantity} 
                    onChange={handleQuantityChange}
                    onBlur={handleQuantityBlur}
                    className="w-12 h-10 text-center font-medium text-hitam border-x border-gray-100 outline-none bg-white focus:bg-gray-50/30 transition-all"
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    disabled={quantity >= (product.promo_type ? product.original_stock : product.stock)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-emas transition-colors disabled:opacity-50"
                  >+</button>
                </div>
                <span className="text-sm text-gray-500">
                  Tersisa {product.promo_type ? product.original_stock : product.stock} buah
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleBuyNow}
              disabled={product.promo_type ? product.original_stock <= 0 : product.stock <= 0}
              className="w-full bg-gradient-to-r from-emas to-yellow-400 text-hitam py-4 rounded-full font-bold text-lg hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(212,168,73,0.3)] transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              Beli Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Description & Store Info */}
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden mb-10">
        <div className="p-6 md:p-8 bg-gray-50/50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-hitam-gelap uppercase tracking-wide">Spesifikasi & Deskripsi Produk</h2>
        </div>
        <div className="p-6 md:p-8 text-sm text-gray-700">
          <div className="grid grid-cols-2 max-w-sm gap-y-4 mb-8">
            <div className="text-gray-500">Kategori</div>
            <div><Link to={`/products?category=${product.categories?.slug}`} className="text-emas">{product.categories?.name}</Link></div>
            <div className="text-gray-500">Stok</div>
            <div>
              <span>{product.promo_type ? product.original_stock : product.stock} unit</span>
            </div>
            <div className="text-gray-500">Dikirim Dari</div>
            <div>{originCity || 'Jakarta Barat'}</div>
          </div>
          <div className="whitespace-pre-line leading-relaxed text-gray-700">
            {product.description || "Tidak ada deskripsi rinci untuk produk ini."}
          </div>
        </div>
      </div>


      <PopupModal 
        {...modalConfig}
        onClose={closeModal}
      />

      {/* Lightbox Modal */}
      {isLightboxOpen && productImages.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col justify-between p-4 md:p-8 backdrop-blur-md select-none">
          {/* Header */}
          <div className="flex justify-between items-center text-white z-10">
            <span className="text-sm font-semibold tracking-wide bg-black/40 px-3 py-1 rounded-full">
              {activeImageIndex + 1} / {productImages.length}
            </span>
            <button 
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-white transition-all shadow-md"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Large Image Container */}
          <div className="flex-1 flex items-center justify-center relative my-4">
            {/* Left Button */}
            {productImages.length > 1 && (
              <button 
                onClick={() => setActiveImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))}
                className="absolute left-2 md:left-4 p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-white transition-all z-10 shadow-lg"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img 
              src={productImages[activeImageIndex]} 
              alt={product.name} 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-300 transform scale-100"
            />

            {/* Right Button */}
            {productImages.length > 1 && (
              <button 
                onClick={() => setActiveImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))}
                className="absolute right-2 md:right-4 p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-white transition-all z-10 shadow-lg"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Thumbnails bottom selector */}
          {productImages.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto py-2 z-10 max-w-md mx-auto hide-scrollbar">
              {productImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    idx === activeImageIndex ? 'border-emas shadow-lg scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt="Thumbnail selector" className="w-full h-full object-cover pointer-events-none" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
