import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { cameraApi } from '../../api/cameraApi.js';
import { deskApi } from '../../api/deskApi.js';
import { useToast } from '../../components/Toast.jsx';

const providerOptions = [
    {
        value: 'hikvision',
        label: 'Hikvision',
        support: 'Hỗ trợ đầy đủ live stream, scan LAN và download playback.',
    },
    {
        value: 'imou',
        label: 'Imou',
        support: 'Kiến trúc đã sẵn sàng, cần bổ sung adapter riêng để vận hành.',
    },
    {
        value: 'ezviz',
        label: 'Ezviz',
        support: 'Kiến trúc đã sẵn sàng, cần bổ sung adapter riêng để vận hành.',
    },
];

export const CameraModal = ({ isOpen, onClose, camera = null, prefillData = null, onSuccess }) => {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);
    const [desks, setDesks] = useState([]);
    const [loadingDesks, setLoadingDesks] = useState(false);
    const [showHardwareInfo, setShowHardwareInfo] = useState(false);

    const emptyForm = {
        providerKey: 'hikvision',
        code: '',
        name: '',
        note: '',
        cameraIP: '',
        cameraChannel: '',
        deskId: '',
        model: '',
        serialNo: '',
        softwareVersion: '',
        sdkPort: '',
        deviceType: '',
    };

    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchDesks = async () => {
            try {
                setLoadingDesks(true);
                const response = await deskApi.getDesks({ limit: 100 });
                if (response && response.content) {
                    setDesks(response.content.items);
                }
            } catch (error) {
                console.error('Error loading desks:', error);
            } finally {
                setLoadingDesks(false);
            }
        };

        if (isOpen) {
            fetchDesks();
        }
    }, [isOpen]);

    useEffect(() => {
        if (camera) {
            setFormData({
                providerKey: camera.providerKey || 'hikvision',
                code: camera.code || '',
                name: camera.name || '',
                note: camera.note || '',
                cameraIP: camera.cameraIP || '',
                cameraChannel: camera.cameraChannel || '',
                deskId: camera.deskId || '',
                model: camera.model || '',
                serialNo: camera.serialNo || '',
                softwareVersion: camera.softwareVersion || '',
                sdkPort: camera.sdkPort ?? '',
                deviceType: camera.deviceType || '',
            });
            setShowHardwareInfo(!!(camera.model || camera.serialNo || camera.deviceType));
        } else if (prefillData) {
            setFormData({
                ...emptyForm,
                providerKey: prefillData.providerKey || 'hikvision',
                cameraIP: prefillData.cameraIP || '',
                cameraChannel: prefillData.cameraChannel || '',
                model: prefillData.model || '',
                serialNo: prefillData.serialNo || '',
                softwareVersion: prefillData.softwareVersion || '',
                sdkPort: prefillData.sdkPort ?? '',
                deviceType: prefillData.deviceType || '',
            });
            setShowHardwareInfo(true);
        } else {
            setFormData(emptyForm);
            setShowHardwareInfo(false);
        }

        setErrors({});
    }, [camera, prefillData, isOpen]);

    const validate = () => {
        const newErrors = {};

        if (!formData.providerKey.trim()) {
            newErrors.providerKey = 'Hãng camera là bắt buộc';
        }

        if (!formData.code.trim()) {
            newErrors.code = 'Mã camera là bắt buộc';
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Tên camera là bắt buộc';
        }

        if (!formData.cameraIP.trim()) {
            newErrors.cameraIP = 'IP camera là bắt buộc';
        } else {
            const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipPattern.test(formData.cameraIP)) {
                newErrors.cameraIP = 'IP không hợp lệ (ví dụ: 192.168.1.100)';
            }
        }

        if (!formData.cameraChannel.trim()) {
            newErrors.cameraChannel = 'Kênh camera là bắt buộc';
        }

        if (!formData.deskId) {
            newErrors.deskId = 'Vui lòng chọn desk';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        const processed = field === 'code'
            ? value.replace(/\s/g, '').toUpperCase()
            : value;
        setFormData(prev => ({
            ...prev,
            [field]: processed,
        }));

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: '',
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                sdkPort: formData.sdkPort ? Number(formData.sdkPort) : null,
            };

            if (camera) {
                await cameraApi.updateCamera(camera.id, payload);
                success('Cập nhật camera thành công!');
            } else {
                await cameraApi.createCamera(payload);
                success('Tạo camera mới thành công!');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving camera:', error);
            toastError(error.response?.data?.err || 'Có lỗi xảy ra khi lưu camera');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedProvider = providerOptions.find(option => option.value === formData.providerKey) || providerOptions[0];
    const isHikvisionProvider = formData.providerKey === 'hikvision';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            {camera ? 'Chỉnh sửa Camera' : 'Thêm Camera Mới'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hang Camera <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.providerKey}
                                    onChange={(e) => handleInputChange('providerKey', e.target.value)}
                                    className={`block w-full px-3 py-2 border ${errors.providerKey ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                >
                                    {providerOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.providerKey && (
                                    <p className="mt-1 text-sm text-red-500">{errors.providerKey}</p>
                                )}
                                <p className="mt-2 text-xs text-slate-600">{selectedProvider.support}</p>
                            </div>

                            <Input
                                label="Mã Camera"
                                value={formData.code}
                                onChange={(e) => handleInputChange('code', e.target.value)}
                                placeholder="Ví dụ: CAM01"
                                required
                                error={errors.code}
                            />

                            <Input
                                label="Tên Camera"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Ví dụ: Camera Bàn 1"
                                required
                                error={errors.name}
                            />

                            <Input
                                label="IP Camera"
                                value={formData.cameraIP}
                                onChange={(e) => handleInputChange('cameraIP', e.target.value)}
                                placeholder="192.168.1.100"
                                required
                                error={errors.cameraIP}
                            />

                            <Input
                                label="Kênh Camera"
                                value={formData.cameraChannel}
                                onChange={(e) => handleInputChange('cameraChannel', e.target.value)}
                                placeholder="1"
                                required
                                error={errors.cameraChannel}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Chọn Desk <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.deskId}
                                    onChange={(e) => handleInputChange('deskId', e.target.value)}
                                    className={`block w-full px-3 py-2 border ${errors.deskId ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    disabled={loadingDesks}
                                >
                                    <option value="">-- Chọn desk --</option>
                                    {desks.map((desk) => (
                                        <option key={desk.id} value={desk.id}>
                                            {desk.code} - {desk.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.deskId && (
                                    <p className="mt-1 text-sm text-red-500">{errors.deskId}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ghi chú
                                </label>
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => handleInputChange('note', e.target.value)}
                                    placeholder="Mô tả camera, stream path, device id hoặc ghi chú triển khai"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {!isHikvisionProvider && (
                                    <p className="mt-2 text-xs text-amber-700">
                                        Hiện tại camera {selectedProvider.label} mới được chuẩn hóa trên data model và UI. Khi adapter riêng được bổ sung, thông tin này sẽ được dùng để map vào RTSP path, cloud id hoặc thông số kết nối tương ứng.
                                    </p>
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setShowHardwareInfo(!showHardwareInfo)}
                                    className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                                >
                                    <span>Thông tin phần cứng và kết nối</span>
                                    {showHardwareInfo ? (
                                        <ChevronUp className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>

                                {showHardwareInfo && (
                                    <div className="px-3 pb-3 space-y-3 border-t border-gray-200 pt-3">
                                        <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                            {isHikvisionProvider
                                                ? 'Thông số này đang được hệ thống sử dụng trực tiếp cho adapter Hikvision.'
                                                : `Thông số này được lưu sẵn cho adapter ${selectedProvider.label} trong giai đoạn tiếp theo.`}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label="Model"
                                                value={formData.model}
                                                onChange={(e) => handleInputChange('model', e.target.value)}
                                                placeholder="DS-7608NI-K2"
                                            />
                                            <Input
                                                label="Loại thiết bị"
                                                value={formData.deviceType}
                                                onChange={(e) => handleInputChange('deviceType', e.target.value)}
                                                placeholder="NVR, IPC, DVR"
                                            />
                                        </div>
                                        <Input
                                            label="Serial No"
                                            value={formData.serialNo}
                                            onChange={(e) => handleInputChange('serialNo', e.target.value)}
                                            placeholder="Số serial thiết bị"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label="Phiên bản firmware"
                                                value={formData.softwareVersion}
                                                onChange={(e) => handleInputChange('softwareVersion', e.target.value)}
                                                placeholder="V4.30.085"
                                            />
                                            <Input
                                                label="SDK Port"
                                                value={formData.sdkPort}
                                                onChange={(e) => handleInputChange('sdkPort', e.target.value)}
                                                placeholder={isHikvisionProvider ? '8000' : 'Tuỳ theo hãng'}
                                                type="number"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Huỷ
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || loadingDesks}
                            >
                                {loading ? 'Đang lưu...' : camera ? 'Cập nhật' : 'Tạo mới'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
