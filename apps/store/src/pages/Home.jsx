import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/useCartStore';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          supabase.from('categories').select('*').order('name'),
          supabase.from('products').select('*, categories(name)').eq('is_active', true).limit(6)
        ]);
        
        if (catRes.error) throw catRes.error;
        if (prodRes.error) throw prodRes.error;

        setCategories(catRes.data);
        setFeaturedProducts(prodRes.data);
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
        <div className="text-emas font-playfair text-xl">Memuat Koleksi...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-hitam text-white py-32 rounded-3xl overflow-hidden shadow-2xl mb-16">
        <div className="absolute inset-0 bg-gradient-to-r from-hitam to-hitam/60 z-10"></div>
        {/* Banner Placeholder (if you have an image, replace the src) */}
        <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1574866089759-45037d6e680a?q=80&w=2000')] bg-cover bg-center"></div>
        
        <div className="relative z-20 max-w-4xl mx-auto px-6 text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-playfair font-bold text-emas tracking-tight">
            Kemewahan dalam Ibadah
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-inter max-w-2xl mx-auto">
            Temukan koleksi sarung eksklusif dari merek-merek ternama. Kualitas premium untuk kenyamanan maksimal Anda.
          </p>
          <div className="pt-8">
            <Link to="/products" className="inline-block bg-emas text-hitam px-8 py-4 text-lg font-bold transition-all hover:bg-hitam hover:text-emas hover:border-emas border border-transparent shadow-[0_0_15px_rgba(212,168,73,0.5)]">
              BELANJA SEKARANG
            </Link>
          </div>
        </div>
      </section>
      
      {/* Kategori Populer */}
      <section className="mb-20">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-playfair font-bold text-emas border-b-2 border-emas pb-2 inline-block">Kategori Unggulan</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map(category => (
            <Link 
              key={category.id} 
              to={`/products?category=${category.slug}`}
              className="group bg-white border border-emas/30 p-6 flex items-center justify-center h-32 hover:border-emas hover:border-2 hover:shadow-[0_4px_20px_rgba(212,168,73,0.15)] transition-all cursor-pointer"
            >
              <h3 className="text-hitam font-playfair text-xl font-bold group-hover:text-emas transition-colors text-center">{category.name}</h3>
            </Link>
          ))}
          {categories.length === 0 && <p className="text-abu-abu">Belum ada kategori.</p>}
        </div>
      </section>

      {/* Produk Unggulan */}
      <section className="mb-20">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-playfair font-bold text-emas border-b-2 border-emas pb-2 inline-block">Produk Pilihan</h2>
          <Link to="/products" className="text-emas hover:text-emas-terang text-sm font-medium uppercase tracking-wider">Lihat Semua →</Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map(product => (
            <div key={product.id} className="bg-white border border-gray-200 overflow-hidden group hover:border-emas/50 transition-all duration-300">
              <div className="relative h-72 bg-gray-100 overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-playfair text-lg">No Image</div>
                )}
              </div>
              <div className="p-6">
                <div className="text-xs text-abu-abu mb-2 font-medium uppercase tracking-wider">{product.categories?.name}</div>
                <Link to={`/products/${product.slug}`}>
                  <h3 className="text-xl font-playfair font-bold text-hitam mb-3 hover:text-emas transition-colors">{product.name}</h3>
                </Link>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-2xl font-bold text-emas">Rp {product.price.toLocaleString('id-ID')}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => addItem(product)}
                      className="border border-hitam text-hitam px-4 py-2 text-sm font-bold hover:bg-emas hover:border-emas hover:text-hitam transition-all"
                    >
                      Beli
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {featuredProducts.length === 0 && <p className="text-abu-abu">Belum ada produk aktif.</p>}
        </div>
      </section>
    </div>
  );
}
