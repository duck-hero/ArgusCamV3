import axiosInstance from './axiosInstance';

// Desk API functions
export const deskApi = {
    // Get desks với cursor pagination
    getDesks: async (params = {}) => {
        const {
            cursor = null,
            limit = 20,
            searchTerm = '',
        } = params;

        const queryParams = new URLSearchParams();

        if (cursor) queryParams.append('cursor', cursor);
        if (limit) queryParams.append('limit', limit);
        if (searchTerm) queryParams.append('searchTerm', searchTerm);

        const url = `/desks?${queryParams.toString()}`;

        try {
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('API error:', error);
            throw error;
        }
    },

    // Get desk by ID
    getDeskById: async (id) => {
        const response = await axiosInstance.get(`/desks/${id}`);
        return response.data;
    },

    // Create desk
    createDesk: async (deskData) => {
        const response = await axiosInstance.post('/desks', deskData);
        return response.data;
    },

    // Update desk
    updateDesk: async (id, deskData) => {
        const response = await axiosInstance.put(`/desks/${id}`, deskData);
        return response.data;
    },

    // Delete desk
    deleteDesk: async (id) => {
        const response = await axiosInstance.delete(`/desks/${id}`);
        return response.data;
    },
};
