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
    <div className="min-h-[80vh] flex items-center justify-center bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements (optional, very subtle) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-playfair font-bold text-zinc-900 mb-3 tracking-tight">Selamat Datang</h2>
          <p className="text-gray-500 text-sm">Masuk ke akun Djiharkah Store Anda</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-sm border border-red-100 flex items-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 ml-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/10 transition-all text-sm text-zinc-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email Anda"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 ml-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/10 transition-all text-sm text-zinc-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-4 rounded-full font-bold text-sm tracking-wide hover:bg-yellow-500 hover:text-black hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 mt-8"
          >
            {loading ? 'MEMPROSES...' : 'MASUK'}
          </button>
        </form>

        <div className="mt-10 text-center text-sm text-gray-500">
          Belum punya akun?{' '}
          <Link to="/register" className="font-bold text-zinc-900 hover:text-yellow-600 transition-colors">
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
