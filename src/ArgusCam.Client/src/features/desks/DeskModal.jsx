import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { deskApi } from '../../api/deskApi.js';
import { useToast } from '../../components/Toast.jsx';

// Modal component để tạo/chỉnh sửa desk
export const DeskModal = ({ isOpen, onClose, desk = null, onSuccess }) => {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        note: '',
        isPacking: false,
    });

    const [errors, setErrors] = useState({});

    // Load desk data khi edit
    useEffect(() => {
        if (desk) {
            setFormData({
                code: desk.code || '',
                name: desk.name || '',
                note: desk.note || '',
                isPacking: desk.isPacking || false,
            });
        } else {
            // Reset form cho create mode
            setFormData({
                code: '',
                name: '',
                note: '',
                isPacking: false,
            });
        }
        setErrors({});
    }, [desk, isOpen]);

    // Validation
    const validate = () => {
        const newErrors = {};

        if (!formData.code.trim()) {
            newErrors.code = 'Mã desk là bắt buộc';
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Tên desk là bắt buộc';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle input change
    const handleInputChange = (field, value) => {
        const processed = field === 'code'
            ? value.replace(/\s/g, '').toUpperCase()
            : value;
        setFormData(prev => ({
            ...prev,
            [field]: processed
        }));
        // Clear error khi user nhập
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            if (desk) {
                // Update desk
                await deskApi.updateDesk(desk.id, formData);
                success('Cập nhật desk thành công!');
            } else {
                // Create desk
                await deskApi.createDesk(formData);
                success('Tạo desk mới thành công!');
            }

            onSuccess(); // Refresh danh sách
            onClose(); // Đóng modal
        } catch (error) {
            console.error('Error saving desk:', error);
            toastError(error.response?.data?.err || 'Có lỗi xảy ra khi lưu desk');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            {desk ? 'Chỉnh sửa Desk' : 'Thêm Desk Mới'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="p-6 space-y-4">
                            {/* Code */}
                            <div>
                                <Input
                                    label="Mã Desk"
                                    value={formData.code}
                                    onChange={(e) => handleInputChange('code', e.target.value)}
                                    placeholder="Ví dụ: DESK01"
                                    required
                                    error={errors.code}
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <Input
                                    label="Tên Desk"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="Ví dụ: Bàn đóng hàng 01"
                                    required
                                    error={errors.name}
                                />
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ghi chú
                                </label>
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => handleInputChange('note', e.target.value)}
                                    placeholder="Ví dụ: Khu vực A"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Is Packing */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isPacking"
                                    checked={formData.isPacking}
                                    onChange={(e) => handleInputChange('isPacking', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isPacking" className="ml-2 block text-sm text-gray-900">
                                    Bàn đóng gói (Packing)
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Đang lưu...' : desk ? 'Cập nhật' : 'Tạo mới'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
