import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { ROLES } from '../constants/roles.js';

// Component bảo vệ route yêu cầu authentication
export const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, hasRole, user } = useAuth();
  const location = useLocation();

  // Debug: log authentication state
  console.log('ProtectedRoute Debug:', {
    path: location.pathname,
    isAuthenticated,
    isLoading,
    user,
    requiredRole,
    hasRequiredRole: requiredRole ? hasRole(requiredRole) : true
  });

  // Hiển thị loading khi đang kiểm tra authentication
  if (isLoading) {
    console.log('Loading authentication...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Nếu chưa authenticated, redirect về login với state để quay lại sau
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Nếu có yêu cầu role và user không có role đó, hiển thị trang không có quyền
  if (requiredRole && !hasRole(requiredRole)) {
    console.log('User does not have required role:', requiredRole);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
          <p className="text-xl text-gray-600 mb-8">Bạn không có quyền truy cập trang này</p>
          <p className="text-sm text-gray-500 mb-4">Required role: {requiredRole}</p>
          <p className="text-sm text-gray-500 mb-8">Your role: {user?.role}</p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  console.log('Access granted, rendering children');
  return children;
};

// Component cho route chỉ Admin được truy cập
export const AdminRoute = ({ children }) => {
  return <ProtectedRoute requiredRole={ROLES.ADMIN}>{children}</ProtectedRoute>;
};

// Component cho route Public (không cần authentication)
export const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Nếu đã login và cố gắng truy cập login page, redirect về dashboard
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
