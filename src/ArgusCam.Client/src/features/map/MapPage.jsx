import React, { useState, useEffect } from 'react';
import { deskApi } from '../../api/deskApi';
import { cameraApi } from '../../api/cameraApi';
import { Monitor, Camera, Search, Trash2, Video, PlayCircle, RefreshCw, Info, ArrowRight } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { LiveStreamDialog } from '../cameras/LiveStreamDialog';

export const MapPage = () => {
    const [desks, setDesks] = useState([]);
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedCamera, setDraggedCamera] = useState(null);
    const [dragOverDeskId, setDragOverDeskId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [liveStreamCamera, setLiveStreamCamera] = useState(null);
    const { success: toastSuccess, error: toastError } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [desksData, camerasData] = await Promise.all([
                deskApi.getDesks({ limit: 100 }),
                cameraApi.getCameras({ limit: 1000 }),
            ]);
            setDesks(desksData?.content?.items || []);
            setCameras(camerasData?.content?.items || []);
        } catch (error) {
            console.error('Failed to fetch data', error);
            toastError('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenLiveStream = (e, camera) => {
        e.preventDefault();
        e.stopPropagation();
        setLiveStreamCamera(camera);
    };

    const handleCloseLiveStream = () => setLiveStreamCamera(null);

    const handleDragStart = (e, camera) => {
        setDraggedCamera(camera);
        e.dataTransfer.setData('text/plain', JSON.stringify(camera));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedCamera(null);
        setDragOverDeskId(null);
    };

    const handleDragOver = (e, deskId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverDeskId(deskId);
    };

    const handleDragLeave = () => setDragOverDeskId(null);

    const handleDrop = async (e, desk) => {
        e.preventDefault();
        setDragOverDeskId(null);
        if (!draggedCamera) return;
        if (draggedCamera.deskId === desk.id) return;

        const originalCamera = { ...draggedCamera };
        const updatedCamera = { ...draggedCamera, deskId: desk.id };

        setCameras(prev => prev.map(c => c.id === updatedCamera.id ? updatedCamera : c));
        setDraggedCamera(null);

        try {
            await cameraApi.updateCamera(updatedCamera.id, updatedCamera);
            toastSuccess(`Đã gán "${updatedCamera.name}" vào bàn ${desk.code}`);
        } catch (error) {
            console.error('Failed to assign camera', error);
            toastError('Lỗi khi gán camera');
            setCameras(prev => prev.map(c => c.id === originalCamera.id ? originalCamera : c));
        }
    };

    const handleRemoveCamera = async (e, camera) => {
        e.stopPropagation();
        if (!window.confirm(`Gỡ camera "${camera.name}" khỏi bàn?`)) return;

        const originalCamera = { ...camera };
        const updatedCamera = { ...camera, deskId: null };
        setCameras(prev => prev.map(c => c.id === updatedCamera.id ? updatedCamera : c));

        try {
            await cameraApi.updateCamera(updatedCamera.id, updatedCamera);
            toastSuccess(`Đã gỡ "${updatedCamera.name}" khỏi bàn`);
        } catch (error) {
            console.error('Failed to remove camera', error);
            toastError('Lỗi khi gỡ camera');
            setCameras(prev => prev.map(c => c.id === originalCamera.id ? originalCamera : c));
        }
    };

    const unassignedCameras = cameras
        .filter(c => !c.deskId)
        .filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.ipAddress || c.cameraIP || '')?.includes(searchTerm)
        );

    const getIp = (camera) => camera.ipAddress || camera.cameraIP || '';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-500">Đang tải sơ đồ...</span>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-64px)] flex-col overflow-hidden bg-gray-50 lg:h-[calc(100vh-64px)] lg:flex-row">

            {/* Sidebar: Camera chưa gán */}
            <div className="flex max-h-[42vh] w-full flex-col border-b border-gray-200 bg-white shadow-sm lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">

                {/* Header sidebar */}
                <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Camera className="h-4 w-4 text-blue-600" />
                            Camera chưa gán
                            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                                {unassignedCameras.length}
                            </span>
                        </h2>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm camera..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Hướng dẫn */}
                <div className="mx-3 mt-3 hidden gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5 lg:flex">
                    <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        <strong>Kéo</strong> camera từ đây và <strong>thả</strong> vào ô bàn bên phải để gán.
                    </p>
                </div>

                {/* Danh sách camera */}
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {unassignedCameras.length === 0 ? (
                        <div className="text-center py-10">
                            <Camera className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-400">
                                {searchTerm ? 'Không tìm thấy camera' : 'Tất cả camera đã được gán'}
                            </p>
                        </div>
                    ) : (
                        unassignedCameras.map(camera => (
                            <div
                                key={camera.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, camera)}
                                onDragEnd={handleDragEnd}
                                className={`p-3 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-sm transition-all select-none group ${draggedCamera?.id === camera.id ? 'opacity-50 scale-95' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Video className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-800 truncate flex-1">{camera.name}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                        {getIp(camera) || '-'}
                                    </span>
                                    <span className={`text-xs font-medium ${camera.status === 'Online' ? 'text-green-600' : 'text-gray-400'}`}>
                                        {camera.status === 'Online' ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Sơ đồ bàn */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-white px-3 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <Monitor className="h-5 w-5 text-gray-600" />
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-semibold text-gray-800">Sơ đồ bố trí camera</h1>
                            <span className="text-xs text-gray-400">{desks.length} bàn · {cameras.filter(c => c.deskId).length} camera đã gán</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto lg:gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                                Có camera
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span>
                                Trống
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                                Đóng gói
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
                                Bóc hoàn
                            </span>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Làm mới
                        </button>
                    </div>
                </div>

                {/* Grid bàn */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5">
                    {desks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Monitor className="h-16 w-16 text-gray-200 mb-4" />
                            <h3 className="text-lg font-medium text-gray-500">Chưa có bàn nào</h3>
                            <p className="text-sm text-gray-400 mt-1">Tạo bàn trước để bắt đầu gán camera</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                            {desks.map(desk => {
                                const assignedCameras = cameras.filter(c => c.deskId === desk.id);
                                const hasCameras = assignedCameras.length > 0;
                                const isDragOver = dragOverDeskId === desk.id;
                                const isDropTarget = !!draggedCamera && draggedCamera.deskId !== desk.id;

                                return (
                                    <div
                                        key={desk.id}
                                        onDragOver={(e) => handleDragOver(e, desk.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, desk)}
                                        className={`
                                            relative rounded-xl border-2 transition-all duration-150 flex flex-col min-h-[200px] bg-white
                                            ${isDragOver
                                                ? 'border-blue-500 shadow-lg shadow-blue-100 scale-[1.02]'
                                                : hasCameras
                                                    ? 'border-green-200 hover:border-green-300 shadow-sm'
                                                    : isDropTarget
                                                        ? 'border-dashed border-blue-300 hover:border-blue-400'
                                                        : 'border-gray-200 hover:border-gray-300'
                                            }
                                        `}
                                    >
                                        {/* Header bÃ n */}
                                        <div className={`px-3 py-2.5 rounded-t-xl border-b flex items-center justify-between ${hasCameras ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={`w-2 h-6 rounded-full flex-shrink-0 ${hasCameras ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{desk.code}</p>
                                                    <p className="text-xs text-gray-500 truncate">{desk.name}</p>
                                                </div>
                                            </div>
                                            <span className={`flex-shrink-0 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${desk.isPacking ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {desk.isPacking ? 'Đóng gói' : 'Bóc hoàn'}
                                            </span>
                                        </div>

                                        {/* Drop zone / danh sÃ¡ch camera */}
                                        <div className="flex-1 p-2.5 space-y-1.5">
                                            {isDragOver && (
                                                <div className="absolute inset-0 rounded-xl bg-blue-500/5 border-2 border-blue-500 border-dashed flex items-center justify-center z-10 pointer-events-none">
                                                    <span className="text-sm font-medium text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">Thả vào đây</span>
                                                </div>
                                            )}

                                            {assignedCameras.length > 0 ? (
                                                assignedCameras.map(cam => (
                                                    <div
                                                        key={cam.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, cam)}
                                                        onDragEnd={handleDragEnd}
                                                        className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-blue-300 hover:bg-blue-50 transition-all group/cam select-none"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                                                            <Video className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                            <div className="overflow-hidden">
                                                                <p className="text-xs font-medium text-gray-700 truncate">{cam.name}</p>
                                                                <p className="text-[10px] font-mono text-gray-400">{getIp(cam) || '-'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                                            <button
                                                                onClick={(e) => handleOpenLiveStream(e, cam)}
                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-all"
                                                                title="Xem live stream"
                                                            >
                                                                <PlayCircle className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleRemoveCamera(e, cam)}
                                                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover/cam:opacity-100"
                                                                title="Gỡ camera khỏi bàn"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={`h-full min-h-[80px] flex flex-col items-center justify-center rounded-lg transition-colors ${isDropTarget ? 'border-2 border-dashed border-blue-300 bg-blue-50/50' : 'border-2 border-dashed border-gray-100'}`}>
                                                    <Monitor className="h-6 w-6 text-gray-300 mb-1.5" />
                                                    <span className="text-xs text-gray-400">{isDropTarget ? 'Thả camera vào đây' : 'Chưa có camera'}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="px-3 py-2 bg-gray-50 rounded-b-xl border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-xs text-gray-400">{assignedCameras.length} camera</span>
                                            {hasCameras && (
                                                <span className="text-xs text-green-600 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                                                    Đang hoạt động
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <LiveStreamDialog
                isOpen={!!liveStreamCamera}
                onClose={handleCloseLiveStream}
                camera={liveStreamCamera}
            />
        </div>
    );
};
