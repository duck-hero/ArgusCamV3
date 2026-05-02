// Application route paths
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Private routes (User & Admin)
  DASHBOARD: '/dashboard',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:id',
  SCANNER: '/scan',
  PROFILE: '/profile',

  // Admin only routes
  USERS: '/admin/users',
  USER_DETAIL: '/admin/users/:id',
  CAMERAS: '/admin/cameras',
  CAMERA_DETAIL: '/admin/cameras/:id',
  DESKS: '/admin/desks',
  DESK_DETAIL: '/admin/desks/:id',
  MAP: '/admin/map',
  SETTINGS: '/admin/settings',

  // License
  LICENSE_BLOCKED: '/license-blocked',

  // Not found
  NOT_FOUND: '/404',
};
