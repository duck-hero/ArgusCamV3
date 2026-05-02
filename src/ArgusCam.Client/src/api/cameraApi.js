import axiosInstance from './axiosInstance';

// Camera API functions
export const cameraApi = {
    // Get cameras với cursor pagination và filters
    getCameras: async (params = {}) => {
        const {
            cursor = null,
            limit = 20,
            searchTerm = '',
            deskId = null,
        } = params;

        const queryParams = new URLSearchParams();

        if (cursor) queryParams.append('Cursor', cursor);
        if (limit) queryParams.append('Limit', limit);
        if (searchTerm) queryParams.append('SearchTerm', searchTerm);
        if (deskId) queryParams.append('DeskId', deskId);

        const url = `/cameras?${queryParams.toString()}`;

        try {
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error('API error:', error);
            throw error;
        }
    },

    // Get camera by ID
    getCameraById: async (id) => {
        const response = await axiosInstance.get(`/cameras/${id}`);
        return response.data;
    },

    // Create camera
    createCamera: async (cameraData) => {
        const response = await axiosInstance.post('/cameras', cameraData);
        return response.data;
    },

    // Update camera
    updateCamera: async (id, cameraData) => {
        const response = await axiosInstance.put(`/cameras/${id}`, cameraData);
        return response.data;
    },

    // Delete camera
    deleteCamera: async (id) => {
        const response = await axiosInstance.delete(`/cameras/${id}`);
        return response.data;
    },

    // Scan hardware devices on LAN (timeout ~30s)
    // Optional { username, password } để SDK login vào thiết bị lấy channel info
    scanHardware: async ({ username, password } = {}) => {
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (password) params.append('password', password);
        const query = params.toString();
        const url = query ? `/hardware/scan?${query}` : '/hardware/scan';
        const response = await axiosInstance.get(url, { timeout: 60000 });
        return response.data;
    },

    // Đọc camera settings (username/password mặc định) từ appsettings.json
    getCameraSettings: async () => {
        const response = await axiosInstance.get('/admin/config/camera-settings');
        return response.data;
    },

    // Lưu camera settings vào appsettings.json
    updateCameraSettings: async (settings) => {
        const response = await axiosInstance.put('/admin/config/camera-settings', settings);
        return response.data;
    },

    // Get Live Stream URL
    // streamType: 1 = luồng chính (main), 2 = luồng phụ (sub, mặc định)
    getLiveStreamUrl: async (cameraId, streamType = 2) => {
        const response = await axiosInstance.get(`/live-stream/${cameraId}?streamType=${streamType}`);
        return response.data;
    },

    // Send Heartbeat
    // streamType: phải truyền đúng streamType đang xem để backend không tắt nhầm luồng
    sendHeartbeat: async (cameraId, streamType = 2) => {
        const response = await axiosInstance.post(`/live-stream/${cameraId}/heartbeat?streamType=${streamType}`);
        return response.data;
    },
};
