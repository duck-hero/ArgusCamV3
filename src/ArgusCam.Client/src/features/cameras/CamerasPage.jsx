import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Camera, RefreshCw, Monitor, AlertTriangle, Radar, Server, Video } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { cameraApi } from '../../api/cameraApi.js';
import { deskApi } from '../../api/deskApi.js';
import { useToast } from '../../components/Toast.jsx';
import { CameraModal } from './CameraModal.jsx';
import { LiveStreamDialog } from './LiveStreamDialog.jsx';
import { ScanDevicesModal } from './ScanDevicesModal.jsx';

const providerLabels = {
  hikvision: 'Hikvision',
  imou: 'Imou',
  ezviz: 'Ezviz',
};

const providerBadgeClasses = {
  hikvision: 'bg-cyan-100 text-cyan-800',
  imou: 'bg-emerald-100 text-emerald-800',
  ezviz: 'bg-amber-100 text-amber-800',
  unknown: 'bg-slate-100 text-slate-800',
};

const getProviderLabel = (providerKey) => providerLabels[providerKey] || providerKey || 'Unknown';
const getProviderBadgeClass = (providerKey) => providerBadgeClasses[providerKey] || providerBadgeClasses.unknown;

// Cameras management page với real API integration
export const CamerasPage = () => {
  const { success, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [deskFilter, setDeskFilter] = useState(''); // DeskId filter
  // API state
  const [cameras, setCameras] = useState([]);
  const [desks, setDesks] = useState([]); // Äá»ƒ fill dropdown filter
  const [loading, setLoading] = useState(true);
  const [loadingDesks, setLoadingDesks] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [liveStreamCamera, setLiveStreamCamera] = useState(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Infinite scroll
  const observerTarget = useRef(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load desks cho filter dropdown
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

    fetchDesks();
  }, []);

  // Fetch cameras
  const fetchCameras = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = {
        cursor: isLoadMore ? cursor : null,
        limit: 20,
        searchTerm: debouncedSearchTerm,
        deskId: deskFilter || null,
      };

      const response = await cameraApi.getCameras(params);

      if (response && response.content) {
        const { items, nextCursor, hasNextPage } = response.content;

        if (isLoadMore) {
          setCameras(prev => [...prev, ...items]);
        } else {
          setCameras(items);
        }

        setCursor(nextCursor);
        setHasMore(hasNextPage);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
      toastError('Không thể tải danh sách camera');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, debouncedSearchTerm, deskFilter, toastError]);

  // Load cameras on mount và khi filter thay đổi
  useEffect(() => {
    fetchCameras(false);
  }, [debouncedSearchTerm, deskFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchCameras(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, fetchCameras]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle camera actions
  const handleOpenModal = (camera = null) => {
    setSelectedCamera(camera);
    setPrefillData(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedCamera(null);
    setPrefillData(null);
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    fetchCameras(false);
  };

  const handleDeleteCamera = async (camera) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa camera "${camera.name}"?`)) {
      return;
    }

    try {
      await cameraApi.deleteCamera(camera.id);
      setCameras(prev => prev.filter(c => c.id !== camera.id));
      success('Xóa camera thành công!');
    } catch (error) {
      console.error('Error deleting camera:', error);
      toastError(error.response?.data?.err || 'Có lỗi xảy ra khi xóa camera');
    }
  };

  const handleRefresh = () => {
    setCursor(null);
    fetchCameras(false);
  };

  // Live Stream Handlers
  const handleOpenLiveStream = (camera) => {
    setLiveStreamCamera(camera);
  };

  const handleCloseLiveStream = () => {
    setLiveStreamCamera(null);
  };

  // Scan Handlers
  const handleAddDeviceFromScan = (deviceData) => {
    setPrefillData(deviceData);
    setSelectedCamera(null);
    setIsModalOpen(true);
  };

  // Đếm số camera cùng 1 IP để nhận diện NVR (>=2 channel cùng IP)
  const ipChannelCount = useMemo(() => {
    const map = {};
    cameras.forEach(cam => {
      if (!cam.cameraIP) return;
      map[cam.cameraIP] = (map[cam.cameraIP] || 0) + 1;
    });
    return map;
  }, [cameras]);

  // Sắp xếp camera: group theo IP (cùng IP đứng liền nhau), rồi sort theo channel
  const sortedCameras = useMemo(() => {
    return [...cameras].sort((a, b) => {
      const ipA = a.cameraIP || '';
      const ipB = b.cameraIP || '';
      if (ipA !== ipB) return ipA.localeCompare(ipB, undefined, { numeric: true });
      const chA = parseInt(a.cameraChannel, 10) || 0;
      const chB = parseInt(b.cameraChannel, 10) || 0;
      return chA - chB;
    });
  }, [cameras]);

  const isNvrCamera = (camera) => (camera.cameraIP && ipChannelCount[camera.cameraIP] > 1);

  return (
    <div className="space-y-6">
      {/* Filters và Search */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 mb-6">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            
            {/* Search */}
            <div className="w-full sm:w-56 relative shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm camera..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full text-sm py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Desk Filter */}
            <div className="w-full xl:w-48 flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={deskFilter}
                  onChange={(e) => setDeskFilter(e.target.value)}
                  className="block w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                  disabled={loadingDesks}
                >
                  <option value="">Tất cả desk</option>
                  {desks.map((desk) => (
                    <option key={desk.id} value={desk.id}>
                      {desk.code} - {desk.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-grow xl:justify-end mt-2 xl:mt-0">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="px-2 py-1.5 h-auto text-xs whitespace-nowrap border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''} mr-1.5`} />
                Làm mới
              </Button>
              <Button 
                onClick={() => setIsScanModalOpen(true)}
                variant="outline"
                size="sm"
                className="px-2 py-1.5 h-auto text-xs whitespace-nowrap border-blue-200 text-blue-600 hover:bg-blue-50 shrink-0"
              >
                <Radar className="h-3.5 w-3.5 mr-1.5" />
                Quét mã
              </Button>
              <Button 
                onClick={() => handleOpenModal()} 
                size="sm"
                className="px-3 py-1.5 h-auto text-xs whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Thêm mới
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cameras Display */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Danh sách Camera ({cameras.length})
          </h3>

          {/* Loading State */}
          {loading && cameras.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Äang táº£i...</p>
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có camera</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || deskFilter ? 'Không tìm thấy camera phù hợp' : 'Bắt đầu bằng cách quét thiết bị hoặc tạo camera mới'}
              </p>
              {!searchTerm && !deskFilter && (
                <div className="mt-6 flex items-center justify-center space-x-3">
                  <Button variant="outline" onClick={() => setIsScanModalOpen(true)}>
                    <Radar className="h-4 w-4 mr-2" />
                    Quét thiết bị
                  </Button>
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm Camera
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Grid View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {sortedCameras.map((camera) => {
                    const isNvr = isNvrCamera(camera);
                    return (
                    <div key={camera.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {/* Camera Header */}
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1 flex items-start gap-2">
                            {isNvr
                              ? <Server className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                              : <Video className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />}
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">{camera.name}</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-mono">{camera.code}</span>
                              </p>
                            </div>
                          </div>
                          <div className="ml-2 flex flex-col items-end gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isNvr ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {isNvr ? 'Đầu thu' : 'Camera IP'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getProviderBadgeClass(camera.providerKey)}`}>
                              {getProviderLabel(camera.providerKey)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Camera Info */}
                      <div className="p-4">
                        <div className="space-y-2 text-sm">
                          {camera.model && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Model:</span>
                              <span className="font-medium text-xs">{camera.model}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Desk:</span>
                            <span className="font-medium">{camera.deskName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">IP:</span>
                            <span className="font-mono text-xs font-medium">{camera.cameraIP}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Channel:</span>
                            <span className="font-medium">{camera.cameraChannel}</span>
                          </div>
                          {camera.note && (
                            <div className="pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-600">{camera.note}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Camera Actions */}
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(camera)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenLiveStream(camera)}
                          className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                          title="Xem Live"
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCamera(camera)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                </div>

              {/* Desktop List View */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mã Camera
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tên
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hãng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Model
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Desk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Channel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loại
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedCameras.map((camera) => {
                        const isNvr = isNvrCamera(camera);
                        return (
                        <tr key={camera.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {isNvr
                                ? <Server className="h-4 w-4 text-purple-600 shrink-0" />
                                : <Video className="h-4 w-4 text-blue-600 shrink-0" />}
                              {camera.code}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {camera.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getProviderBadgeClass(camera.providerKey)}`}>
                              {getProviderLabel(camera.providerKey)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {camera.model || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {camera.deskName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                            {camera.cameraIP}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {camera.cameraChannel}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isNvr ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {isNvr ? 'Đầu thu' : 'Camera IP'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModal(camera)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenLiveStream(camera)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Xem Live"
                              >
                                <Monitor className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCamera(camera)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="h-4" />
            </>
          )}
        </div>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        camera={selectedCamera}
        prefillData={prefillData}
        onSuccess={handleModalSuccess}
      />

      {/* Live Stream Dialog */}
      <LiveStreamDialog
        isOpen={!!liveStreamCamera}
        onClose={handleCloseLiveStream}
        camera={liveStreamCamera}
      />

      {/* Scan Devices Modal */}
      <ScanDevicesModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        cameras={cameras}
        onAddDevice={handleAddDeviceFromScan}
      />
    </div>
  );
};

