import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from './Skeleton';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px' }}>
        <Skeleton height={40} style={{ marginBottom: 20 }} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const AdminRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px' }}>
        <Skeleton height={40} style={{ marginBottom: 20 }} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/tickets" replace />;
  }

  return <Outlet />;
};

export const UserRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px' }}>
        <Skeleton height={40} style={{ marginBottom: 20 }} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Administrators should never be on user ticket creation / "My Tickets"
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};
