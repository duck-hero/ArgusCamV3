// Local storage utility functions
export const storage = {
  // Lưu token vào localStorage
  setToken: (token) => {
    localStorage.setItem('token', token);
  },

  // Lấy token từ localStorage
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Xóa token khỏi localStorage
  removeToken: () => {
    localStorage.removeItem('token');
  },

  // Lưu refresh token vào localStorage
  setRefreshToken: (refreshToken) => {
    localStorage.setItem('refreshToken', refreshToken);
  },

  // Lấy refresh token từ localStorage
  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },

  // Xóa refresh token khỏi localStorage
  removeRefreshToken: () => {
    localStorage.removeItem('refreshToken');
  },

  // Lưu thông tin user vào localStorage
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Lấy thông tin user từ localStorage
  getUser: () => {
    try {
      const user = localStorage.getItem('user');
      if (!user || user === 'undefined' || user === 'null') {
        return null;
      }
      return JSON.parse(user);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  },

  // Xóa thông tin user khỏi localStorage
  removeUser: () => {
    localStorage.removeItem('user');
  },

  // Xóa tất cả dữ liệu authentication
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};
