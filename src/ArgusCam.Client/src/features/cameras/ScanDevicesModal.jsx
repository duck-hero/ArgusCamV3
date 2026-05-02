import React, { useState, useMemo, useEffect } from 'react';
import { X, Radar, Plus, Check, Loader2, ChevronDown, ChevronRight, Video, Server, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { cameraApi } from '../../api/cameraApi.js';
import { useToast } from '../../components/Toast.jsx';

// Nhóm đầu thu: có nhiều channel HOẶC backend đánh dấu isNvr=true (kể cả chỉ 1 channel)
const isNvrGroup = (group) => {
    if (group.devices.length > 1) return true;
    return group.devices.some(d => d.isNvr === true);
};

export const ScanDevicesModal = ({ isOpen, onClose, cameras = [], onAddDevice }) => {
    const { error: toastError } = useToast();
    const [scanning, setScanning] = useState(false);
    const [devices, setDevices] = useState([]);
    const [hasScanned, setHasScanned] = useState(false);
    const [expandedIPs, setExpandedIPs] = useState({});
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [savedSettings, setSavedSettings] = useState(null); // { username, password, defaultSdkPort, rtspPort }

    // Prefill creds từ appsettings.json khi mở modal lần đầu
    useEffect(() => {
        if (!isOpen || savedSettings) return;
        (async () => {
            try {
                const data = await cameraApi.getCameraSettings();
                if (data) {
                    setSavedSettings(data);
                    if (data.username) setUsername(data.username);
                    if (data.password) setPassword(data.password);
                }
            } catch (err) {
                console.error('Load camera settings error:', err);
            }
        })();
    }, [isOpen, savedSettings]);

    const isDeviceExisting = (device) => {
        return cameras.some(
            cam => cam.cameraIP === device.ipAddress && cam.cameraChannel === String(device.channel)
        );
    };

    // Group devices by IPAddress — same-IP entries = channels of an NVR
    const groupedDevices = useMemo(() => {
        const map = new Map();
        for (const d of devices) {
            const key = d.ipAddress;
            if (!map.has(key)) {
                map.set(key, {
                    ipAddress: key,
                    model: d.model,
                    serialNo: d.serialNo,
                    softwareVersion: d.softwareVersion,
                    sdkPort: d.sdkPort,
                    deviceType: d.deviceType,
                    devices: [],
                });
            }
            map.get(key).devices.push(d);
        }
        const groups = Array.from(map.values());
        groups.forEach(g => g.devices.sort((a, b) => a.channel - b.channel));
        return groups.sort((a, b) => a.ipAddress.localeCompare(b.ipAddress, undefined, { numeric: true }));
    }, [devices]);

    const handleScan = async () => {
        if (!username.trim() || !password.trim()) {
            toastError('Vui lòng nhập tài khoản và mật khẩu camera/đầu thu trước khi quét');
            return;
        }
        setScanning(true);
        setDevices([]);
        setExpandedIPs({});
        try {
            const trimmedUser = username.trim();
            const response = await cameraApi.scanHardware({ username: trimmedUser, password });

            // Nếu có ít nhất 1 thiết bị login OK → lưu creds vào appsettings.json
            const anyLoginOK = response?.content?.some(d => d.loginSuccess === true);
            const credsChanged = savedSettings && (savedSettings.username !== trimmedUser || savedSettings.password !== password);
            if (anyLoginOK && savedSettings && credsChanged) {
                try {
                    await cameraApi.updateCameraSettings({
                        username: trimmedUser,
                        password,
                        defaultSdkPort: savedSettings.defaultSdkPort || 8000,
                        rtspPort: savedSettings.rtspPort || 554,
                    });
                    setSavedSettings({ ...savedSettings, username: trimmedUser, password });
                } catch (err) {
                    console.error('Save camera settings error:', err);
                }
            }

            if (response && response.content) {
                setDevices(response.content);
                // Auto-expand NVR groups (multi-channel) so channels are visible
                const initExpanded = {};
                const map = new Map();
                response.content.forEach(d => {
                    map.set(d.ipAddress, (map.get(d.ipAddress) || 0) + 1);
                });
                map.forEach((count, ip) => {
                    if (count > 1) initExpanded[ip] = true;
                });
                setExpandedIPs(initExpanded);
            }
            setHasScanned(true);
        } catch (err) {
            console.error('Scan error:', err);
            toastError(err.response?.data?.err || 'Không thể quét thiết bị. Vui lòng thử lại.');
        } finally {
            setScanning(false);
        }
    };

    const toggleExpand = (ip) => {
        setExpandedIPs(prev => ({ ...prev, [ip]: !prev[ip] }));
    };

    const handleAdd = (device) => {
        onAddDevice({
            providerKey: 'hikvision',
            cameraIP: device.ipAddress,
            cameraChannel: String(device.channel),
            model: device.model,
            serialNo: device.serialNo,
            softwareVersion: device.softwareVersion,
            sdkPort: device.sdkPort,
            deviceType: device.deviceType,
        });
        onClose();
    };

    const handleClose = () => {
        setDevices([]);
        setHasScanned(false);
        setScanning(false);
        setExpandedIPs({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <Radar className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-medium text-gray-900">Quét thiết bị trên mạng</h3>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-semibold text-blue-900 mb-2">
                                Tài khoản đăng nhập camera / đầu thu
                            </p>
                            <p className="text-xs text-blue-700 mb-3">
                                SDK cần đăng nhập vào thiết bị để lấy danh sách channel (đầu thu có nhiều channel). Dùng chung 1 account cho tất cả thiết bị trong đợt quét.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                    label="Tài khoản"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin"
                                    disabled={scanning}
                                />
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Mật khẩu
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mật khẩu"
                                            disabled={scanning}
                                            className="w-full pl-3 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <Button
                                onClick={handleScan}
                                disabled={scanning}
                                className="inline-flex items-center"
                            >
                                {scanning ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Đang quét... (có thể mất đến 30 giây)
                                    </>
                                ) : (
                                    <>
                                        <Radar className="h-4 w-4 mr-2" />
                                        {hasScanned ? 'Quét lại' : 'Bắt đầu quét'}
                                    </>
                                )}
                            </Button>
                        </div>

                        {scanning && (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                <p className="mt-4 text-sm text-gray-500">Đang quét mạng LAN tìm thiết bị Hikvision...</p>
                                <p className="mt-1 text-xs text-gray-400">Quá trình này có thể mất từ 5 - 30 giây</p>
                            </div>
                        )}

                        {!scanning && hasScanned && (
                            <>
                                {groupedDevices.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Radar className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy thiết bị</h3>
                                        <p className="mt-1 text-sm text-gray-500">Kiểm tra kết nối mạng và thử quét lại</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Tìm thấy <span className="font-semibold">{groupedDevices.length}</span> thiết bị
                                            {' '}— tổng <span className="font-semibold">{devices.length}</span> kênh
                                        </p>
                                        <div className="space-y-3">
                                            {groupedDevices.map(group => {
                                                const isNvr = isNvrGroup(group);
                                                const loginFailed = group.devices.every(d => d.loginSuccess === false);
                                                const isExpanded = expandedIPs[group.ipAddress] !== false;
                                                const channelCount = group.devices.length;
                                                const addedCount = group.devices.filter(isDeviceExisting).length;

                                                return (
                                                    <div key={group.ipAddress} className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <button
                                                            onClick={() => toggleExpand(group.ipAddress)}
                                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                {isExpanded
                                                                    ? <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                                                                    : <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />}
                                                                {loginFailed
                                                                    ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                                                    : isNvr
                                                                        ? <Server className="h-5 w-5 text-purple-600 shrink-0" />
                                                                        : <Video className="h-5 w-5 text-blue-600 shrink-0" />}
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-mono text-sm font-semibold text-gray-900">{group.ipAddress}</span>
                                                                        {loginFailed ? (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                                                Sai tài khoản / mật khẩu
                                                                            </span>
                                                                        ) : (
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isNvr ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                                                {isNvr ? `Đầu thu · ${channelCount} kênh` : 'Camera IP'}
                                                                            </span>
                                                                        )}
                                                                        {group.deviceType && (
                                                                            <span className="text-xs text-gray-500">{group.deviceType}</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                                        {group.model || 'Unknown model'}
                                                                        {group.serialNo && <span className="ml-2 font-mono">· {group.serialNo}</span>}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {addedCount > 0 && (
                                                                <span className="text-xs text-green-600 font-medium shrink-0 ml-2">
                                                                    Đã thêm {addedCount}/{channelCount}
                                                                </span>
                                                            )}
                                                        </button>

                                                        {isExpanded && (
                                                            <div className="divide-y divide-gray-100">
                                                                {group.devices.map(device => {
                                                                    const existing = isDeviceExisting(device);
                                                                    return (
                                                                        <div key={`${device.ipAddress}-${device.channel}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                                                                            <div className="flex items-center gap-3 text-sm">
                                                                                <span className="w-20 text-gray-500">Kênh</span>
                                                                                <span className="font-mono font-semibold text-gray-900">{device.channel}</span>
                                                                                {device.sdkPort && (
                                                                                    <span className="text-xs text-gray-400">Port {device.sdkPort}</span>
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                {existing ? (
                                                                                    <span className="inline-flex items-center text-xs text-green-600 font-medium">
                                                                                        <Check className="h-3.5 w-3.5 mr-1" />
                                                                                        Đã thêm
                                                                                    </span>
                                                                                ) : (
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => handleAdd(device)}
                                                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                                    >
                                                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                                                        Thêm
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-end p-6 border-t border-gray-200">
                        <Button variant="outline" onClick={handleClose}>
                            Đóng
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
