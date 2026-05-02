import React, { useEffect, useState } from 'react';
import { ShieldOff, Ban, AlertTriangle, KeyRound, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';

const MAX_ATTEMPTS = 5;

const STATUS_CONFIG = {
  pending: {
    icon: KeyRound,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
    title: 'Kích hoạt phần mềm',
    description: 'Phần mềm chưa được cấp license. Vui lòng liên hệ nhà cung cấp để nhận license key và nhập vào bên dưới.',
    showActivate: true,
    showInfo: false,
  },
  suspended: {
    icon: ShieldOff,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    title: 'License đang bị tạm khóa',
    description: 'Gói dịch vụ của bạn đang bị tạm dừng. Vui lòng liên hệ nhà cung cấp để được hỗ trợ.',
    showActivate: false,
    showInfo: true,
  },
  revoked: {
    icon: Ban,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-800',
    title: 'License đã bị thu hồi',
    description: 'License của bạn đã bị thu hồi vĩnh viễn. Vui lòng liên hệ nhà cung cấp để được hỗ trợ.',
    showActivate: false,
    showInfo: true,
  },
  unknown: {
    icon: AlertTriangle,
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badgeClass: 'bg-gray-100 text-gray-700',
    title: 'Không thể xác minh license',
    description: 'Hệ thống không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng và khởi động lại server.',
    showActivate: false,
    showInfo: false,
  },
};

export const LicenseBlockedPage = () => {
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [status, setStatus] = useState('unknown');
  const [keyInput, setKeyInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState('');
  const [activateSuccess, setActivateSuccess] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/license/status`)
      .then(res => {
        const data = res.data?.content;
        if (data) {
          setLicenseInfo(data);
          setStatus(data.status || 'unknown');
        }
      })
      .catch(() => {});
  }, []);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const Icon = config.icon;
  const isLocked = attempts >= MAX_ATTEMPTS;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const handleActivate = async () => {
    if (!keyInput.trim() || isLocked || activating) return;
    setActivating(true);
    setActivateError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/license/activate`, {
        licenseKey: keyInput.trim(),
      });
      const data = res.data?.content;
      if (data?.isActive) {
        setActivateSuccess(true);
        setTimeout(() => window.location.href = '/', 1500);
      } else {
        const next = attempts + 1;
        setAttempts(next);
        const msg = data?.status === 'suspended' ? 'Key này đang bị tạm khóa'
          : data?.status === 'revoked' ? 'Key này đã bị thu hồi'
          : data?.message || 'Key không hợp lệ';
        setActivateError(next >= MAX_ATTEMPTS
          ? 'Đã vượt quá số lần thử. Vui lòng liên hệ nhà cung cấp.'
          : `${msg}. Còn ${MAX_ATTEMPTS - next} lần thử.`);
      }
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      setActivateError(next >= MAX_ATTEMPTS
        ? 'Đã vượt quá số lần thử. Vui lòng liên hệ nhà cung cấp.'
        : `Không thể kết nối. Còn ${MAX_ATTEMPTS - next} lần thử.`);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className={`bg-white rounded-2xl border-2 ${config.borderColor} shadow-xl overflow-hidden`}>

          {/* Header */}
          <div className={`${config.bgColor} px-8 py-8 text-center`}>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center">
                <Icon className={`h-10 w-10 ${config.iconColor}`} />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
          </div>

          <div className="px-8 py-6 space-y-4">
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              {config.description}
            </p>

            {/* Thông tin license — chỉ hiện khi suspended/revoked */}
            {config.showInfo && licenseInfo && (licenseInfo.customerName || licenseInfo.planCode) && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
                {licenseInfo.customerName && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Khách hàng</span>
                    <span className="font-medium text-gray-800">{licenseInfo.customerName}</span>
                  </div>
                )}
                {licenseInfo.planCode && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Gói dịch vụ</span>
                    <span className="font-medium text-gray-800">{licenseInfo.planCode}</span>
                  </div>
                )}
                {licenseInfo.expiresAt && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Hạn sử dụng</span>
                    <span className="font-medium text-gray-800">{formatDate(licenseInfo.expiresAt)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Form nhập key — chỉ pending */}
            {config.showActivate && (
              <div className="space-y-3">
                {activateSuccess ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Kích hoạt thành công! Đang chuyển hướng...</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Nhập license key</label>
                      <input
                        type="text"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value.replace(/\s/g, '').toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                        placeholder="VD: VGXULHE3AH2BMJWVGH..."
                        disabled={isLocked || activating}
                        maxLength={64}
                        className="w-full px-4 py-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                      />
                      {attempts > 0 && !isLocked && (
                        <p className="mt-1.5 text-xs text-amber-600">
                          Còn {MAX_ATTEMPTS - attempts} lần thử ({attempts}/{MAX_ATTEMPTS})
                        </p>
                      )}
                    </div>

                    {activateError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {activateError}
                      </p>
                    )}

                    <button
                      onClick={handleActivate}
                      disabled={!keyInput.trim() || isLocked || activating}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {activating && <Loader2 className="h-4 w-4 animate-spin" />}
                      {activating ? 'Đang xác minh...' : 'Kích hoạt ngay'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Liên hệ — luôn hiển thị */}
            <div className="text-center pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1 pt-3">Liên hệ ArgusCam để được hỗ trợ:</p>
              <a href="mailto:support@arguscam.io.vn" className="text-sm font-medium text-blue-600 hover:underline block">
                support@arguscam.io.vn
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">ArgusCam &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};
