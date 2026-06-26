import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, Star, Share2, Heart, ShieldCheck, ShoppingCart, User, AlertCircle, ChevronLeft } from 'lucide-react';
import PopupModal from '../components/PopupModal';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

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
        setProduct(prodData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProductAndReviews();
  }, [slug]);

  const handleBuyNow = () => {
    navigate('/checkout', { state: { product, quantity } });
  };

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-12 h-12 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!product) return <div className="text-hitam font-playfair text-xl py-20 text-center">Produk tidak ditemukan.</div>;

  const fakeSold = Math.floor(product.id.charCodeAt(0) * 1.5) + 12;
  const fakeRating = (Math.random() * (5 - 4.5) + 4.5).toFixed(1);

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
        <div className="w-full md:w-[450px] shrink-0">
          <div className="w-full pt-[100%] relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-2 group">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-bold bg-gray-100">NO IMG</div>
            )}
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
            <div className="text-hitam"><span className="font-bold">{fakeSold}</span> Terjual</div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-2xl border border-gray-100 mb-8 shadow-sm">
            <div className="text-3xl font-bold text-hitam-gelap flex items-center gap-2">
              Rp {product.price.toLocaleString('id-ID')}
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
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-white shadow-sm">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-emas transition-colors"
                  >-</button>
                  <input 
                    type="text" 
                    value={quantity} 
                    readOnly
                    className="w-12 h-10 text-center font-medium text-hitam border-x border-gray-100 outline-none bg-white"
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    disabled={quantity >= product.stock}
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-emas transition-colors disabled:opacity-50"
                  >+</button>
                </div>
                <span className="text-sm text-gray-500">Tersisa {product.stock} buah</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
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
            <div>{product.stock}</div>
            <div className="text-gray-500">Dikirim Dari</div>
            <div>Kota Jakarta Selatan</div>
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
    </div>
  );
}
