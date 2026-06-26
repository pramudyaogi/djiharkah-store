import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const categoryFilter = searchParams.get('category');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: catData } = await supabase.from('categories').select('*').order('display_order', { ascending: true }).order('name');
        setCategories(catData || []);

        let query = supabase.from('products').select('*, categories(name, slug)').eq('is_active', true);
        
        if (categoryFilter) {
          const cat = catData?.find(c => c.slug === categoryFilter);
          if (cat) {
            query = query.eq('category_id', cat.id);
          }
        }
        
        const { data: prodData, error } = await query;
        if (error) throw error;
        setProducts(prodData || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [categoryFilter]);

  return (
    <div className="w-full max-w-[1400px] mx-auto pt-6 px-4 flex flex-col md:flex-row gap-6 lg:gap-8 pb-20">

      {/* Back Button */}
      <div className="w-full md:hidden mb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emas transition-colors group">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Kembali
        </button>
      </div>
      {/* Sidebar Filters (Marketplace style) */}
      <aside className="w-full md:w-56 shrink-0">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100 sticky top-24">
          <h3 className="text-base font-bold text-hitam mb-4 uppercase flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filter Kategori
          </h3>
          <div className="flex flex-col gap-1.5 text-sm">
            <button 
              onClick={() => setSearchParams({})}
              className={`text-left px-4 py-2.5 rounded-xl transition-all duration-300 ${!categoryFilter ? 'bg-orange-50/80 text-emas font-bold shadow-sm border border-emas/20' : 'text-gray-600 hover:bg-gray-50 hover:text-hitam-gelap font-medium'}`}
            >
              Semua Produk
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSearchParams({ category: cat.slug })}
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
        {/* Sort/Filter Header */}
        <div className="bg-white p-4 mb-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between text-sm overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-3 min-w-max">
            <span className="text-gray-500 mr-2 font-medium">Urutkan:</span>
            <button className="bg-emas text-hitam px-5 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all">Terkait</button>
            <button className="bg-white text-gray-600 px-5 py-2 rounded-full border border-gray-200 hover:bg-gray-50 hover:text-hitam transition-all font-medium">Terbaru</button>
            <button className="bg-white text-gray-600 px-5 py-2 rounded-full border border-gray-200 hover:bg-gray-50 hover:text-hitam transition-all font-medium">Terlaris</button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products.map(product => {
              const fakeSold = Math.floor(product.id.charCodeAt(0) * 1.5) + 12;
              const fakeRating = (Math.random() * (5 - 4.5) + 4.5).toFixed(1);

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
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-medium text-zinc-700 leading-snug line-clamp-2 mb-2 group-hover:text-emas transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto pt-3 border-t border-gray-50">
                      <div className="text-hitam-gelap font-bold text-lg leading-none mb-3">
                        Rp {product.price.toLocaleString('id-ID')}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <div className="flex items-center gap-1 font-medium">
                          <span className="text-yellow-400 text-sm">★</span> {fakeRating}
                        </div>
                        <div>Terjual {fakeSold}+</div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
            {products.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-500 bg-white">
                Produk tidak ditemukan.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
