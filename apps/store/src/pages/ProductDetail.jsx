import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/useCartStore';
import { Store, Star, Share2, Heart, ShieldCheck, ShoppingCart } from 'lucide-react';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(name, slug)')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [slug]);

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-12 h-12 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!product) return <div className="text-hitam font-playfair text-xl py-20 text-center">Produk tidak ditemukan.</div>;

  const fakeSold = Math.floor(product.id.charCodeAt(0) * 1.5) + 12;
  const fakeRating = (Math.random() * (5 - 4.5) + 4.5).toFixed(1);

  const handleAddToCart = () => {
    for(let i=0; i<quantity; i++) {
      addItem(product);
    }
    alert('Produk ditambahkan ke keranjang');
  };

  const handleBuyNow = () => {
    for(let i=0; i<quantity; i++) {
      addItem(product);
    }
    navigate('/cart');
  };

  return (
    <div className="max-w-[1200px] mx-auto pt-6 px-4 pb-20">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm mb-4 text-gray-500">
        <Link to="/" className="hover:text-emas transition-colors text-emas font-medium">Djiharkah</Link>
        <span className="mx-2">{'>'}</span>
        <Link to={`/products?category=${product.categories?.slug}`} className="hover:text-emas transition-colors">{product.categories?.name}</Link>
        <span className="mx-2">{'>'}</span>
        <span className="text-hitam truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="bg-white p-4 shadow-sm flex flex-col md:flex-row gap-8 mb-6">
        {/* Left: Image Gallery */}
        <div className="w-full md:w-[450px] shrink-0">
          <div className="w-full pt-[100%] relative bg-gray-50 border border-gray-100 mb-2">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-bold bg-gray-100">NO IMG</div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-hitam">
            <button className="flex items-center gap-2 hover:text-emas text-sm"><Share2 size={16}/> Bagikan</button>
            <button className="flex items-center gap-2 hover:text-emas text-sm"><Heart size={16}/> Favoritkan</button>
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex-1 py-2 flex flex-col">
          <h1 className="text-xl md:text-2xl font-medium text-hitam mb-2 leading-tight">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-4 text-sm mb-4">
            <div className="flex items-center gap-1 text-emas border-b border-emas pb-0.5">
              <span className="font-bold">{fakeRating}</span>
              <div className="flex text-emas"><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/></div>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="text-hitam border-b border-gray-600 pb-0.5"><span className="font-bold">24</span> Penilaian</div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="text-hitam"><span className="font-bold">{fakeSold}</span> Terjual</div>
          </div>

          <div className="bg-gray-50 p-4 mb-6">
            <div className="text-3xl font-bold text-emas flex items-center gap-2">
              Rp{product.price.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="flex flex-col gap-6 mb-8 flex-1">
            <div className="flex items-center gap-6">
              <span className="text-gray-500 w-24 shrink-0 text-sm">Pengiriman</span>
              <div className="flex items-center gap-2 text-sm text-hitam">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 text-xs rounded-sm font-bold flex items-center gap-1"><ShieldCheck size={12}/> Gratis Ongkir</span>
                <span>Pengiriman ke <span className="font-bold">Kota Anda</span></span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-gray-500 w-24 shrink-0 text-sm">Kuantitas</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded-sm overflow-hidden">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100"
                  >-</button>
                  <input 
                    type="text" 
                    value={quantity} 
                    readOnly
                    className="w-12 h-8 text-center text-hitam border-x border-gray-300 outline-none"
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    disabled={quantity >= product.stock}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >+</button>
                </div>
                <span className="text-sm text-gray-500">Tersisa {product.stock} buah</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="w-48 bg-emas/10 text-emas border border-emas py-3 text-sm font-medium hover:bg-emas/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart size={18} /> Masukkan Keranjang
            </button>
            <button 
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              className="w-48 bg-emas text-hitam border border-emas py-3 text-sm font-medium hover:bg-emas-terang transition-colors disabled:opacity-50"
            >
              Beli Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Store Info & Description */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Store Info Banner */}
        <div className="w-full md:w-1/3 bg-white p-4 shadow-sm flex items-center gap-4 h-max">
          <div className="w-16 h-16 bg-hitam rounded-full flex items-center justify-center text-emas shrink-0 border border-emas">
            <Store size={28} />
          </div>
          <div className="flex-1 border-r border-gray-200 pr-4">
            <h3 className="font-bold text-hitam mb-1 text-sm">Djiharkah Store</h3>
            <p className="text-xs text-gray-500 mb-2">Aktif 5 menit lalu</p>
            <div className="flex gap-2">
              <button className="flex-1 border border-emas text-emas text-xs py-1 hover:bg-emas/10">Chat Sekarang</button>
              <button className="flex-1 border border-gray-300 text-gray-600 text-xs py-1 hover:bg-gray-50">Kunjungi Toko</button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 bg-white shadow-sm">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h2 className="text-lg font-medium text-hitam uppercase">Spesifikasi & Deskripsi Produk</h2>
          </div>
          <div className="p-6 text-sm text-hitam">
            <div className="grid grid-cols-2 max-w-sm gap-y-4 mb-8">
              <div className="text-gray-500">Kategori</div>
              <div><Link to={`/products?category=${product.categories?.slug}`} className="text-emas">{product.categories?.name}</Link></div>
              <div className="text-gray-500">Stok</div>
              <div>{product.stock}</div>
              <div className="text-gray-500">Dikirim Dari</div>
              <div>Kota Jakarta Selatan</div>
            </div>
            
            <div className="whitespace-pre-line leading-relaxed text-gray-700">
              {product.description || "Tidak ada deskripsi rinci untuk produk ini."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
