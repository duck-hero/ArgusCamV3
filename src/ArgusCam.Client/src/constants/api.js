// API endpoints configuration
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const isViteDevServer = window.location.hostname === 'localhost' && window.location.port && window.location.port !== '5176';

export const API_BASE_URL = configuredBaseUrl
  || (isViteDevServer ? 'http://localhost:5176/api' : `${window.location.origin}/api`);

export const API_ENDPOINTS = {
  // Authentication endpoints
  LOGIN: '/Account/Login',
  REFRESH_TOKEN: '/Account/RefreshToken',
  LOGOUT: '/Account/Logout',
  
  // User management endpoints (Admin only)
  USERS: '/Users',
  USER_BY_ID: (id) => `/Users/${id}`,
  
  // Camera management endpoints (Admin only)
  CAMERAS: '/Cameras',
  CAMERA_BY_ID: (id) => `/Cameras/${id}`,
  
  // Order management endpoints
  ORDERS: '/Orders',
  ORDER_BY_ID: (id) => `/Orders/${id}`,
  ORDER_VIDEOS: (orderId) => `/Orders/${orderId}/videos`,
  
  // Profile endpoints
  PROFILE: '/Profile',
  CHANGE_PASSWORD: '/Profile/change-password',
  
  // Video download endpoints
  DOWNLOAD_VIDEO: (videoId) => `/Videos/${videoId}/download`,
};
