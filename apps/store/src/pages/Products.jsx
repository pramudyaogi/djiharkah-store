import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const categoryFilter = searchParams.get('category');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: catData } = await supabase.from('categories').select('*').order('name');
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
    <div className="max-w-[1200px] mx-auto pt-6 px-4 flex flex-col md:flex-row gap-4">
      {/* Sidebar Filters (Marketplace style) */}
      <aside className="w-full md:w-48 shrink-0">
        <div className="bg-white p-4 shadow-sm">
          <h3 className="text-base font-bold text-hitam mb-4 uppercase flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filter Kategori
          </h3>
          <div className="flex flex-col gap-2 text-sm">
            <button 
              onClick={() => setSearchParams({})}
              className={`text-left py-1 hover:text-emas transition-colors flex items-center gap-2 ${!categoryFilter ? 'text-emas font-bold' : 'text-gray-600'}`}
            >
              {!categoryFilter && <span className="w-1.5 h-1.5 bg-emas rounded-full"></span>}
              Semua Produk
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSearchParams({ category: cat.slug })}
                className={`text-left py-1 hover:text-emas transition-colors flex items-center gap-2 ${categoryFilter === cat.slug ? 'text-emas font-bold' : 'text-gray-600'}`}
              >
                {categoryFilter === cat.slug && <span className="w-1.5 h-1.5 bg-emas rounded-full"></span>}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Sort/Filter Header */}
        <div className="bg-white p-3 mb-4 shadow-sm flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 mr-2">Urutkan</span>
            <button className="bg-emas text-hitam px-4 py-1.5 border border-transparent font-medium">Terkait</button>
            <button className="bg-white text-hitam px-4 py-1.5 border border-gray-200 hover:bg-gray-50">Terbaru</button>
            <button className="bg-white text-hitam px-4 py-1.5 border border-gray-200 hover:bg-gray-50">Terlaris</button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {products.map(product => {
              const fakeSold = Math.floor(product.id.charCodeAt(0) * 1.5) + 12;
              const fakeRating = (Math.random() * (5 - 4.5) + 4.5).toFixed(1);

              return (
                <Link 
                  key={product.id} 
                  to={`/products/${product.slug}`}
                  className="bg-white border border-transparent hover:border-emas hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(212,168,73,0.3)] transition-all duration-200 flex flex-col h-full group"
                >
                  <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-100">NO IMG</div>
                    )}
                  </div>
                  
                  <div className="p-2 flex flex-col flex-1">
                    <h3 className="text-sm text-hitam leading-tight line-clamp-2 mb-2 group-hover:text-emas transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto">
                      <div className="text-emas font-bold text-lg leading-none mb-2">
                        Rp {product.price.toLocaleString('id-ID')}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <div className="flex items-center gap-0.5">
                          <span className="text-yellow-400">★</span> {fakeRating}
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
