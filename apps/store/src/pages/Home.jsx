import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShieldCheck, Truck, Clock, Store, Star, MessageSquare, CornerDownRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', guest_name: '', guest_phone: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // Query ordered by sort_order
        const [catRes, prodRes, revRes] = await Promise.all([
          supabase.from('categories').select('*').order('display_order', { ascending: true }).order('name'),
          supabase.from('products').select('*, categories(name)').eq('is_active', true).limit(18),
          supabase.from('store_reviews').select('*, profiles(full_name)').order('created_at', { ascending: false })
        ]);
        
        if (catRes.error) throw catRes.error;
        if (prodRes.error) throw prodRes.error;
        if (revRes.error) throw revRes.error;

        setCategories(catRes.data || []);
        setFeaturedProducts(prodRes.data || []);
        setReviews(revRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.guest_name.trim() || !reviewForm.guest_phone.trim()) {
      setReviewMessage('Nama dan Nomor Telepon wajib diisi.');
      return;
    }
    if (!reviewForm.comment.trim()) {
      setReviewMessage('Komentar tidak boleh kosong.');
      return;
    }

    try {
      setIsSubmittingReview(true);
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
      setReviewMessage('Terima kasih atas ulasan Anda!');
    } catch (err) {
      setReviewMessage(err.message || 'Gagal mengirim ulasan.');
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
    <div className="w-full flex flex-col items-center">
      
      {/* Hero Banner Section (Two-Column Layout) */}
      <div className="w-full max-w-[1400px] px-4 md:px-6 mb-12 mt-6">
        <div className="w-full relative rounded-3xl overflow-hidden shadow-xl border border-gray-100 bg-zinc-950 flex flex-col md:flex-row">
          
          {/* Left Column: Text */}
          <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center relative z-10">
            {/* Subtle glow effect behind text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emas/10 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-bold text-white mb-6 leading-tight drop-shadow-md">
                Kemewahan <br/><span className="text-emas">dalam Ibadah</span>
              </h1>
              <p className="text-gray-300 text-sm md:text-base lg:text-lg mb-10 leading-relaxed font-light drop-shadow-md">
                Temukan koleksi sarung eksklusif dari merek-merek ternama. Kualitas premium untuk kenyamanan maksimal Anda dalam beribadah.
              </p>
              <Link to="/products" className="inline-flex items-center gap-2 bg-emas text-black px-8 py-3.5 rounded-full text-sm font-bold hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:-translate-y-1 transition-all duration-300 w-fit">
                Mulai Belanja 
                <span className="text-lg">→</span>
              </Link>
            </div>
          </div>
          
          {/* Right Column: Image */}
          <div className="w-full md:w-1/2 h-[300px] md:h-auto relative overflow-hidden hidden md:block">
            {/* Transition gradient to blend image with the left dark panel */}
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10"></div>
            <div 
              className="absolute inset-0 z-0 bg-cover bg-no-repeat opacity-80 transition-transform duration-700 hover:scale-105"
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
          <h2 className="text-lg font-bold text-hitam-gelap tracking-wide">Jelajahi Kategori</h2>
        </div>
        <div className="p-6 md:p-8 bg-gray-50/30 flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
          {categories.slice(0, categories.length > 5 ? 4 : 5).map(category => (
            <Link 
              key={category.id} 
              to={`/products?category=${category.slug}`}
              className="bg-white p-6 rounded-2xl w-[140px] md:w-[160px] flex flex-col items-center justify-center gap-4 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emas/50 transition-all duration-300 cursor-pointer group relative z-10 hover:z-20 hover:-translate-y-1"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-emas transition-colors duration-300 text-zinc-400 group-hover:text-black group-hover:shadow-glow">
                <Package size={28} />
              </div>
              <span className="text-sm font-medium text-zinc-600 text-center line-clamp-2 group-hover:text-hitam-gelap transition-colors">{category.name}</span>
            </Link>
          ))}
          
          {categories.length > 5 && (
            <Link 
              to="/products"
              className="p-6 rounded-2xl w-[140px] md:w-[160px] flex flex-col items-center justify-center gap-4 shadow-sm border border-emas/30 bg-gradient-to-br from-white to-orange-50 hover:shadow-lg hover:shadow-emas/20 hover:border-emas transition-all duration-300 cursor-pointer group relative z-10 hover:z-20 hover:-translate-y-1"
            >
              <div className="w-16 h-16 rounded-2xl bg-white shadow-soft flex items-center justify-center group-hover:bg-emas transition-colors duration-300 text-emas group-hover:text-black">
                <span className="text-2xl font-bold font-playfair">&rarr;</span>
              </div>
              <span className="text-sm font-bold text-emas group-hover:text-hitam-gelap transition-colors">Lainnya</span>
            </Link>
          )}

          {categories.length === 0 && (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center text-zinc-400">
              <Package size={48} className="mb-4 text-zinc-200" />
              <p className="text-lg font-medium text-zinc-500">Belum ada kategori</p>
              <p className="text-sm">Silakan hubungi Admin untuk menambahkan kategori.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rekomendasi / Produk Pilihan (Dense Grid 5-6 cols) */}
      <div className="mb-16">
        <div className="flex justify-between items-end mb-6 px-2">
          <div>
            <h2 className="text-2xl font-playfair font-bold text-hitam-gelap mb-1">Pilihan Eksklusif</h2>
            <p className="text-sm text-zinc-500">Koleksi terbaik untuk menyempurnakan ibadah Anda</p>
          </div>
          <Link to="/products" className="text-sm font-medium text-emas hover:text-yellow-600 transition-colors pb-1 flex items-center gap-1">
            Lihat Semua <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {featuredProducts.map(product => {
            const fakeSold = Math.floor(product.id.charCodeAt(0) * 1.5) + 12;
            const fakeRating = (Math.random() * (5 - 4.5) + 4.5).toFixed(1);

            return (
              <Link 
                key={product.id} 
                to={`/products/${product.slug}`}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-yellow-200 hover:-translate-y-1.5 shadow-sm hover:shadow-soft transition-all duration-300 flex flex-col h-full group"
              >
                {/* Image */}
                <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-100">NO IMG</div>
                  )}
                  {product.stock < 10 && product.stock > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-sm">
                      Stok Terbatas
                    </div>
                  )}
                </div>
                
                {/* Info */}
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
        </div>
        {featuredProducts.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm mt-4 flex flex-col items-center justify-center">
             <Package size={48} className="mb-4 text-zinc-200" />
             <p className="text-lg font-medium text-zinc-500">Belum ada produk aktif</p>
             <p className="text-sm text-zinc-400 mt-1">Nantikan koleksi terbaru kami segera.</p>
          </div>
        )}
      </div>

      {/* Store Reviews Section */}
      <div className="w-full max-w-[1400px] px-4 md:px-6 mb-20">
        <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            
            {/* Reviews Summary & Form */}
            <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 flex flex-col justify-center">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-playfair font-bold text-hitam-gelap mb-2">Penilaian Store Kami</h2>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-emas">{avgRating > 0 ? avgRating : '-'}</span>
                  <div className="flex flex-col items-start">
                    <div className="flex text-emas">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={20} fill={star <= Math.round(avgRating) ? "currentColor" : "none"} strokeWidth={star <= Math.round(avgRating) ? 0 : 2} className={star <= Math.round(avgRating) ? "" : "text-gray-300"} />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-500">{reviews.length} ulasan</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-hitam-gelap mb-4 flex items-center gap-2">
                  <MessageSquare size={18} className="text-emas" /> Berikan Ulasan
                </h3>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({...reviewForm, rating: star})}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          size={24} 
                          fill={star <= reviewForm.rating ? "#D4AF37" : "none"} 
                          strokeWidth={star <= reviewForm.rating ? 0 : 1.5}
                          className={star <= reviewForm.rating ? "" : "text-gray-300"}
                        />
                      </button>
                    ))}
                  </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="Nama Lengkap" 
                        value={reviewForm.guest_name}
                        onChange={(e) => setReviewForm({...reviewForm, guest_name: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emas"
                      />
                      <input 
                        type="text" 
                        placeholder="Nomor WA (Privasi Terjaga)" 
                        value={reviewForm.guest_phone}
                        onChange={(e) => setReviewForm({...reviewForm, guest_phone: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emas"
                      />
                    </div>

                  <textarea 
                    placeholder="Bagaimana pengalaman Anda berbelanja di sini?"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emas min-h-[80px]"
                  ></textarea>

                  {reviewMessage && (
                    <p className={`text-xs ${reviewMessage.includes('Terima') ? 'text-green-600' : 'text-red-500'}`}>{reviewMessage}</p>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmittingReview}
                    className="w-full bg-hitam text-white py-2.5 rounded-lg text-sm font-bold hover:bg-emas transition-colors disabled:opacity-50"
                  >
                    Kirim Ulasan
                  </button>
                </form>
              </div>
            </div>

            {/* Reviews List */}
            <div className="col-span-1 md:col-span-2 p-8 md:p-10 max-h-[600px] overflow-y-auto bg-white custom-scrollbar">
              <h3 className="text-xl font-bold text-hitam-gelap mb-6">Ulasan Terbaru</h3>
              
              <div className="space-y-6">
                {reviews.length > 0 ? reviews.map(review => (
                  <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-hitam">{review.user_id ? review.profiles?.full_name : review.guest_name}</p>
                        <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
                          <span className="text-xs font-bold text-emas">Balasan Djiharkah Store</span>
                        </div>
                        <p className="text-sm text-gray-700">{review.admin_reply}</p>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-10">Belum ada ulasan toko. Jadilah yang pertama memberikan ulasan!</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
