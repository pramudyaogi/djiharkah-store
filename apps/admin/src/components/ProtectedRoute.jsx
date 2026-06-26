import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, role, loading } = useAuth();

  // Tampilkan loading jika status auth masih dicek ATAU role masih di-fetch (null)
  if (loading || (user && role === null)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (role !== 'admin') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to view this page. This area is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
