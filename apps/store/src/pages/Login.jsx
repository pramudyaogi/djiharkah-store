import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await login(email, password);
      if (error) throw error;
      navigate('/');
    } catch (err) {
      setError(err.message || 'Gagal login. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 border border-emas/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-playfair font-bold text-hitam mb-2">Selamat Datang</h2>
          <p className="text-abu-abu">Masuk ke akun Djiharkah Store Anda</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-hitam mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-hitam mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emas text-hitam py-3 font-bold hover:bg-hitam hover:text-emas border border-transparent hover:border-emas transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'MEMPROSES...' : 'MASUK'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-abu-abu border-t border-gray-100 pt-6">
          Belum punya akun?{' '}
          <Link to="/register" className="font-bold text-emas hover:text-emas-terang transition-colors">
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
