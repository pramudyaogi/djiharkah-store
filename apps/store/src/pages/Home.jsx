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
        const [catRes, prodRes] = await Promise.all([
          supabase.from('categories').select('*').order('name'),
          supabase.from('products').select('*, categories(name)').eq('is_active', true).limit(18) // Load more for dense grid
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
        <div className="text-emas font-playfair text-xl">Memuat Toko...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pt-6 px-4">
      
      {/* Hero Banner Section (70/30 split) */}
      <div className="flex flex-col md:flex-row gap-2 mb-6">
        {/* Main Banner (70%) */}
        <div className="flex-[7] bg-hitam rounded-sm overflow-hidden relative h-[250px] md:h-[350px]">
          <div className="absolute inset-0 z-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1574866089759-45037d6e680a?q=80&w=1200')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-hitam to-transparent"></div>
          <div className="relative z-10 p-8 flex flex-col justify-center h-full max-w-lg">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-emas mb-3 leading-tight">Koleksi Sarung BHS Masterpiece</h1>
            <p className="text-white text-sm mb-6">Dapatkan penawaran eksklusif hanya minggu ini.</p>
            <Link to="/products" className="w-max bg-emas text-hitam px-6 py-2 text-sm font-bold shadow-md hover:bg-emas-terang transition-colors">
              Beli Sekarang
            </Link>
          </div>
        </div>
        
        {/* Right Banners (30%) */}
        <div className="flex-[3] flex flex-col gap-2">
          <div className="flex-1 bg-hitam-gelap rounded-sm overflow-hidden relative h-[120px] md:h-[171px] group cursor-pointer">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1601614272146-599c2d1b0d2d?q=80&w=600')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative z-10 p-4 h-full flex flex-col justify-center text-right items-end">
              <h3 className="text-lg font-playfair font-bold text-emas">Gajah Duduk</h3>
              <p className="text-white text-xs">Mulai Rp 100rb</p>
            </div>
          </div>
          <div className="flex-1 bg-hitam-gelap rounded-sm overflow-hidden relative h-[120px] md:h-[171px] group cursor-pointer">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1582230206121-5079a40552ed?q=80&w=600')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative z-10 p-4 h-full flex flex-col justify-center text-right items-end">
              <h3 className="text-lg font-playfair font-bold text-emas">Atlas Premium</h3>
              <p className="text-white text-xs">Nyaman & Elegan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kategori Section (Marketplace Style grid) */}
      <div className="bg-white rounded-sm shadow-sm mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-500 uppercase">Kategori</h2>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px bg-gray-100">
          {categories.map(category => (
            <Link 
              key={category.id} 
              to={`/products?category=${category.slug}`}
              className="bg-white p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow cursor-pointer h-[120px]"
            >
              <div className="w-12 h-12 rounded-full border-2 border-emas flex items-center justify-center bg-gray-50">
                {/* Placeholder icon */}
                <span className="text-emas font-playfair font-bold text-xl">{category.name.charAt(0)}</span>
              </div>
              <span className="text-xs text-hitam text-center line-clamp-2">{category.name}</span>
            </Link>
          ))}
          {categories.length === 0 && <div className="bg-white p-4 col-span-full">Belum ada kategori.</div>}
        </div>
      </div>

      {/* Rekomendasi / Daily Discover (Dense Grid 5-6 cols) */}
      <div className="mb-8">
        <div className="bg-white p-4 border-b-[3px] border-emas mb-4 sticky top-28 z-40">
          <h2 className="text-xl font-bold text-emas text-center uppercase tracking-wide">Rekomendasi Untuk Anda</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {featuredProducts.map(product => {
            // Generate a fake sold count for marketplace feel
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
                  {/* Overlay for "Terlaris" or promo could go here */}
                  {product.stock < 10 && product.stock > 0 && (
                    <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 z-10">Stok Terbatas</div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-2 flex flex-col flex-1">
                  <h3 className="text-sm text-hitam leading-tight line-clamp-2 mb-2 group-hover:text-emas transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] border border-emas text-emas px-1 bg-emas/10">Premium</span>
                    </div>
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
        </div>
        {featuredProducts.length === 0 && <p className="text-abu-abu text-center mt-8">Belum ada produk aktif.</p>}
        
        {featuredProducts.length > 0 && (
          <div className="flex justify-center mt-8">
            <Link to="/products" className="bg-white border border-gray-300 text-gray-600 px-32 py-3 hover:bg-gray-50 transition-colors text-sm shadow-sm">
              Muat Lebih Banyak
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
