import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/useCartStore';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const categoryFilter = searchParams.get('category');
  const addItem = useCartStore(state => state.addItem);

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
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0">
        <h3 className="text-xl font-playfair font-bold text-emas border-b border-emas/30 pb-3 mb-6">Kategori</h3>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setSearchParams({})}
            className={`text-left px-4 py-2 border transition-all ${!categoryFilter ? 'bg-hitam text-emas border-hitam' : 'bg-white text-hitam border-gray-200 hover:border-emas'}`}
          >
            Semua Produk
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSearchParams({ category: cat.slug })}
              className={`text-left px-4 py-2 border transition-all ${categoryFilter === cat.slug ? 'bg-hitam text-emas border-hitam' : 'bg-white text-hitam border-gray-200 hover:border-emas'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <h2 className="text-3xl font-playfair font-bold text-hitam mb-8">
          {categoryFilter ? `Kategori: ${categories.find(c => c.slug === categoryFilter)?.name || categoryFilter}` : 'Semua Produk'}
        </h2>
        
        {loading ? (
          <div className="text-emas font-playfair text-xl py-12">Memuat...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map(product => (
              <div key={product.id} className="bg-white border border-gray-200 overflow-hidden group hover:border-emas/50 transition-all duration-300">
                <div className="relative h-64 bg-gray-100 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-playfair">No Image</div>
                  )}
                </div>
                <div className="p-5">
                  <Link to={`/products/${product.slug}`}>
                    <h3 className="text-lg font-playfair font-bold text-hitam mb-2 hover:text-emas transition-colors truncate">{product.name}</h3>
                  </Link>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xl font-bold text-emas">Rp {product.price.toLocaleString('id-ID')}</span>
                    <button 
                      onClick={() => addItem(product)}
                      className="border border-hitam text-hitam px-3 py-1.5 text-sm font-bold hover:bg-emas hover:border-emas hover:text-hitam transition-all"
                    >
                      Beli
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && <p className="text-abu-abu col-span-full">Tidak ada produk yang ditemukan.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
