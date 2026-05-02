// User roles for RBAC (Role-Based Access Control)
export const ROLES = {
  ADMIN: 'Admin',
  USER: 'User',
};

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'users.read',
    'users.write',
    'users.delete',
    'cameras.read',
    'cameras.write',
    'cameras.delete',
    'orders.read',
    'orders.write',
    'profile.read',
    'profile.write',
  ],
  [ROLES.USER]: [
    'orders.read',
    'profile.read',
    'profile.write',
  ],
};
