import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShieldCheck, Truck, Clock, Store, Star, MessageSquare, CornerDownRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useCurrencyStore from '../store/useCurrencyStore';
import { formatPrice } from '../utils/currencyHelper';
import { useTranslation } from '../utils/translations';

export default function Home() {
  const { currency, rates } = useCurrencyStore();
  const { t, language } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', guest_name: '', guest_phone: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // New Promo States
  const [flashSale, setFlashSale] = useState(null);
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [customPromo, setCustomPromo] = useState(null);
  const [customPromoProducts, setCustomPromoProducts] = useState([]);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // Query categories, reviews, and all promotions
        const [catRes, revRes, promoRes] = await Promise.all([
          supabase.from('categories').select('*').order('display_order', { ascending: true }).order('name'),
          supabase.from('store_reviews').select('*, profiles(full_name)').order('created_at', { ascending: false }),
          supabase.from('promotions').select('*')
        ]);
        
        if (catRes.error) throw catRes.error;
        if (revRes.error) throw revRes.error;
        if (promoRes.error) throw promoRes.error;

        setCategories(catRes.data || []);
        setReviews(revRes.data || []);

        // Find active promotions
        const activeFS = promoRes.data?.find(p => p.type === 'flash_sale' && p.is_active) || null;
        const activeCP = promoRes.data?.find(p => p.type === 'custom_promo' && p.is_active) || null;

        setFlashSale(activeFS);
        setCustomPromo(activeCP);

        const promises = [];

        // 1. Fetch FS products if active
        if (activeFS) {
          promises.push(
            supabase
              .from('promo_products')
              .select('discount_percent, promo_stock, sort_order, products(*, categories(name))')
              .eq('promo_id', activeFS.id)
              .gt('promo_stock', 0)
              .order('sort_order', { ascending: true })
              .then(({ data }) => {
                return data?.map(r => {
                  if (!r.products) return null;
                  const finalDiscount = activeFS.use_default_discount
                    ? (activeFS.discount_percent || 0)
                    : (r.discount_percent !== null && r.discount_percent !== undefined ? r.discount_percent : (activeFS.discount_percent || 0));
                  const origPrice = Number(r.products.original_price || r.products.price);
                  const discountPrice = origPrice - (origPrice * finalDiscount / 100);
                  return {
                    ...r.products,
                    discount_percent: finalDiscount,
                    original_price: origPrice,
                    price: discountPrice,
                    stock: r.promo_stock !== null && r.promo_stock !== undefined ? r.promo_stock : r.products.stock,
                    original_stock: r.products.stock,
                    promo_type: activeFS.type,
                    regular_price: r.products.price
                  };
                }).filter(Boolean) || [];
              })
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        // 2. Fetch CP products if active
        if (activeCP) {
          promises.push(
            supabase
              .from('promo_products')
              .select('discount_percent, promo_stock, sort_order, products(*, categories(name))')
              .eq('promo_id', activeCP.id)
              .gt('promo_stock', 0)
              .order('sort_order', { ascending: true })
              .then(({ data }) => {
                return data?.map(r => {
                  if (!r.products) return null;
                  const finalDiscount = activeCP.use_default_discount
                    ? (activeCP.discount_percent || 0)
                    : (r.discount_percent !== null && r.discount_percent !== undefined ? r.discount_percent : (activeCP.discount_percent || 0));
                  const origPrice = Number(r.products.original_price || r.products.price);
                  const discountPrice = origPrice - (origPrice * finalDiscount / 100);
                  return {
                    ...r.products,
                    discount_percent: finalDiscount,
                    original_price: origPrice,
                    price: discountPrice,
                    stock: r.promo_stock !== null && r.promo_stock !== undefined ? r.promo_stock : r.products.stock,
                    original_stock: r.products.stock,
                    promo_type: activeCP.type,
                    regular_price: r.products.price
                  };
                }).filter(Boolean) || [];
              })
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        // 3. Fetch Featured/Exclusive products (fallback to active products if empty)
        promises.push(
          supabase
            .from('products')
            .select('*, categories(name)')
            .eq('is_active', true)
            .eq('is_exclusive', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(18)
            .then(async ({ data, error }) => {
              if (error || !data || data.length === 0) {
                const fallbackRes = await supabase
                  .from('products')
                  .select('*, categories(name)')
                  .eq('is_active', true)
                  .order('display_order', { ascending: true })
                  .order('created_at', { ascending: false })
                  .limit(18);
                return fallbackRes.data || [];
              }
              return data;
            })
        );

        const [fsProds, cpProds, featProds] = await Promise.all(promises);
        setFlashSaleProducts(fsProds);
        setCustomPromoProducts(cpProds);
        setFeaturedProducts(featProds);

      } catch (err) {
        console.error(err);
        setFetchError(err.message || 'Gagal mengambil data dari database.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Flash Sale Timer Effect
  useEffect(() => {
    if (!flashSale || !flashSale.ends_at) return;

    const timer = setInterval(() => {
      const difference = new Date(flashSale.ends_at) - new Date();
      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft('SELESAI');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [flashSale]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.guest_name || !reviewForm.guest_phone) {
      setReviewMessage(t('name_phone_required'));
      return;
    }
    if (!reviewForm.comment.trim()) {
      setReviewMessage(t('comment_required'));
      return;
    }

    setIsSubmittingReview(true);
    try {
      setReviewMessage('');

      const reviewData = {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        guest_name: reviewForm.guest_name,
        guest_phone: reviewForm.guest_phone
      };

      const { data, error } = await supabase
        .from('store_reviews')
        .insert(reviewData)
        .select('*, profiles(full_name)')
        .single();

      if (error) throw error;

      setReviews([data, ...reviews]);
      setReviewForm({ rating: 5, comment: '', guest_name: '', guest_phone: '' });
      setReviewMessage(t('review_success'));
      setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewMessage('');
      }, 1500);
    } catch (err) {
      setReviewMessage(err.message || t('review_failed'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      {fetchError && (
        <div className="w-full max-w-[1400px] px-4 md:px-6 mt-6">
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl text-sm font-medium">
            Error loading storefront data: {fetchError}
          </div>
        </div>
      )}
      
      {/* Hero Banner Section (Two-Column Layout) */}
      <div className="w-full max-w-[1400px] px-4 md:px-6 mb-12 mt-6">
        <div className="w-full relative rounded-3xl overflow-hidden shadow-xl border border-gray-100 bg-zinc-950 flex flex-col-reverse md:flex-row">
          
          {/* Left Column: Text */}
          <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center relative z-10">
            {/* Subtle glow effect behind text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emas/10 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-bold text-white mb-4 sm:mb-6 leading-tight drop-shadow-md">
                {t('hero_title')}
              </h1>
              <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg mb-6 sm:mb-8 md:mb-10 leading-relaxed font-light drop-shadow-md">
                {t('hero_subtitle')}
              </p>
              <Link to="/products" className="inline-flex items-center gap-2 bg-emas text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:-translate-y-1 transition-all duration-300 w-fit">
                {t('start_shopping')}
                <span className="text-lg">→</span>
              </Link>
            </div>
          </div>
          
          {/* Right Column: Image */}
          <div className="w-full md:w-1/2 h-[220px] sm:h-[300px] md:h-auto relative overflow-hidden block">
            {/* Transition gradients to blend image with the dark panel */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent z-10 md:hidden"></div>
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10 hidden md:block"></div>
            <div 
              className="absolute inset-0 z-0 bg-cover bg-no-repeat opacity-85 transition-transform duration-700 hover:scale-105"
              style={{ backgroundImage: "url('/hero-bg.png')", backgroundPosition: "center 20%" }}
            ></div>
          </div>
          
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1400px] w-full px-4 md:px-6">
        
        {/* Kategori Section (Horizontal Grid) */}
      <div className="bg-white rounded-2xl shadow-soft mb-12 overflow-hidden border border-gray-100">
        <div className="p-5 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-hitam-gelap tracking-wide">{t('explore_categories')}</h2>
        </div>
        <div className="p-6 md:p-8 bg-gray-50/30 flex overflow-x-auto justify-start md:justify-center gap-4 sm:gap-6 md:gap-8 no-scrollbar">
          {categories.slice(0, categories.length > 5 ? 4 : 5).map(category => (
            <Link 
              key={category.id} 
              to={`/products?category=${category.slug}`}
              className="bg-white p-4 md:p-6 rounded-2xl w-[100px] md:w-[160px] flex-shrink-0 flex flex-col items-center justify-center gap-2 md:gap-4 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emas/50 transition-all duration-300 cursor-pointer group relative z-10 hover:z-20 hover:-translate-y-1"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-emas transition-colors duration-300 text-zinc-400 group-hover:text-black group-hover:shadow-glow">
                <Package className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <span className="text-xs md:text-sm font-medium text-zinc-600 text-center line-clamp-2 group-hover:text-hitam-gelap transition-colors">{category.name}</span>
            </Link>
          ))}
          
          {categories.length > 5 && (
            <Link 
              to="/products"
              className="p-4 md:p-6 rounded-2xl w-[100px] md:w-[160px] flex-shrink-0 flex flex-col items-center justify-center gap-2 md:gap-4 shadow-sm border border-emas/30 bg-gradient-to-br from-white to-orange-50 hover:shadow-lg hover:shadow-emas/20 hover:border-emas transition-all duration-300 cursor-pointer group relative z-10 hover:z-20 hover:-translate-y-1"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white shadow-soft flex items-center justify-center group-hover:bg-emas transition-colors duration-300 text-emas group-hover:text-black">
                <span className="text-xl md:text-2xl font-bold font-playfair">&rarr;</span>
              </div>
              <span className="text-xs md:text-sm font-bold text-emas group-hover:text-hitam-gelap transition-colors">{t('others')}</span>
            </Link>
          )}

          {categories.length === 0 && (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center text-zinc-400">
              <Package size={48} className="mb-4 text-zinc-200" />
              <p className="text-lg font-medium text-zinc-500">{t('no_categories')}</p>
              <p className="text-sm">{t('no_categories_desc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Flash Sale Section */}
      {flashSale && flashSaleProducts.length > 0 && (
        <div className="mb-16 w-full bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent p-6 md:p-8 rounded-3xl border border-red-500/10 relative overflow-hidden">
          {/* Background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
              <span className="bg-red-500 text-white text-xs font-extrabold px-3 py-1 rounded-full animate-pulse uppercase tracking-wider shadow-md">
                {t('flash_sale')}
              </span>
              <h2 className="text-xl md:text-2xl font-playfair font-bold text-hitam-gelap">
                {language === 'EN' ? (flashSale.name_en || flashSale.name) : flashSale.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-2xl shadow-lg border border-zinc-800 self-start sm:self-auto">
              <span className="text-xs font-semibold text-zinc-400">{t('ends_in')}</span>
              <span className="font-mono text-base md:text-lg font-bold text-emas tracking-wider">{timeLeft}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 relative z-10">
            {flashSaleProducts.map(product => {
              const soldCount = product.sold_count ?? 0;
              const finalDiscountPercent = product.discount_percent || 0;
              const discountPrice = product.price;

              return (
                <Link 
                  key={product.id} 
                  to={`/products/${product.slug}`}
                  className="bg-white rounded-2xl overflow-hidden border border-red-100 hover:border-red-300 hover:-translate-y-1.5 shadow-sm hover:shadow-soft transition-all duration-300 flex flex-col h-full group"
                >
                  <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-100">NO IMG</div>
                    )}
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm z-10 tracking-wider">
                      ⚡ {t('flash_sale')}
                    </div>
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 animate-bounce">
                      -{finalDiscountPercent}%
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-medium text-zinc-700 leading-snug line-clamp-2 mb-2 group-hover:text-red-500 transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto pt-3 border-t border-gray-50">
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-400 line-through">
                            {formatPrice(product.original_price || product.price, currency, rates)}
                          </span>
                        </div>
                        <div className="text-red-600 font-bold text-base leading-none">
                          {formatPrice(discountPrice, currency, rates)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <div>{t('sold')} {soldCount}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Promo Section (e.g. Promo Ramadhan) */}
      {customPromo && customPromoProducts.length > 0 && (
        <div className="mb-16 w-full bg-gradient-to-r from-emerald-500/10 via-yellow-500/5 to-transparent p-6 md:p-8 rounded-3xl border border-emerald-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="mb-8 relative z-10">
            <h2 className="text-xl md:text-2xl font-playfair font-bold text-hitam-gelap flex items-center gap-2">
              <span className="text-emerald-600">✨</span> {language === 'EN' ? (customPromo.name_en || customPromo.name) : customPromo.name}
            </h2>
            {customPromo.description && (
              <p className="text-zinc-500 text-xs md:text-sm mt-1">
                {language === 'EN' ? (customPromo.description_en || customPromo.description) : customPromo.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 relative z-10">
            {customPromoProducts.map(product => {
              const soldCount = product.sold_count ?? 0;

              return (
                <Link 
                  key={product.id} 
                  to={`/products/${product.slug}`}
                  className="bg-white rounded-2xl overflow-hidden border border-emerald-100 hover:border-emerald-300 hover:-translate-y-1.5 shadow-sm hover:shadow-soft transition-all duration-300 flex flex-col h-full group"
                >
                  <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-100">NO IMG</div>
                    )}
                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm z-10 tracking-wider">
                      ✨ {t('promo')}
                    </div>
                    {product.discount_percent > 0 && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">
                        -{product.discount_percent}%
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-medium text-zinc-700 leading-snug line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto pt-3 border-t border-gray-50">
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-400 line-through">
                            {formatPrice(product.original_price || product.price, currency, rates)}
                          </span>
                        </div>
                        <div className="text-emerald-600 font-bold text-base leading-none">
                          {formatPrice(product.price, currency, rates)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <div>{t('sold')} {soldCount}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Products Grid */}
      <div className="w-full mb-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-emas font-bold text-xs uppercase tracking-widest">{t('promoSpecials') || t('special_promo')}</span>
            <h2 className="text-2xl md:text-3xl font-playfair font-bold text-hitam-gelap mt-1">{t('exclusive_choices')}</h2>
            <p className="text-gray-500 text-xs md:text-sm mt-1">{t('exclusive_desc')}</p>
          </div>
          <Link to="/products" className="text-sm font-bold text-emas hover:text-hitam transition-colors hover:underline">
            {t('view_all')} &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {featuredProducts.map(product => {
            const soldCount = product.sold_count ?? 0;
            const originalPrice = product.original_price;
            const currentPrice = product.price;
            const discountPercent = product.discount_percent ?? 0;

            return (
              <Link 
                key={product.id} 
                to={`/products/${product.slug}`}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-emas/30 hover:-translate-y-1.5 shadow-sm hover:shadow-soft transition-all duration-300 flex flex-col h-full group"
              >
                <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-100">NO IMG</div>
                  )}
                  {discountPercent > 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 animate-pulse">
                      -{discountPercent}%
                    </div>
                  )}
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute bottom-2 left-2 bg-yellow-500/90 backdrop-blur-xs text-black text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-xs z-10">
                      ⚠️ {t('limited_stock')}
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[10px] text-emas font-bold uppercase tracking-wider mb-1 block">{product.categories?.name}</span>
                  <h3 className="text-sm font-medium text-zinc-700 leading-snug line-clamp-2 mb-2 group-hover:text-emas transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto pt-3 border-t border-gray-50">
                    <div className="space-y-1 mb-2">
                      {discountPercent > 0 && originalPrice ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-400 line-through">
                            {formatPrice(originalPrice, currency, rates)}
                          </span>
                        </div>
                      ) : null}
                      <div className="text-hitam-gelap font-bold text-base leading-none">
                        {formatPrice(currentPrice, currency, rates)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1">
                        <span className="text-emas font-semibold">★</span>
                        <span>{product.rating ? Number(product.rating).toFixed(1) : '5.0'}</span>
                      </div>
                      <div>{t('sold')} {soldCount}</div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        {featuredProducts.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm mt-4 flex flex-col items-center justify-center">
             <Package size={48} className="mb-4 text-zinc-200" />
             <p className="text-lg font-medium text-zinc-500">{t('no_products')}</p>
             <p className="text-sm text-zinc-400 mt-1">{t('no_products_desc')}</p>
          </div>
        )}
      </div>

      {/* Store Reviews Section */}
      <div className="w-full max-w-[1400px] px-4 md:px-6 mb-20">
        <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            
            {/* Reviews Summary */}
            <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 flex flex-col justify-center items-center">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-playfair font-bold text-hitam-gelap mb-2">{t('store_rating')}</h2>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-5xl font-bold text-emas">{avgRating > 0 ? avgRating : '-'}</span>
                  <div className="flex flex-col items-start">
                    <div className="flex text-emas">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={20} fill={star <= Math.round(avgRating) ? "currentColor" : "none"} strokeWidth={star <= Math.round(avgRating) ? 0 : 2} className={star <= Math.round(avgRating) ? "" : "text-gray-300"} />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-500">{reviews.length} {t('reviews_count')}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-hitam hover:bg-emas text-white hover:text-black px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-glow transition-all duration-300 border border-zinc-800"
              >
                <MessageSquare size={18} />
                {t('leave_review')}
              </button>
            </div>

            {/* Reviews List */}
            <div className="col-span-1 md:col-span-2 p-8 md:p-10 max-h-[600px] overflow-y-auto bg-white custom-scrollbar">
              <h3 className="text-xl font-bold text-hitam-gelap mb-6">{t('recent_reviews')}</h3>
              
              <div className="space-y-6">
                {reviews.length > 0 ? reviews.map(review => (
                  <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-hitam">{review.user_id ? review.profiles?.full_name : review.guest_name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex text-emas">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} strokeWidth={i < review.rating ? 0 : 2} className={i < review.rating ? "" : "text-gray-300"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                    
                    {review.admin_reply && (
                      <div className="mt-4 ml-4 bg-gray-50 border-l-2 border-emas p-3 rounded-r-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <CornerDownRight size={14} className="text-emas" />
                          <span className="text-xs font-bold text-emas">{t('admin_reply')}</span>
                        </div>
                        <p className="text-sm text-gray-700">{review.admin_reply}</p>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-10">{t('no_reviews')}</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-hitam-gelap flex items-center gap-2 text-lg">
                <MessageSquare size={20} className="text-emas" /> {t('leave_review')}
              </h3>
              <button 
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setReviewMessage('');
                }}
                className="text-gray-400 hover:text-hitam transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body / Form */}
            <form onSubmit={handleReviewSubmit} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{t('your_rating')}</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, rating: star})}
                      className="focus:outline-none transition-transform hover:scale-115"
                    >
                      <Star 
                        size={32} 
                        fill={star <= reviewForm.rating ? "#D4AF37" : "none"} 
                        strokeWidth={star <= reviewForm.rating ? 0 : 1.5}
                        className={star <= reviewForm.rating ? "text-emas drop-shadow-[0_0_8px_rgba(212,175,55,0.2)]" : "text-gray-300"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{t('your_info')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder={t('full_name')} 
                    value={reviewForm.guest_name}
                    onChange={(e) => setReviewForm({...reviewForm, guest_name: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emas transition-all bg-gray-50/50 focus:bg-white"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder={t('phone_number')} 
                    value={reviewForm.guest_phone}
                    onChange={(e) => setReviewForm({...reviewForm, guest_phone: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emas transition-all bg-gray-50/50 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{t('comment_label')}</label>
                <textarea 
                  placeholder={t('comment_placeholder')}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emas transition-all bg-gray-50/50 focus:bg-white min-h-[100px]"
                  required
                ></textarea>
              </div>

              {reviewMessage && (
                <p className={`text-xs text-center font-medium ${reviewMessage.includes('Terima') || reviewMessage.includes('Thank') ? 'text-green-600' : 'text-red-500'}`}>{reviewMessage}</p>
              )}

              <button 
                type="submit" 
                disabled={isSubmittingReview}
                className="w-full bg-hitam text-white py-3 rounded-xl text-sm font-bold hover:bg-emas hover:text-black transition-colors disabled:opacity-50 shadow-md hover:shadow-glow"
              >
                {isSubmittingReview ? t('submitting') : t('submit_review')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
