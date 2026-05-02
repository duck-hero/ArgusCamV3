import axiosInstance from './axiosInstance';

export const roleApi = {
    getRoles: async () => {
        try {
            const response = await axiosInstance.get('/roles');
            return response.data;
        } catch (error) {
            console.error('API error:', error);
            throw error;
        }
    }
};
