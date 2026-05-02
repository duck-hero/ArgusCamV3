import axiosInstance from './axiosInstance';

export const googleDriveApi = {
    // Lấy tài khoản Drive đang liên kết (null nếu chưa liên kết)
    getStatus: async () => {
        const response = await axiosInstance.get('/google-drive/status');
        return response.data;
    },

    // Sinh URL authorize để mở popup OAuth
    authorize: async () => {
        const response = await axiosInstance.post('/google-drive/authorize');
        return response.data;
    },

    // Hủy liên kết tài khoản hiện tại
    disconnect: async () => {
        const response = await axiosInstance.post('/google-drive/disconnect');
        return response.data;
    },

    // Upload video lên Drive, trả về { fileId, webViewLink }
    syncVideo: async (videoId) => {
        const response = await axiosInstance.post(`/google-drive/sync-video/${videoId}`);
        return response.data;
    },
};
