import axiosInstance from './axiosInstance';

export const videoApi = {
    // Lấy danh sách video theo OrderId
    getVideosByOrderId: async (orderId) => {
        const response = await axiosInstance.get(`/videos?OrderId=${orderId}`);
        return response.data;
    },

    // Kích hoạt tải video cho đơn hàng (background job via Hangfire)
    downloadByOrder: async (orderId) => {
        const response = await axiosInstance.post(`/videos/download-by-order/${orderId}`);
        return response.data;
    },

    // Tao URL stream video theo videoId
    getStreamUrl: (videoId) => {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        return `${baseUrl}/videos/${videoId}/stream`;
    },

    // Tao URL thumbnail dai dien theo videoId
    getThumbnailUrl: (videoId) => {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        return `${baseUrl}/videos/${videoId}/thumbnail`;
    },
};
