import React, { useEffect, useState } from 'react';
import { MessageSquare, Star, Trash2, AlertCircle, CornerDownRight, Send } from 'lucide-react';
import { getAllReviews, deleteReview, replyToReview } from '../services/reviews';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const data = await getAllReviews();
      setReviews(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus ulasan ini secara permanen?")) {
      try {
        await deleteReview(id);
        setReviews(reviews.filter(r => r.id !== id));
      } catch (err) {
        alert("Gagal menghapus ulasan: " + err.message);
      }
    }
  };

  const handleReplySubmit = async (e, id) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await replyToReview(id, replyText);
      setReviews(reviews.map(r => r.id === id ? { ...r, admin_reply: replyText } : r));
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      alert("Gagal mengirim balasan: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Manajemen Ulasan</h1>
        <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Pantau umpan balik pelanggan dan moderasi ulasan produk Anda.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-500 mt-0.5" size={20} />
          <div>
            <h3 className="text-red-700 dark:text-red-500 font-medium">Gagal memuat ulasan</h3>
            <p className="text-red-600 dark:text-red-400/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950/50">
          <h3 className="font-medium text-gray-900 dark:text-zinc-300 flex items-center gap-2">
            <MessageSquare size={18} className="text-yellow-600 dark:text-yellow-500" />
            Daftar Ulasan Masuk
          </h3>
          <span className="text-xs bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-400 px-3 py-1 rounded-full">{reviews.length} Total</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 dark:text-zinc-500">Memuat ulasan...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <p className="text-gray-500 dark:text-zinc-400 font-medium">Belum ada ulasan</p>
            <p className="text-gray-400 dark:text-zinc-600 text-sm mt-1">Toko Anda belum menerima ulasan dari pembeli.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
            {reviews.map((review) => (
              <div key={review.id} className="p-5 flex flex-col md:flex-row gap-5 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors">
                
                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-zinc-300 flex items-center gap-2">
                        {review.user_id ? review.profiles?.full_name : review.guest_name}
                        {review.user_id ? (
                           <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">Member</span>
                        ) : (
                           <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">Guest</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-500">
                        {review.user_id ? review.profiles?.phone_number : review.guest_phone}
                        <span className="mx-2">•</span>
                        {new Date(review.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} className={i >= review.rating ? 'text-gray-300 dark:text-zinc-600' : ''} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800/50 rounded-lg p-3">
                    <p className="text-gray-700 dark:text-zinc-300 text-sm leading-relaxed">{review.comment || <span className="italic text-gray-400 dark:text-zinc-600">Tidak ada komentar, hanya rating bintang.</span>}</p>
                  </div>
                  
                  {review.admin_reply ? (
                    <div className="mt-3 ml-6 bg-yellow-50 dark:bg-yellow-500/10 border-l-2 border-yellow-500 p-3 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CornerDownRight size={14} className="text-yellow-600 dark:text-yellow-500" />
                        <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500">Balasan Djiharkah Store</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-zinc-300">{review.admin_reply}</p>
                    </div>
                  ) : replyingTo === review.id ? (
                    <form onSubmit={(e) => handleReplySubmit(e, review.id)} className="mt-3 ml-6 flex gap-2">
                      <input 
                        type="text" 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ketik balasan Anda di sini..."
                        className="flex-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                        autoFocus
                      />
                      <button type="submit" className="bg-yellow-500 text-black px-4 rounded-lg flex items-center justify-center hover:bg-yellow-400 transition-colors">
                        <Send size={16} />
                      </button>
                      <button type="button" onClick={() => {setReplyingTo(null); setReplyText('');}} className="bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-400 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors text-sm">
                        Batal
                      </button>
                    </form>
                  ) : (
                    <button onClick={() => setReplyingTo(review.id)} className="mt-3 ml-6 text-xs text-yellow-600 dark:text-yellow-500 hover:text-yellow-500 dark:hover:text-yellow-400 font-medium flex items-center gap-1 transition-colors">
                      <CornerDownRight size={14} /> Balas ulasan ini
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-start md:items-center justify-end md:justify-center md:pl-5 md:border-l border-gray-200 dark:border-zinc-800/50">
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="p-2 text-gray-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Hapus Ulasan"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
