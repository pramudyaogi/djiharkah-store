import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';

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
          <Route path="/products" element={<div className="p-8 text-zinc-400 bg-zinc-900/50 rounded-2xl border border-zinc-800">Products Management Placeholder</div>} />
          <Route path="/orders" element={<div className="p-8 text-zinc-400 bg-zinc-900/50 rounded-2xl border border-zinc-800">Orders Management Placeholder</div>} />
          <Route path="/customers" element={<Customers />} />
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
