import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CheckCircle2, Keyboard, Loader2, PauseCircle, RefreshCw, ScanBarcode, Square, TimerReset } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { useToast } from '../../components/Toast.jsx';
import { mobileOrdersApi } from '../../api/mobileOrdersApi.js';

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const StatusPill = ({ active, children }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
    <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
    {children}
  </span>
);

const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  return data?.errorMessage
    || data?.ErrorMessage
    || data?.err
    || data?.Err
    || error?.message
    || fallback;
};

export const MobileScannerPage = () => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef({ value: '', at: 0 });
  const cameraWantedRef = useRef(false);
  const restartingRef = useRef(false);
  const restartTimerRef = useRef(null);

  const toast = useToast();
  const [activeOrder, setActiveOrder] = useState(null);
  const [deskName, setDeskName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanError, setScanError] = useState('');

  const loadActiveOrder = useCallback(async () => {
    try {
      setLoadingState(true);
      const response = await mobileOrdersApi.getActive();
      setActiveOrder(response?.content?.activeOrder || null);
      setDeskName(response?.content?.deskName || '');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tải trạng thái đơn hàng');
      setScanError(message);
      toast.error(message, 6000);
    } finally {
      setLoadingState(false);
    }
  }, [toast]);

  useEffect(() => {
    loadActiveOrder();
  }, []);

  useEffect(() => {
    return () => {
      cameraWantedRef.current = false;
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }
      controlsRef.current?.stop?.();
      controlsRef.current = null;
      readerRef.current = null;
    };
  }, []);

  const submitScan = useCallback(async (rawCode) => {
    const orderCode = rawCode.trim();
    if (!orderCode || processingRef.current) return;

    const now = Date.now();
    if (lastScanRef.current.value === orderCode && now - lastScanRef.current.at < 1500) {
      return;
    }

    processingRef.current = true;
    lastScanRef.current = { value: orderCode, at: now };
    setProcessing(true);
    setScanError('');

    try {
      const response = await mobileOrdersApi.scanOrder(orderCode);
      const content = response?.content;
      setActiveOrder(content?.activeOrder || null);
      setManualCode('');

      if (content?.isDuplicateScan) {
        toast.warning('Mã này đang là đơn hiện tại');
      } else if (content?.closedOrder) {
        toast.success(`Đã đóng ${content.closedOrder.code} và bắt đầu ${content.activeOrder.code}`);
      } else {
        toast.success(`Đã bắt đầu đơn ${content?.activeOrder?.code || orderCode}`);
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể ghi nhận mã đơn');
      setScanError(message);
      toast.error(message, 6000);
    } finally {
      window.setTimeout(() => {
        processingRef.current = false;
        setProcessing(false);
        verifyCameraStream();
      }, 500);
    }
  }, [toast]);

  function scheduleCameraRestart() {
    if (!cameraWantedRef.current || restartingRef.current) return;

    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
    }

    restartTimerRef.current = window.setTimeout(async () => {
      if (!cameraWantedRef.current || restartingRef.current) return;

      restartingRef.current = true;
      try {
        controlsRef.current?.stop?.();
        controlsRef.current = null;
        readerRef.current = null;
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        await startCamera({ silent: true });
      } finally {
        restartingRef.current = false;
      }
    }, 250);
  }

  function verifyCameraStream() {
    if (!cameraWantedRef.current) return;

    const video = videoRef.current;
    const stream = video?.srcObject;
    const track = stream?.getVideoTracks?.()[0];

    if (!video || !stream || !track || track.readyState !== 'live') {
      scheduleCameraRestart();
      return;
    }

    if (video.paused || video.ended || video.readyState < 2) {
      video.play()
        .then(() => setCameraActive(true))
        .catch(() => scheduleCameraRestart());
      return;
    }

    setCameraActive(true);
  }

  function watchCameraTrack() {
    const stream = videoRef.current?.srcObject;
    const tracks = stream?.getVideoTracks?.() || [];

    tracks.forEach((track) => {
      track.onended = () => {
        if (cameraWantedRef.current) {
          scheduleCameraRestart();
        }
      };
      track.onmute = () => {
        if (cameraWantedRef.current) {
          window.setTimeout(verifyCameraStream, 300);
        }
      };
    });
  }

  async function startCamera(options = {}) {
    const { silent = false } = options || {};
    if (!videoRef.current) return;

    cameraWantedRef.current = true;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    setCameraError('');
    try {
      await controlsRef.current?.stop?.();
      controlsRef.current = null;
      readerRef.current = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 100,
      });
      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, controlsFromCallback) => {
          if (controlsFromCallback && controlsRef.current !== controlsFromCallback) {
            controlsRef.current = controlsFromCallback;
          }
          if (result?.getText) {
            submitScan(result.getText());
            window.setTimeout(verifyCameraStream, 50);
          }
        }
      );
      controlsRef.current = controls;
      watchCameraTrack();
      setCameraActive(true);
      window.setTimeout(verifyCameraStream, 250);
    } catch (error) {
      console.error('Error opening scanner camera:', error);
      controlsRef.current = null;
      readerRef.current = null;
      setCameraActive(false);
      setCameraError(silent
        ? 'Camera bị dừng ngoài ý muốn. Hãy bấm Tắt camera rồi Bật camera để mở lại.'
        : 'Không mở được camera. Hãy kiểm tra HTTPS, quyền camera và trình duyệt trên điện thoại.');
    }
  }

  const stopCamera = () => {
    cameraWantedRef.current = false;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    restartingRef.current = false;
    controlsRef.current?.stop?.();
    controlsRef.current = null;
    readerRef.current = null;
    setCameraActive(false);
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();
    submitScan(manualCode);
  };

  const handleEndActive = async () => {
    if (!activeOrder || processing) return;

    setProcessing(true);
    try {
      await mobileOrdersApi.endActive();
      toast.success(`Đã kết thúc đơn ${activeOrder.code}`);
      setActiveOrder(null);
      setScanError('');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể kết thúc đơn hiện tại');
      setScanError(message);
      toast.error(message, 6000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:pb-0">
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bàn làm việc</p>
            <h2 className="mt-0.5 truncate text-xl font-bold text-gray-900 sm:text-2xl">{deskName || 'Chưa gán bàn'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill active={cameraActive}>{cameraActive ? 'Camera đang bật' : 'Camera đang tắt'}</StatusPill>
            <StatusPill active={Boolean(activeOrder)}>{activeOrder ? 'Có đơn' : 'Chưa có đơn'}</StatusPill>
          </div>
        </div>

        <div className="relative bg-slate-950">
          <div className="relative h-[min(76vh,42rem)] min-h-[28rem] sm:aspect-video sm:h-auto sm:min-h-0 lg:aspect-[16/10]">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <ScanBarcode className="h-8 w-8" />
                </div>
                <p className="text-lg font-semibold">Sẵn sàng quét mã đơn</p>
                <p className="mt-2 max-w-sm text-sm text-slate-300">Bật camera rồi đưa mã QR vào vùng quét lớn giữa màn hình.</p>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[min(56vh,30rem)] w-[min(92vw,38rem)] rounded-xl border-[3px] border-white/95 shadow-[0_0_0_999px_rgba(15,23,42,0.36)] sm:h-[min(52vh,30rem)]">
                <span className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400/90 shadow-[0_0_16px_rgba(52,211,153,0.95)]" />
                <span className="absolute left-3 top-3 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-emerald-400" />
                <span className="absolute right-3 top-3 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-emerald-400" />
                <span className="absolute bottom-3 left-3 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
                <span className="absolute bottom-3 right-3 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />
              </div>
            </div>

            {processing && (
              <div className="absolute inset-x-0 top-0 flex justify-center p-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang ghi nhận
                </span>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="border-t border-red-900/30 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cameraError}
            </div>
          )}

          {scanError && (
            <div className="border-t border-red-900/30 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {scanError}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-3 lg:sticky lg:top-20">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Đơn hiện tại</p>
              {loadingState ? (
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải
                </div>
              ) : activeOrder ? (
                <div className="mt-2">
                  <p className="break-all text-2xl font-bold text-blue-700">{activeOrder.code}</p>
                  <p className="mt-1 text-sm text-gray-500">{formatDateTime(activeOrder.start)}</p>
                </div>
              ) : (
                <p className="mt-2 text-base font-medium text-gray-700">Chưa có đơn đang chạy</p>
              )}
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              {activeOrder ? <CheckCircle2 className="h-6 w-6" /> : <TimerReset className="h-6 w-6" />}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Chế độ</p>
              <p className="mt-1 font-semibold text-gray-900">{activeOrder?.isPacking === false ? 'Bóc hoàn' : 'Đóng hàng'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Khi quét mã mới</p>
              <p className="mt-1 font-semibold text-gray-900">Tự đổi đơn</p>
            </div>
          </div>
        </section>

        <form onSubmit={handleManualSubmit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <label className="mb-2 block text-sm font-semibold text-gray-800" htmlFor="manual-order-code">
            Nhập mã thủ công
          </label>
          <div className="grid gap-3">
            <Input
              id="manual-order-code"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Nhập mã đơn nếu camera không quét được"
              inputMode="text"
              autoComplete="off"
              className="min-h-12 text-base"
            />
            <Button type="submit" icon={Keyboard} disabled={!manualCode.trim() || processing} className="w-full">
              Ghi nhận mã
            </Button>
          </div>
        </form>

        <section className="hidden rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm lg:block">
          <p className="font-semibold text-gray-900">Luồng thao tác</p>
          <p className="mt-2">Quét mã đầu tiên để bắt đầu đơn. Khi quét mã khác, hệ thống tự đóng đơn hiện tại và chuyển sang đơn mới.</p>
        </section>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2 pb-[env(safe-area-inset-bottom)]">
          <Button
            icon={cameraActive ? PauseCircle : Camera}
            variant={cameraActive ? 'outline' : 'primary'}
            onClick={cameraActive ? stopCamera : startCamera}
            className="w-full px-2 text-xs"
          >
            {cameraActive ? 'Tắt camera' : 'Bật camera'}
          </Button>
          <Button
            icon={Square}
            variant="danger"
            onClick={handleEndActive}
            disabled={!activeOrder || processing}
            className="w-full px-2 text-xs"
          >
            Kết thúc
          </Button>
          <Button
            icon={RefreshCw}
            variant="outline"
            onClick={loadActiveOrder}
            disabled={loadingState}
            className="w-full px-2 text-xs"
          >
            Làm mới
          </Button>
        </div>
      </div>

      <div className="hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2 lg:grid lg:grid-cols-3 lg:gap-3">
        <Button
          icon={cameraActive ? PauseCircle : Camera}
          variant={cameraActive ? 'outline' : 'primary'}
          onClick={cameraActive ? stopCamera : startCamera}
          className="w-full"
        >
          {cameraActive ? 'Tắt camera' : 'Bật camera'}
        </Button>
        <Button
          icon={Square}
          variant="danger"
          onClick={handleEndActive}
          disabled={!activeOrder || processing}
          className="w-full"
        >
          Kết thúc đơn
        </Button>
        <Button
          icon={RefreshCw}
          variant="outline"
          onClick={loadActiveOrder}
          disabled={loadingState}
          className="w-full"
        >
          Làm mới
        </Button>
      </div>
    </div>
  );
};

