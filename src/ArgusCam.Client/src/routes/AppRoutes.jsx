import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute, PublicRoute } from './ProtectedRoute.jsx';
import { ROUTES } from '../constants/routes.js';

import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { MainLayout } from '../layouts/MainLayout.jsx';

import { LoginPage } from '../features/auth/LoginPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { OrdersPage } from '../features/orders/OrdersPage.jsx';
import { OrderDetailPage } from '../features/orders/OrderDetailPage.jsx';
import { MobileScannerPage } from '../features/mobileScanner/MobileScannerPage.jsx';
import { ProfilePage } from '../features/profile/ProfilePage.jsx';
import { UsersPage } from '../features/users/UsersPage.jsx';
import { UserDetailPage } from '../features/users/UserDetailPage.jsx';
import { CamerasPage } from '../features/cameras/CamerasPage.jsx';
import { CameraDetailPage } from '../features/cameras/CameraDetailPage.jsx';
import { DesksPage } from '../features/desks/DesksPage.jsx';
import { MapPage } from '../features/map/MapPage.jsx';
import { SettingsPage } from '../features/settings/SettingsPage.jsx';
import { NotFoundPage } from '../features/NotFoundPage.jsx';
import { LicenseBlockedPage } from '../features/license/LicenseBlockedPage.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    errorElement: <NotFoundPage />,
  },
  {
    path: ROUTES.LOGIN,
    element: (
      <PublicRoute>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <MainLayout>
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.ORDERS,
    element: (
      <MainLayout>
        <ProtectedRoute>
          <OrdersPage />
        </ProtectedRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.ORDER_DETAIL,
    element: (
      <MainLayout>
        <ProtectedRoute>
          <OrderDetailPage />
        </ProtectedRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.SCANNER,
    element: (
      <MainLayout>
        <ProtectedRoute>
          <MobileScannerPage />
        </ProtectedRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.PROFILE,
    element: (
      <MainLayout>
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.USERS,
    element: (
      <MainLayout>
        <AdminRoute>
          <UsersPage />
        </AdminRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.USER_DETAIL,
    element: (
      <MainLayout>
        <AdminRoute>
          <UserDetailPage />
        </AdminRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.CAMERAS,
    element: (
      <MainLayout>
        <AdminRoute>
          <CamerasPage />
        </AdminRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.CAMERA_DETAIL,
    element: (
      <MainLayout>
        <AdminRoute>
          <CameraDetailPage />
        </AdminRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.DESKS,
    element: (
      <MainLayout>
        <AdminRoute>
          <DesksPage />
        </AdminRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.MAP,
    element: (
      <MainLayout>
        <AdminRoute>
          <MapPage />
        </AdminRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.SETTINGS,
    element: (
      <MainLayout>
        <AdminRoute>
          <SettingsPage />
        </AdminRoute>
      </MainLayout>
    ),
  },
  {
    path: ROUTES.LICENSE_BLOCKED,
    element: <LicenseBlockedPage />,
  },
  {
    path: ROUTES.NOT_FOUND,
    element: <NotFoundPage />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
