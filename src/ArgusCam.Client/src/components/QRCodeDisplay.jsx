import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Loader2 } from 'lucide-react';

const labelColorMap = {
  Blue: 'text-blue-600',
  Green: 'text-green-600',
  Red: 'text-red-600',
};

export const QRCodeDisplay = ({ headerText, qrCodes = [], className = '' }) => {
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef(null);

  const handleDownload = async () => {
    if (!contentRef.current) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${headerText || 'QR-Codes'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (!qrCodes || qrCodes.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        Không có mã QR nào
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Tải ảnh
        </button>
      </div>

      <div ref={contentRef} className="bg-white px-2 py-4 sm:px-4 sm:py-6">
        {headerText && (
          <div className="mb-6 text-center">
            <h3 className="text-lg font-bold text-gray-900">{headerText}</h3>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {qrCodes.map((qr, index) => (
            <div key={index} className="flex flex-col items-center">
              <QRCodeSVG
                value={qr.jsonContent}
                size={220}
                level="M"
                includeMargin={false}
                fgColor="#000000"
                bgColor="#ffffff"
              />
              <span className={`mt-3 text-base font-bold ${labelColorMap[qr.color] || 'text-gray-900'}`}>
                {qr.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
