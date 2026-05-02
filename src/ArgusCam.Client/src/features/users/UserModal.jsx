import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { roleApi } from '../../api/roleApi.js';
import { deskApi } from '../../api/deskApi.js'; // Import API để lấy danh sách bàn làm việc

export const UserModal = ({ isOpen, onClose, onSubmit, user = null, isLoading = false }) => {
    const isEdit = !!user;
    const [availableRoles, setAvailableRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    // State cho danh sách bàn làm việc
    const [availableDesks, setAvailableDesks] = useState([]);
    const [loadingDesks, setLoadingDesks] = useState(false);

    // Initial form state - thêm deskId
    const [formData, setFormData] = useState({
        userName: '',
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        status: true,
        roleIds: [],
        deskId: '' // Thêm trường bàn làm việc
    });

    // Load roles on mount
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                setLoadingRoles(true);
                const response = await roleApi.getRoles();
                if (response && response.content) {
                    setAvailableRoles(response.content);
                }
            } catch (error) {
                console.error("Failed to load roles", error);
            } finally {
                setLoadingRoles(false);
            }
        };
        if (isOpen) {
            fetchRoles();
        }
    }, [isOpen]);

    // Load danh sách bàn làm việc khi modal mở
    useEffect(() => {
        const fetchDesks = async () => {
            try {
                setLoadingDesks(true);
                const response = await deskApi.getDesks({ limit: 100 }); // Lấy tối đa 100 bàn làm việc
                if (response && response.content && response.content.items) {
                    setAvailableDesks(response.content.items);
                } else if (response && response.items) {
                    setAvailableDesks(response.items);
                }
            } catch (error) {
                console.error("Failed to load desks", error);
            } finally {
                setLoadingDesks(false);
            }
        };
        if (isOpen) {
            fetchDesks();
        }
    }, [isOpen]);

    // Load user data when editing
    useEffect(() => {
        if (user) {
            let initialRoleIds = user.roleIds || [];

            // If API returns roles as names (strings) instead of IDs
            // and we have available roles loaded, map names to IDs
            if ((!initialRoleIds || initialRoleIds.length === 0) && user.roles && availableRoles.length > 0) {
                initialRoleIds = user.roles
                    .map(roleName => {
                        const foundRole = availableRoles.find(r => r.name === roleName);
                        return foundRole ? foundRole.id : null;
                    })
                    .filter(id => id !== null);
            }

            setFormData({
                id: user.id || '',
                userName: user.userName || '',
                email: user.email || '',
                password: '', // Initialize password to empty string for controlled input
                fullName: user.fullName || '',
                phoneNumber: user.phoneNumber || '',
                status: user.status !== undefined ? user.status : true,
                roleIds: initialRoleIds,
                deskId: user.desk?.id || '' // Lấy deskId từ user.desk object khi edit
            });
        } else {
            // Reset for create mode
            setFormData({
                userName: '',
                email: '',
                password: '',
                fullName: '',
                phoneNumber: '',
                status: true,
                roleIds: [],
                deskId: '' // Reset deskId khi tạo mới
            });
        }
    }, [user, isOpen, availableRoles]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRoleChange = (roleId) => {
        setFormData(prev => {
            const currentRoles = prev.roleIds || [];
            if (currentRoles.includes(roleId)) {
                return { ...prev, roleIds: currentRoles.filter(id => id !== roleId) };
            } else {
                return { ...prev, roleIds: [...currentRoles, roleId] };
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.fullName) {
            alert("Vui lòng nhập họ tên đầy đủ");
            return;
        }
        // Prepare payload
        const payload = { ...formData };

        // If editing and password is empty, remove it so it doesn't overwrite
        if (isEdit && !payload.password) {
            delete payload.password;
        }

        if (!payload.roleIds || payload.roleIds.length === 0) {
            alert("Vui lòng chọn ít nhất một vai trò");
            return;
        }

        onSubmit(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                {isEdit ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
                            </h3>
                            <button
                                onClick={onClose}
                                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            {/* Username & Email (Read-only in Edit) */}
                            {!isEdit && (
                                <>
                                    <Input
                                        label="Tên đăng nhập"
                                        name="userName"
                                        value={formData.userName}
                                        onChange={handleChange}
                                        placeholder="Nhập username"
                                        required
                                    />
                                    <Input
                                        label="Email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="example@email.com"
                                        required
                                    />
                                </>
                            )}

                            {/* Password (Required for Create, Optional for Edit) */}
                            <Input
                                label={isEdit ? "Mật khẩu (Để trống nếu không đổi)" : "Mật khẩu"}
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="******"
                                required={!isEdit}
                            />

                            <Input
                                label="Họ và tên"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Nguyễn Văn A"
                                required
                            />

                            <Input
                                label="Số điện thoại"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                placeholder="0912..."
                            />

                            {/* Dropdown chọn bàn làm việc */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Bàn làm việc</label>
                                {loadingDesks ? (
                                    <p className="text-sm text-gray-500">Đang tải danh sách bàn làm việc...</p>
                                ) : (
                                    <select
                                        name="deskId"
                                        value={formData.deskId}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">-- Chọn bàn làm việc --</option>
                                        {availableDesks.map(desk => (
                                            <option key={desk.id} value={desk.id}>
                                                {desk.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>



                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                                {loadingRoles ? (
                                    <p className="text-sm text-gray-500">Đang tải danh sách vai trò...</p>
                                ) : (
                                    <div className="flex flex-wrap gap-4 border border-gray-200 rounded p-2">
                                        {availableRoles.length === 0 ? (
                                            <p className="text-sm text-gray-500 w-full">Không có vai trò nào</p>
                                        ) : (
                                            availableRoles.map(role => (
                                                <div key={role.id} className="flex items-center mr-4">
                                                    <input
                                                        type="checkbox"
                                                        id={`role-${role.id}`}
                                                        checked={formData.roleIds.includes(role.id)}
                                                        onChange={() => handleRoleChange(role.id)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor={`role-${role.id}`} className="ml-2 text-sm text-gray-900 cursor-pointer select-none">
                                                        {role.name}
                                                    </label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {isEdit && (
                                <div className="flex items-center">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="status"
                                            checked={formData.status}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-900">Hoạt động</span>
                                    </label>
                                </div>
                            )}

                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full sm:col-start-2"
                                >
                                    {isLoading ? 'Đang xử lý...' : (isEdit ? 'Cập nhật' : 'Tạo mới')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-3 w-full sm:mt-0 sm:col-start-1"
                                    onClick={onClose}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
