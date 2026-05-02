import axiosInstance from './axiosInstance';

export const accountApi = {
    getProfile: async () => {
        const response = await axiosInstance.get('/Account/GetProfile');
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await axiosInstance.put('/Account/UpdateProfile', data);
        return response.data;
    },

    changePassword: async (data) => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            formData.append(key, data[key]);
        });

        const response = await axiosInstance.post('/Account/ChangePassword', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    getQRV2: async () => {
        const response = await axiosInstance.post('/Account/GetQRV2');
        return response.data;
    }
};
