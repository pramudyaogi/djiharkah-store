import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function AppRoutes() {
  const { user, role } = useAuth();
  
  // Custom logic to redirect authenticated admins away from login
  const isAuthAdmin = user && role === 'admin';

  return (
    <Routes>
      <Route path="/login" element={isAuthAdmin ? <Navigate to="/" replace /> : <Login />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<div className="p-8 text-gray-600 bg-white rounded-lg shadow-sm border border-gray-100">Products Management Placeholder</div>} />
          <Route path="/orders" element={<div className="p-8 text-gray-600 bg-white rounded-lg shadow-sm border border-gray-100">Orders Management Placeholder</div>} />
          <Route path="/customers" element={<div className="p-8 text-gray-600 bg-white rounded-lg shadow-sm border border-gray-100">Customers Management Placeholder</div>} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
