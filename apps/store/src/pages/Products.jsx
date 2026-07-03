import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft, SlidersHorizontal, X, Truck } from 'lucide-react';
import useCurrencyStore from '../store/useCurrencyStore';
import { formatPrice } from '../utils/currencyHelper';
import { useTranslation } from '../utils/translations';

export default function Products() {
  const { currency, rates } = useCurrencyStore();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);

  const categoryFilter = searchParams.get('category');
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort') || 'terkait';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true })
          .order('name');
        setCategories(catData || []);

        let query = supabase
          .from('products')
          .select('*, categories(name, slug)')
          .eq('is_active', true);

        if (categoryFilter) {
          const cat = catData?.find(c => c.slug === categoryFilter);
          if (cat) query = query.eq('category_id', cat.id);
        }

        // Sort at DB level
        if (sortBy === 'terlaris') {
          query = query.order('sold_count', { ascending: false });
        } else {
          // terkait: default order based on admin sorting
          query = query.order('display_order', { ascending: true }).order('created_at', { ascending: false });
        }

        const { data: prodData, error } = await query;
        if (error) throw error;

        // Fetch active promotions to apply promotional overrides
        const { data: activePromos, error: promoError } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_active', true);

        let mappedProducts = prodData || [];

        if (!promoError && activePromos && activePromos.length > 0 && mappedProducts.length > 0) {
          const promoIds = activePromos.map(p => p.id);
          const { data: promoProds, error: promoProdError } = await supabase
            .from('promo_products')
            .select('promo_id, product_id, discount_percent, promo_stock')
            .in('promo_id', promoIds);

          if (!promoProdError && promoProds && promoProds.length > 0) {
            const flashSalePromo = activePromos.find(p => p.type === 'flash_sale');
            const customPromo = activePromos.find(p => p.type === 'custom_promo');

            mappedProducts = mappedProducts.map(p => {
              let matchedPromoRel = null;
              let matchedPromo = null;

              if (flashSalePromo && promoProds.some(rp => rp.product_id === p.id && rp.promo_id === flashSalePromo.id && rp.promo_stock > 0)) {
                matchedPromoRel = promoProds.find(rp => rp.product_id === p.id && rp.promo_id === flashSalePromo.id);
                matchedPromo = flashSalePromo;
              } else if (customPromo && promoProds.some(rp => rp.product_id === p.id && rp.promo_id === customPromo.id && rp.promo_stock > 0)) {
                matchedPromoRel = promoProds.find(rp => rp.product_id === p.id && rp.promo_id === customPromo.id);
                matchedPromo = customPromo;
              }

              if (matchedPromo && matchedPromoRel) {
                const finalDiscount = matchedPromo.use_default_discount
                  ? (matchedPromo.discount_percent || 0)
                  : (matchedPromoRel.discount_percent !== null && matchedPromoRel.discount_percent !== undefined ? matchedPromoRel.discount_percent : (matchedPromo.discount_percent || 0));

                const origPrice = Number(p.original_price || p.price);
                const discountPrice = origPrice - (origPrice * finalDiscount / 100);

                return {
                  ...p,
                  discount_percent: finalDiscount,
                  original_price: origPrice,
                  price: discountPrice,
                  stock: matchedPromoRel.promo_stock !== null && matchedPromoRel.promo_stock !== undefined ? matchedPromoRel.promo_stock : p.stock,
                  original_stock: p.stock,
                  promo_type: matchedPromo.type,
                  regular_price: p.price
                };
              }
              return p;
            });
          }
        }

        setProducts(mappedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [categoryFilter, sortBy]);

  // Filter by search query (client-side for instant results)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.categories?.name?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Update URL params without losing existing ones
  const updateParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k]; });
    setSearchParams(merged);
  };

  const SORT_OPTIONS = [
    { key: 'terkait', label: t('relevant') },
    { key: 'terlaris', label: t('best_seller') },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto pt-4 md:pt-6 px-4 flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8 pb-20">

      {/* Mobile: Back Button + Filter Toggle */}
      <div className="flex items-center justify-between md:hidden mb-1">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emas transition-colors group">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          {t('back')}
        </button>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm hover:border-emas hover:text-emas transition-all"
        >
          <SlidersHorizontal size={15} />
          {t('filter')}
          {categoryFilter && <span className="w-2 h-2 rounded-full bg-emas inline-block"></span>}
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {filterOpen && (
        <div className="md:hidden bg-white rounded-2xl shadow-soft border border-gray-100 p-5 mb-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-hitam uppercase tracking-widest">{t('category_filter')}</h3>
            <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-hitam"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { updateParams({ category: '' }); setFilterOpen(false); }}
              className={`px-4 py-2 rounded-xl text-sm transition-all duration-300 ${!categoryFilter ? 'bg-orange-50/80 text-emas font-bold border border-emas/20' : 'bg-gray-50 text-gray-600 border border-gray-100 font-medium'}`}
            >
              {t('all')}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { updateParams({ category: cat.slug }); setFilterOpen(false); }}
                className={`px-4 py-2 rounded-xl text-sm transition-all duration-300 ${categoryFilter === cat.slug ? 'bg-orange-50/80 text-emas font-bold border border-emas/20' : 'bg-gray-50 text-gray-600 border border-gray-100 font-medium'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sidebar Filters - Desktop only */}
      <aside className="w-full md:w-56 shrink-0 hidden md:block">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100 sticky top-24">
          <h3 className="text-base font-bold text-hitam mb-4 uppercase flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            {t('category_filter')}
          </h3>
          <div className="flex flex-col gap-1.5 text-sm">
            <button
              onClick={() => updateParams({ category: '' })}
              className={`text-left px-4 py-2.5 rounded-xl transition-all duration-300 ${!categoryFilter ? 'bg-orange-50/80 text-emas font-bold shadow-sm border border-emas/20' : 'text-gray-600 hover:bg-gray-50 hover:text-hitam-gelap font-medium'}`}
            >
              {t('all_products')}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => updateParams({ category: cat.slug })}
                className={`text-left px-4 py-2.5 rounded-xl transition-all duration-300 ${categoryFilter === cat.slug ? 'bg-orange-50/80 text-emas font-bold shadow-sm border border-emas/20' : 'text-gray-600 hover:bg-gray-50 hover:text-hitam-gelap font-medium'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">

        {/* Search Result Info */}
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">
              {t('search_results')} <span className="font-bold text-zinc-800">"{searchQuery}"</span>
              {' '}— <span className="text-emas font-bold">{filteredProducts.length} {t('products_found')}</span>
            </span>
            <button
              onClick={() => updateParams({ search: '' })}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 px-2 py-1 rounded-full transition-all"
            >
              <X size={12} /> {t('clear')}
            </button>
          </div>
        )}

        {/* Sort Header */}
        <div className="bg-white p-4 mb-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between text-sm overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-3 min-w-max">
            <span className="text-gray-500 mr-2 font-medium">{t('sort_by')}</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => updateParams({ sort: opt.key })}
                className={`px-5 py-2 rounded-full font-bold transition-all ${
                  sortBy === opt.key
                    ? 'bg-emas text-hitam shadow-md hover:shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-hitam font-medium'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-gray-400 text-xs ml-4 shrink-0">
            {filteredProducts.length} {t('products_count')}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[60vh] w-full col-span-full">
            <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredProducts.map(product => {
              const soldCount = product.sold_count ?? 0;

              return (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-yellow-200 hover:-translate-y-1.5 shadow-sm hover:shadow-soft transition-all duration-300 flex flex-col h-full group"
                >
                  <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-100">NO IMG</div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {product.promo_type === 'flash_sale' && (
                        <div className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm tracking-wider">
                          ⚡ {t('flash_sale')}
                        </div>
                      )}
                      {product.promo_type === 'custom_promo' && (
                        <div className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm tracking-wider">
                          ✨ {t('promo')}
                        </div>
                      )}
                    </div>
                    {product.discount_percent > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 animate-pulse">
                        -{product.discount_percent}%
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-medium text-zinc-700 leading-snug line-clamp-2 mb-2 group-hover:text-emas transition-colors">
                      {product.name}
                    </h3>

                    <div className="mt-auto pt-3 border-t border-gray-50">
                      {product.discount_percent > 0 && product.original_price ? (
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                              {product.discount_percent}%
                            </span>
                            <span className="text-xs text-zinc-400 line-through">
                              {formatPrice(product.original_price, currency, rates)}
                            </span>
                          </div>
                          <div className="text-hitam-gelap font-bold text-base leading-none">
                            {formatPrice(product.price, currency, rates)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-hitam-gelap font-bold text-lg leading-none mb-3">
                          {product.price ? formatPrice(product.price, currency, rates) : '-'}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <div>{t('sold')} {soldCount}</div>
                        {product.free_shipping !== false && (
                          <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[9px] uppercase tracking-wider">
                            <Truck size={10} /> {t('free_shipping')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-2xl">
                {searchQuery
                  ? t('no_search_results', { query: searchQuery })
                  : t('no_products_found')
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
