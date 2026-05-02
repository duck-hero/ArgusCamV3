import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LogOut, Menu, QrCode, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { accountApi } from '../api/accountApi.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Button } from './Button.jsx';
import { useToast } from './Toast.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.jsx';

const colorMap = {
  Blue: { text: 'text-blue-600' },
  Green: { text: 'text-green-600' },
  Red: { text: 'text-red-600' },
};

export const Navbar = ({ onMenuClick, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const toast = useToast();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [loadingQr, setLoadingQr] = React.useState(false);
  const [qrData, setQrData] = React.useState(null);

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/dashboard')) return 'Tổng quan';
    if (pathname.startsWith('/scan')) return 'Quét đơn hàng';
    if (pathname.startsWith('/orders')) return 'Quản lý đơn hàng';
    if (pathname.startsWith('/profile')) return 'Hồ sơ cá nhân';
    if (pathname.startsWith('/admin/users')) return 'Quản lý người dùng';
    if (pathname.startsWith('/admin/cameras')) return 'Quản lý camera';
    if (pathname.startsWith('/admin/desks')) return 'Quản lý bàn làm việc';
    if (pathname.startsWith('/admin/map')) return 'Sơ đồ camera';
    if (pathname.startsWith('/admin/roles')) return 'Quản lý phân quyền';
    if (pathname.startsWith('/admin/settings')) return 'Cài đặt';
    return 'ArgusCam';
  };

  const pageTitle = getPageTitle(location.pathname);
  const displayName = user?.fullName || user?.username || 'Người dùng';
  const displayRole = user?.role || 'Admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    setShowUserMenu(false);
    navigate('/profile');
  };

  const handleFetchQR = async () => {
    setShowUserMenu(false);
    setShowQrModal(true);
    setLoadingQr(true);

    try {
      const response = await accountApi.getQRV2();
      setQrData(response?.content || null);
    } catch (error) {
      console.error('Error fetching QR data:', error);
      setQrData(null);
      toast.error('Không thể tải mã QR cá nhân');
    } finally {
      setLoadingQr(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-full px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3 sm:h-16">
            <div className="flex min-w-0 flex-1 items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMenuClick}
                aria-label="Mở menu"
                className="mr-2 inline-flex h-10 w-10 p-0 text-gray-600 hover:text-gray-900 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
                {pageTitle}
              </h1>
            </div>

            <div className="flex shrink-0 items-center">
              <div className="hidden text-right sm:block">
                <p className="max-w-36 truncate text-sm font-medium text-gray-900">
                  {displayName}
                </p>
                <p className="max-w-36 truncate text-xs text-gray-500">
                  {displayRole}
                </p>
              </div>

              <div className="relative ml-2 sm:ml-3">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Mở menu tài khoản"
                >
                  {displayName?.charAt(0)?.toUpperCase() || 'U'}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-gray-500">{displayRole}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleFetchQR}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="QR cá nhân"
                        title="QR cá nhân"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="border-t border-gray-100 py-1">
                      <button
                        type="button"
                        onClick={handleProfile}
                        className="flex min-h-11 w-full items-center px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100"
                      >
                        <User className="mr-3 h-4 w-4" />
                        Hồ sơ cá nhân
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex min-h-11 w-full items-center px-4 py-2 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-red-50"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showUserMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowUserMenu(false)}
          />
        )}
      </header>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-white sm:max-w-[92vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base font-semibold text-slate-900">
              <QrCode className="mr-2 h-5 w-5 text-blue-600" />
              Mã QR cá nhân
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {loadingQr ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm text-slate-500">Đang tải mã QR...</p>
              </div>
            ) : qrData ? (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{qrData.headerText}</p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {qrData.qrCodes.map((qr, index) => {
                    const colors = colorMap[qr.color] || colorMap.Blue;

                    return (
                      <div key={index} className="flex flex-col items-center">
                        <QRCodeSVG
                          value={qr.jsonContent}
                          size={220}
                          level="M"
                          fgColor="#000000"
                          bgColor="#ffffff"
                          includeMargin={false}
                        />
                        <span className={`mt-3 text-base font-bold ${colors.text}`}>
                          {qr.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
                <p className="text-sm text-slate-600">
                  Không thể tải mã QR. Vui lòng thử lại.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
