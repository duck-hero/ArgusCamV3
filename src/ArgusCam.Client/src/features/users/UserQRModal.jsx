import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Loader2, QrCode } from 'lucide-react';
import { QRCodeDisplay } from '../../components/QRCodeDisplay.jsx';
import { userApi } from '../../api/userApi.js';

export const UserQRModal = ({ isOpen, onClose, user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      const fetchQRCodes = async () => {
        try {
          setLoading(true);
          setError(null);

          const response = await userApi.getUserQRCodes(user.id);

          if (response?.content) {
            setQrData(response.content);
          } else {
            setError('Không nhận được dữ liệu QR từ server.');
          }
        } catch (err) {
          console.error('Error fetching QR codes:', err);
          setError('Lỗi khi tải mã QR. Vui lòng thử lại.');
        } finally {
          setLoading(false);
        }
      };

      fetchQRCodes();
    }

    return () => {
      if (!isOpen) {
        setQrData(null);
        setError(null);
      }
    };
  }, [isOpen, user]);

  const handleClose = () => {
    onClose();
    setQrData(null);
    setError(null);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-white sm:max-w-[92vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-base font-semibold text-slate-900">
            <QrCode className="mr-2 h-5 w-5 text-blue-600" />
            Mã QR - {user.fullName || user.userName || user.username || 'Người dùng'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm text-slate-500">Đang tải mã QR...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          ) : qrData ? (
            <QRCodeDisplay
              headerText={qrData.headerText}
              qrCodes={qrData.qrCodes}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
