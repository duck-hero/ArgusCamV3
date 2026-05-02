import axiosInstance from './axiosInstance';

// User API functions
export const userApi = {
  // Get users với cursor pagination
  getUsers: async (params = {}) => {
    const {
      cursor = null,
      limit = 10,
      searchTerm = '',
      status = null,
      userType = null
    } = params;

    const queryParams = new URLSearchParams();

    if (cursor) queryParams.append('cursor', cursor);
    if (limit) queryParams.append('limit', limit);
    if (searchTerm) queryParams.append('searchTerm', searchTerm);
    if (status !== null) queryParams.append('status', status);
    if (userType) queryParams.append('userType', userType);

    // baseURL đã bao gồm /api, nên chỉ cần /users
    const url = `/users?${queryParams.toString()}`;

    try {
      // API_ENDPOINTS.USERS là '/Users', có thể dùng trực tiếp nếu muốn đồng bộ
      // const url = `${API_ENDPOINTS.USERS}?${queryParams.toString()}`;
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    const response = await axiosInstance.get(`/users/${id}`);
    return response.data;
  },

  // Create user
  createUser: async (userData) => {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (id, userData) => {
    const response = await axiosInstance.put(`/users/${id}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await axiosInstance.delete(`/users/${id}`);
    return response.data;
  },

  // Toggle user status
  toggleUserStatus: async (id) => {
    const response = await axiosInstance.patch(`/users/${id}/toggle-status`);
    return response.data;
  },

  // Bulk operations
  bulkDeleteUsers: async (ids) => {
    const response = await axiosInstance.delete('/users/bulk', { data: { ids } });
    return response.data;
  },

  bulkToggleStatus: async (ids, status) => {
    const response = await axiosInstance.patch('/users/bulk/toggle-status', { ids, status });
    return response.data;
  },

  // Get user QR codes
  getUserQRCodes: async (userId) => {
    const response = await axiosInstance.get(`/users/${userId}/qr`);
    return response.data;
  },
};
