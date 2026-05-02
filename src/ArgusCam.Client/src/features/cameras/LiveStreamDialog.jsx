import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Loader2, AlertCircle, Monitor, MonitorPlay } from 'lucide-react';
import { cameraApi } from '../../api/cameraApi';

// Base URL của go2rtc server (có thể cấu hình trong .env)
const GO2RTC_BASE_URL = 'http://localhost:1984';

// Stream Type constants
const STREAM_TYPE = {
    MAIN: 1,    // Luồng chính (HD)
    SUB: 2,     // Luồng phụ (SD - mặc định)
};

/**
 * Component StreamPlayer - Embed go2rtc stream.html qua iframe
 * @param {string} streamSrc - GUID của camera (được extract từ WS URL)
 */
const StreamPlayer = ({ streamSrc }) => {
    const [iframeMounted, setIframeMounted] = useState(false);

    // URL của trang stream go2rtc
    const streamUrl = useMemo(() => {
        if (!streamSrc) return null;
        return `${GO2RTC_BASE_URL}/stream.html?src=${streamSrc}`;
    }, [streamSrc]);

    // Reset loading state khi streamSrc thay đổi
    useEffect(() => {
        setIframeMounted(false);
    }, [streamSrc]);

    if (!streamUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-gray-400">
                <p>Không có nguồn stream</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black">
            {/* Loading indicator khi iframe chưa load xong */}
            {!iframeMounted && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            )}

            {/* Iframe embed trang stream.html của go2rtc */}
            <iframe
                src={streamUrl}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
                onLoad={() => setIframeMounted(true)}
                title="Live Stream"
            />
        </div>
    );
};

/**
 * Hàm extract GUID từ WS URL
 * Input: "ws://localhost:1984/api/ws?src=556e7aee-182a-4578-b73d-4c20b2089d35_2"
 * Output: "556e7aee-182a-4578-b73d-4c20b2089d35_2"
 */
const extractStreamSrc = (wsUrl) => {
    if (!wsUrl) return null;
    try {
        const url = new URL(wsUrl);
        return url.searchParams.get('src');
    } catch (e) {
        // Fallback: regex extract
        const match = wsUrl.match(/src=([a-f0-9_-]+)/i);
        return match ? match[1] : null;
    }
};

export const LiveStreamDialog = ({ isOpen, onClose, camera }) => {
    const [streamSrc, setStreamSrc] = useState(null); // GUID của camera
    const [streamType, setStreamType] = useState(STREAM_TYPE.SUB); // Mặc định là luồng phụ
    const [loading, setLoading] = useState(false);
    const [switching, setSwitching] = useState(false); // Loading khi chuyển luồng
    const [error, setError] = useState(null);

    // Hàm fetch stream URL
    const fetchStream = useCallback(async (type) => {
        if (!camera?.id) return;

        try {
            setLoading(true);
            setError(null);

            console.log(`Fetching stream for camera: ${camera.name}, type: ${type === STREAM_TYPE.MAIN ? 'Main' : 'Sub'}`);
            const response = await cameraApi.getLiveStreamUrl(camera.id, type);

            if (response && response.content) {
                const src = extractStreamSrc(response.content);
                if (src) {
                    setStreamSrc(src);
                    console.log('Stream source extracted:', src);
                } else {
                    setError('Không thể parse đường dẫn stream.');
                }
            } else {
                setError('Không nhận được đường dẫn stream từ server.');
            }
        } catch (err) {
            console.error('Error starting stream:', err);
            setError('Lỗi khi lấy link stream. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setSwitching(false);
        }
    }, [camera]);

    // Heartbeat logic
    useEffect(() => {
        let heartbeatInterval = null;

        if (isOpen && camera?.id && streamSrc) {
            // Setup Heartbeat (gọi mỗi 10 giây)
            console.log('Starting heartbeat loop...');
            heartbeatInterval = setInterval(async () => {
                try {
                    console.log(`Sending heartbeat for: ${camera.id}, streamType: ${streamType}`);
                    await cameraApi.sendHeartbeat(camera.id, streamType);
                } catch (err) {
                    console.error('Heartbeat failed:', err);
                }
            }, 10000); // 10 giây
        }

        return () => {
            if (heartbeatInterval) {
                console.log('Stopping heartbeat loop...');
                clearInterval(heartbeatInterval);
            }
        };
    }, [isOpen, camera, streamSrc, streamType]);

    // Fetch stream khi dialog mở hoặc streamType thay đổi
    useEffect(() => {
        if (isOpen && camera?.id) {
            fetchStream(streamType);
        }

        return () => {
            setStreamSrc(null);
        };
    }, [isOpen, camera, streamType, fetchStream]);

    // Handler chuyển đổi luồng
    const handleSwitchStream = () => {
        const newType = streamType === STREAM_TYPE.MAIN ? STREAM_TYPE.SUB : STREAM_TYPE.MAIN;
        setSwitching(true);
        setStreamType(newType);
    };

    const handleClose = () => {
        onClose();
        setStreamSrc(null);
        setError(null);
        setStreamType(STREAM_TYPE.SUB); // Reset về luồng phụ
    };

    if (!camera) return null;

    const isMainStream = streamType === STREAM_TYPE.MAIN;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-5xl bg-gray-900 border-gray-800 text-white p-0 overflow-hidden gap-0">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Live: {camera.name}
                        <span className="text-xs font-normal text-gray-400 ml-2 font-mono">
                            ({camera.code})
                        </span>
                    </DialogTitle>
                    <div className="flex items-center gap-2 mr-8">
                        {/* Nút chuyển đổi luồng */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSwitchStream}
                            disabled={loading || switching}
                            className={`
                                border-gray-700 text-xs font-medium
                                ${isMainStream
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
                            `}
                        >
                            {switching ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : isMainStream ? (
                                <MonitorPlay className="h-3 w-3 mr-1" />
                            ) : (
                                <Monitor className="h-3 w-3 mr-1" />
                            )}
                            {isMainStream ? 'Luồng chính (HD)' : 'Luồng phụ (SD)'}
                        </Button>
                    </div>
                </div>

                {/* Main Content - Video Player */}
                <div className="bg-black aspect-video relative">
                    {(loading || switching) ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                                <p className="mt-2 text-sm text-gray-400">
                                    {switching ? 'Đang chuyển luồng...' : 'Đang kết nối camera...'}
                                </p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center max-w-sm px-4">
                                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                                <p className="text-red-400 font-medium">{error}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 border-gray-700 hover:bg-gray-800 text-gray-300"
                                    onClick={handleClose}
                                >
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    ) : (
                        streamSrc && <StreamPlayer streamSrc={streamSrc} />
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-6 py-3 bg-gray-900 border-t border-gray-800 text-xs text-gray-500 flex justify-between items-center">
                    <div className="flex gap-4">
                        <span>IP: {camera.cameraIP}</span>
                        <span>Channel: {camera.cameraChannel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Badge hiển thị loại luồng */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isMainStream
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-700 text-gray-400'
                            }`}>
                            {isMainStream ? 'HD' : 'SD'}
                        </span>
                        {streamSrc && (
                            <span className="text-green-500 flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Đang phát trực tiếp
                            </span>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
