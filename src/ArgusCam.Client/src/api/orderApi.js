import axiosInstance from './axiosInstance';

// Order API functions
export const orderApi = {
    // Lấy danh sách đơn hàng với cursor pagination và filters
    getOrders: async (params = {}) => {
        const {
            cursor = null,
            limit = 10,
            code = '',
            userId = null,
            isPacking = null,
            startFrom = null,
            startTo = null,
        } = params;

        const queryParams = new URLSearchParams();

        if (cursor) queryParams.append('Cursor', cursor);
        if (limit) queryParams.append('Limit', limit);
        if (code) queryParams.append('Code', code);
        if (userId) queryParams.append('UserId', userId);
        if (isPacking !== null && isPacking !== undefined) queryParams.append('IsPacking', isPacking);
        if (startFrom) queryParams.append('StartFrom', startFrom);
        if (startTo) queryParams.append('StartTo', startTo);

        const url = `/orders?${queryParams.toString()}`;

        try {
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('API error:', error);
            throw error;
        }
    },

    // Lấy đơn hàng theo ID
    getOrderById: async (id) => {
        const response = await axiosInstance.get(`/orders/${id}`);
        return response.data;
    },

    // Tạo đơn hàng mới
    createOrder: async (orderData) => {
        const response = await axiosInstance.post('/orders', orderData);
        return response.data;
    },

    // Cập nhật đơn hàng
    updateOrder: async (id, orderData) => {
        const response = await axiosInstance.put(`/orders/${id}`, orderData);
        return response.data;
    },

    // Xóa đơn hàng
    deleteOrder: async (id) => {
        const response = await axiosInstance.delete(`/orders/${id}`);
        return response.data;
    },
};
