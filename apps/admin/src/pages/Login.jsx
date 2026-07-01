import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full bg-zinc-950 overflow-y-auto lg:overflow-hidden">
      {/* Banner Image Area */}
      <div className="w-full lg:w-1/2 aspect-[16/10] lg:aspect-auto lg:h-auto bg-black relative flex justify-center items-center overflow-hidden shrink-0">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-[center_15%] lg:bg-center bg-no-repeat opacity-80 lg:opacity-60"
          style={{ backgroundImage: "url('/login-bg.png')" }}
        ></div>
        {/* Efek transisi dari bawah */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10"></div>
        {/* Efek transisi halus dari kiri ke kanan (hanya untuk desktop) */}
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-zinc-950 z-10"></div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex-1 flex items-center justify-center bg-zinc-950 py-8 lg:py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Subtle glow effect behind the form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-900/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="max-w-md w-full space-y-8 bg-zinc-900/80 backdrop-blur-xl p-10 rounded-2xl shadow-2xl border border-zinc-800/80 relative z-10">
          <div>
            <h2 className="mt-2 text-center text-3xl font-bold text-white tracking-tight">
              Admin Portal
            </h2>
            <p className="mt-3 text-center text-sm text-zinc-400">
              Silakan masuk untuk mengelola toko Anda
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center backdrop-blur-sm">
                {error}
              </div>
            )}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  className="appearance-none relative block w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 placeholder-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email Anda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="appearance-none relative block w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 placeholder-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all sm:text-sm pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-black bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-yellow-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.3)]"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
