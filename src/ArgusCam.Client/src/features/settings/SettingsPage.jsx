import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, HardDrive, Link2, Loader2, Unlink } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Card } from '../../components/Card.jsx';
import { Alert } from '../../components/Alert.jsx';
import { useToast } from '../../components/Toast.jsx';
import { googleDriveApi } from '../../api/googleDriveApi.js';

export const SettingsPage = () => {
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await googleDriveApi.getStatus();
      setAccount(res?.content || null);
    } catch (err) {
      console.error('Error loading Drive status:', err);
      toastError('Không thể tải trạng thái Google Drive');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const handler = (event) => {
      if (event?.data?.type === 'google-drive-auth') {
        if (event.data.status === 'success') {
          success('Đã liên kết Google Drive thành công!');
        } else {
          toastError('Liên kết Google Drive thất bại. Vui lòng thử lại.');
        }
        fetchStatus();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchStatus, success, toastError]);

  const handleAuthorize = async () => {
    try {
      setAuthorizing(true);
      const res = await googleDriveApi.authorize();
      const url = res?.content?.url;

      if (!url) {
        toastError('Không tạo được URL xác thực Google');
        return;
      }

      const w = 500;
      const h = 650;
      const y = window.top.outerHeight / 2 + window.top.screenY - h / 2;
      const x = window.top.outerWidth / 2 + window.top.screenX - w / 2;
      window.open(url, 'google-drive-auth', `width=${w},height=${h},top=${y},left=${x}`);
    } catch (err) {
      console.error(err);
      toastError(err?.response?.data?.err || 'Không thể bắt đầu liên kết Google Drive');
    } finally {
      setAuthorizing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy liên kết tài khoản Google Drive này?')) return;

    try {
      setDisconnecting(true);
      await googleDriveApi.disconnect();
      success('Đã hủy liên kết Google Drive');
      setAccount(null);
    } catch (err) {
      console.error(err);
      toastError(err?.response?.data?.err || 'Hủy liên kết thất bại');
    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('vi-VN');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Cài đặt hệ thống
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-gray-600">
          Tích hợp các dịch vụ bên ngoài như Google Drive để sao lưu video.
        </p>
      </div>

      <Card className="overflow-hidden" padding="none">
        <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <HardDrive className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                Google Drive
              </h3>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Liên kết một tài khoản Google Drive để đồng bộ video. Video sẽ được upload vào thư mục riêng do ứng dụng quản lý.
              </p>
            </div>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500 sm:justify-start sm:px-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải...
            </div>
          ) : account ? (
            <div className="space-y-4">
              <Alert variant="success" title="Đã liên kết">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate font-medium">{account.email}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  Liên kết lúc: {formatDate(account.linkedAt)}
                </p>
                {account.folderId && (
                  <p className="mt-1 break-all text-xs opacity-80">
                    Thư mục Drive ID: <span className="font-mono">{account.folderId}</span>
                  </p>
                )}
              </Alert>

              <div className="grid grid-cols-1 gap-2 sm:inline-flex sm:flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleAuthorize}
                  disabled={authorizing}
                  className="w-full justify-center sm:w-auto"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {authorizing ? 'Đang mở...' : 'Đổi tài khoản khác'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="w-full justify-center border-red-200 text-red-600 hover:text-red-700 sm:w-auto"
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  {disconnecting ? 'Đang hủy...' : 'Hủy liên kết'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert variant="info" title="Chưa liên kết">
                Bấm nút bên dưới để đăng nhập Google và cấp quyền upload video vào Drive của bạn.
              </Alert>
              <Button
                onClick={handleAuthorize}
                disabled={authorizing}
                className="w-full justify-center sm:w-auto"
              >
                <Link2 className="mr-2 h-4 w-4" />
                {authorizing ? 'Đang mở...' : 'Liên kết Google Drive'}
              </Button>
            </div>
          )}
        </div>
        </div>
      </Card>
    </div>
  );
};
