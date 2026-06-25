import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Query ordered by sort_order
        const [catRes, prodRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('name'),
          supabase.from('products').select('*, categories(name)').eq('is_active', true).limit(18)
        ]);
        
        if (catRes.error) throw catRes.error;
        if (prodRes.error) throw prodRes.error;

        setCategories(catRes.data || []);
        setFeaturedProducts(prodRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Hero Banner Section (Rounded & Breathable) */}
      <div className="w-full max-w-[1400px] px-4 md:px-6 mb-12 mt-6">
        <div className="w-full relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden shadow-xl border border-gray-100">
          <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1574866089759-45037d6e680a?q=80&w=2000')] bg-cover bg-center"></div>
          {/* Subtle gradient just to make text readable, not fully black */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
          
          <div className="h-full px-8 md:px-16 relative z-10 flex flex-col justify-center">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-6xl font-playfair font-bold text-white mb-6 leading-tight drop-shadow-md">
                Kemewahan <br/><span className="text-yellow-500">dalam Ibadah</span>
              </h1>
              <p className="text-gray-200 text-sm md:text-lg mb-10 leading-relaxed font-light drop-shadow-md">
                Temukan koleksi sarung eksklusif dari merek-merek ternama. Kualitas premium untuk kenyamanan maksimal Anda dalam beribadah.
              </p>
              <Link to="/products" className="inline-flex items-center gap-2 bg-yellow-500 text-black px-8 py-3.5 rounded-full text-sm font-bold hover:bg-yellow-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                Mulai Belanja 
                <span className="text-lg">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1400px] w-full px-6">
        {/* Kategori Section (Horizontal Grid) */}
      <div className="bg-white rounded-sm shadow-sm mb-8">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-500 uppercase">Kategori Produk</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-px bg-gray-100">
          {categories.map(category => (
            <Link 
              key={category.id} 
              to={`/products?category=${category.slug}`}
              className="bg-white p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow cursor-pointer h-[130px] group"
            >
              <div className="w-14 h-14 rounded-full border-2 border-emas flex items-center justify-center bg-gray-50 group-hover:bg-emas/10 transition-colors">
                <span className="text-emas font-playfair font-bold text-2xl">{category.name.charAt(0)}</span>
              </div>
              <span className="text-xs text-hitam text-center line-clamp-2 group-hover:text-emas transition-colors">{category.name}</span>
            </Link>
          ))}
          {categories.length === 0 && (
            <div className="bg-white p-8 col-span-full text-center text-gray-500">
              Belum ada kategori. Hubungi Admin.
            </div>
          )}
        </div>
      </div>

      {/* Rekomendasi / Produk Pilihan (Dense Grid 5-6 cols) */}
      <div className="mb-12">
        <div className="bg-white p-4 border-b-[3px] border-emas mb-4 sticky top-28 z-40 shadow-sm flex justify-between items-center">
          <h2 className="text-xl font-bold text-emas uppercase tracking-wide">Pilihan Eksklusif</h2>
          <Link to="/products" className="text-xs text-gray-500 hover:text-emas transition-colors">Lihat Semua →</Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {featuredProducts.map(product => {
            const fakeSold = Math.floor(product.id.charCodeAt(0) * 1.5) + 12;
            const fakeRating = (Math.random() * (5 - 4.5) + 4.5).toFixed(1);

            return (
              <Link 
                key={product.id} 
                to={`/products/${product.slug}`}
                className="bg-white border border-transparent hover:border-emas hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(212,168,73,0.3)] transition-all duration-200 flex flex-col h-full group"
              >
                {/* Image */}
                <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-100">NO IMG</div>
                  )}
                  {product.stock < 10 && product.stock > 0 && (
                    <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 z-10">Stok Terbatas</div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-sm text-hitam leading-snug line-clamp-2 mb-2 group-hover:text-emas transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="text-emas font-bold text-lg leading-none mb-3">
                      Rp {product.price.toLocaleString('id-ID')}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-xs">★</span> {fakeRating}
                      </div>
                      <div>Terjual {fakeSold}+</div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        {featuredProducts.length === 0 && (
          <div className="bg-white p-12 text-center border border-gray-100 mt-4">
            <p className="text-gray-500 text-lg">Belum ada produk aktif.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
