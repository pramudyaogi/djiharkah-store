import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Calendar, ShieldCheck } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Fetching from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold leading-6 text-white tracking-tight">Daftar Pelanggan</h3>
        <p className="mt-3 text-sm text-zinc-400">
          Kelola data pelanggan dan hak akses pengguna terdaftar di toko Anda.
        </p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm overflow-hidden rounded-2xl border border-zinc-800/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-950/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Pelanggan
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Kontak
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Terdaftar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-transparent">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse"></div>
                      <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                      <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse delay-150"></div>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                    Belum ada data pelanggan.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold shadow-md">
                          {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : <User size={18} />}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-zinc-200">
                            {customer.full_name || 'Tanpa Nama'}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center mt-1">
                            ID: {customer.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-zinc-400">
                        {/* Assuming we join with auth users or store email in profiles later. For now placeholder or username */}
                        <Mail size={14} className="mr-2 text-zinc-500" />
                        {customer.username || 'Email disembunyikan'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        customer.role === 'admin' 
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' 
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {customer.role === 'admin' && <ShieldCheck size={12} className="mr-1" />}
                        {customer.role ? customer.role.toUpperCase() : 'CUSTOMER'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-2 text-zinc-500" />
                        {new Date(customer.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
