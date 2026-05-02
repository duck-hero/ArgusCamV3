import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Filter, Plus, Eye, Clock, Package, RefreshCw, ChevronDown, ChevronUp, Film, Loader2, Download, Play, Cloud, CloudUpload, ExternalLink } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { orderApi } from '../../api/orderApi.js';
import { videoApi } from '../../api/videoApi.js';
import { googleDriveApi } from '../../api/googleDriveApi.js';
import { userApi } from '../../api/userApi.js';
import { useToast } from '../../components/Toast.jsx';
import { useVideoProcessingSignalR } from '../../hooks/useSignalR.js';
import { useAuth } from '../auth/AuthContext.jsx';

// Orders management page với real API integration và cursor pagination
export const OrdersPage = () => {
  const { success, error: toastError } = useToast();
  const { isAdmin } = useAuth();
  const adminView = isAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState(''); // UserId filter
  const [isPackingFilter, setIsPackingFilter] = useState(''); // isPacking filter boolean or empty strings
  const [startFromFilter, setStartFromFilter] = useState('');
  const [startToFilter, setStartToFilter] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);

  // API state
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]); // Đổ dữ liệu dropdown filter
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Expanded row state: { orderId: { loading, videos, error } }
  const [expandedRows, setExpandedRows] = useState({});

  // Download state: { orderId: true } - tracks which orders have a download in progress
  const [downloadingOrders, setDownloadingOrders] = useState({});
  const [previewingVideos, setPreviewingVideos] = useState({});
  // Drive sync state: { videoId: true } - đang upload video lên Drive
  const [syncingVideos, setSyncingVideos] = useState({});

  // SignalR for video processing progress (lazy - connects only when download is triggered)
  const {
    orderProgress,
    joinOrderGroup,
    clearProgress,
  } = useVideoProcessingSignalR();

  // When a download completes, refresh the video list for that order
  useEffect(() => {
    Object.entries(orderProgress).forEach(([orderId, progress]) => {
      if (progress.status === 'completed') {
        // Refresh video list if the row is expanded
        if (expandedRows[orderId]) {
          handleToggleVideos(orderId, true); // force refresh
        }
        // Remove downloading state
        setDownloadingOrders(prev => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
        success(`Video đơn hàng đã tải xong!`);
        // Clear progress after a delay so user can see 100%
        setTimeout(() => clearProgress(orderId), 5000);
      } else if (progress.status === 'error') {
        setDownloadingOrders(prev => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
        toastError(progress.message || 'Lỗi khi tải video');
        setTimeout(() => clearProgress(orderId), 8000);
      }
    });
  }, [orderProgress]);

  // Infinite scroll
  const observerTarget = useRef(null);

  // Debounce search term (tìm kiếm theo Code)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load users cho filter dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      if (!adminView) {
        setUsers([]);
        return;
      }

      try {
        setLoadingUsers(true);
        const response = await userApi.getUsers({ limit: 100 });
        if (response && response.content) {
          setUsers(response.content.items);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [adminView]);

  const clearTimeFilters = () => {
    setStartFromFilter('');
    setStartToFilter('');
  };

  const formatDateTimeLocal = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const applyQuickRange = (preset) => {
    const now = new Date();
    let from = new Date(now);
    let to = new Date(now);

    if (preset === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);
    } else if (preset === '7days') {
      from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 0, 0);
    } else if (preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0);
    }

    const fromValue = formatDateTimeLocal(from);
    const toValue = formatDateTimeLocal(to);

    setStartFromFilter(fromValue);
    setStartToFilter(toValue);
  };

  const startRangeError = useMemo(() => {
    if (!startFromFilter || !startToFilter) return '';
    return startFromFilter <= startToFilter ? '' : 'Thời gian bắt đầu: Từ phải nhỏ hơn hoặc bằng Đến.';
  }, [startFromFilter, startToFilter]);

  const hasTimeRangeError = Boolean(startRangeError);

  // Fetch orders từ API
  const fetchOrders = useCallback(async (isLoadMore = false) => {
    if (hasTimeRangeError) {
      if (!isLoadMore) {
        setLoading(false);
      }
      return;
    }

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = {
        cursor: isLoadMore ? cursor : null,
        limit: 10,
        code: debouncedSearchTerm,
        userId: adminView ? (userFilter || null) : null,
        ...(isPackingFilter !== '' && { isPacking: isPackingFilter === 'true' }),
        startFrom: startFromFilter || null,
        startTo: startToFilter || null,
      };

      const response = await orderApi.getOrders(params);

      if (response && response.content) {
        const { items, nextCursor, hasNextPage } = response.content;

        if (isLoadMore) {
          setOrders(prev => [...prev, ...items]);
        } else {
          setOrders(items);
        }

        setCursor(nextCursor);
        setHasMore(hasNextPage);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toastError('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [adminView, cursor, debouncedSearchTerm, userFilter, isPackingFilter, startFromFilter, startToFilter, hasTimeRangeError, toastError]);

  // Load orders khi mount và khi filter thay đổi
  useEffect(() => {
    fetchOrders(false);
  }, [debouncedSearchTerm, userFilter, isPackingFilter, startFromFilter, startToFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchOrders(true);
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
  }, [hasMore, loadingMore, loading, fetchOrders]);

  // Mapping status từ số sang text hiển thị
  const getOrderStatusText = (orderStatus) => {
    const texts = {
      0: 'Mới tạo',
      1: 'Đang xử lý',
      2: 'Hoàn thành',
      3: 'Đã hủy',
    };
    return texts[orderStatus] || `Trạng thái ${orderStatus}`;
  };

  // Mapping status sang màu badge
  const getOrderStatusBadge = (orderStatus) => {
    const badges = {
      0: 'bg-gray-100 text-gray-800',
      1: 'bg-blue-100 text-blue-800',
      2: 'bg-green-100 text-green-800',
      3: 'bg-red-100 text-red-800',
    };
    return badges[orderStatus] || 'bg-gray-100 text-gray-800';
  };

  // Mapping isPacking sang badge
  const getPackingBadge = (isPacking) => {
    return isPacking
      ? 'bg-blue-100 text-blue-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Handle selection
  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  // Toggle expanded row và fetch videos
  const handleToggleVideos = async (orderId, forceRefresh = false) => {
    // Nếu đang mở và không phải force refresh thì đóng lại
    if (expandedRows[orderId] && !forceRefresh) {
      const currentVideos = expandedRows[orderId]?.videos || [];
      setExpandedRows(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      if (currentVideos.length > 0) {
        setPreviewingVideos(prev => {
          const next = { ...prev };
          currentVideos.forEach(video => {
            delete next[video.id];
          });
          return next;
        });
      }
      return;
    }

    // Mở row và fetch videos
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: { loading: true, videos: prev[orderId]?.videos || [], error: null },
    }));

    try {
      const response = await videoApi.getVideosByOrderId(orderId);
      const videos = response?.content || [];
      setExpandedRows(prev => ({
        ...prev,
        [orderId]: { loading: false, videos, error: null },
      }));
    } catch (err) {
      console.error('Error fetching videos:', err);
      setExpandedRows(prev => ({
        ...prev,
        [orderId]: { loading: false, videos: [], error: 'Không thể tải danh sách video' },
      }));
    }
  };

  // Handle download videos for order
  const handleDownloadVideos = async (orderId) => {
    if (downloadingOrders[orderId]) return; // Already downloading

    try {
      setDownloadingOrders(prev => ({ ...prev, [orderId]: true }));

      // Join SignalR group to receive progress (auto-connects if needed)
      await joinOrderGroup(orderId);

      // Call API to start download (background job)
      await videoApi.downloadByOrder(orderId);
      success('Đã bắt đầu tải video, quá trình có thể mất 3-5 phút!');
    } catch (err) {
      console.error('Error starting download:', err);
      toastError('Không thể kích hoạt tải video');
      setDownloadingOrders(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Làm mới danh sách
  const handleRefresh = () => {
    setCursor(null);
    fetchOrders(false);
  };

  // Đồng bộ 1 video lên Google Drive
  const handleSyncVideoToDrive = async (orderId, videoId) => {
    if (syncingVideos[videoId]) return;
    try {
      setSyncingVideos(prev => ({ ...prev, [videoId]: true }));
      const response = await googleDriveApi.syncVideo(videoId);
      const link = response?.content?.webViewLink;
      const fileId = response?.content?.fileId;
      setExpandedRows(prev => {
        if (!prev[orderId]) return prev;
        const updatedVideos = prev[orderId].videos.map(v =>
          v.id === videoId
            ? { ...v, driveWebViewLink: link, driveFileId: fileId, driveSyncedAt: new Date().toISOString() }
            : v
        );
        return { ...prev, [orderId]: { ...prev[orderId], videos: updatedVideos } };
      });
      success('Đồng bộ Google Drive thành công!');
    } catch (err) {
      console.error('Drive sync error:', err);
      toastError(err?.response?.data?.err || 'Không thể đồng bộ video lên Google Drive');
    } finally {
      setSyncingVideos(prev => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
    }
  };

  // Get progress bar color based on stage
  const getProgressBarColor = (progress) => {
    if (!progress) return 'bg-blue-600';
    if (progress.status === 'error') return 'bg-red-600';
    if (progress.status === 'completed') return 'bg-green-600';
    if (progress.stage === 'converting') return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  const getProgressStageText = (stage) => {
    const stages = {
      connecting: 'Đang kết nối',
      downloading: 'Đang tải',
      converting: 'Đang chuyển đổi',
      saving: 'Đang lưu',
      completed: 'Hoàn thành',
      error: 'Lỗi',
    };
    return stages[stage] || stage;
  };

  const renderVideoPanel = (order, compact = false) => {
    const rowState = expandedRows[order.id];
    const progress = orderProgress[order.id];
    const isDownloading = downloadingOrders[order.id] || progress?.status === 'downloading';

    if (!rowState) return null;

    return (
      <div className={compact ? 'space-y-4' : 'px-6 py-4'}>
        {progress && progress.progress > 0 && (
          <div className={compact ? 'rounded-lg bg-blue-50 p-3' : 'mb-8 px-12'}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-blue-700">
                {progress.message}
              </span>
              <span className="rounded bg-blue-100 px-2 py-1 text-sm font-bold text-blue-800">
                {progress.progress}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200 shadow-inner">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${getProgressBarColor(progress)}`}
                style={{ width: `${Math.min(progress.progress, 100)}%` }}
              />
            </div>
            {progress.stage && (
              <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs ${progress.stage === 'completed' ? 'bg-green-100 text-green-700' :
                progress.stage === 'error' ? 'bg-red-100 text-red-700' :
                  progress.stage === 'converting' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                }`}
              >
                {getProgressStageText(progress.stage)}
              </span>
            )}
          </div>
        )}

        {progress?.status === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {progress.message}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-gray-500">
            {rowState.loading ? '' : `Tổng: ${rowState.videos?.length ?? 0} video`}
          </p>
          <Button
            size="sm"
            onClick={() => handleDownloadVideos(order.id)}
            disabled={isDownloading}
            className={`min-h-9 shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold sm:px-3 sm:py-2 sm:text-xs ${isDownloading
                ? 'bg-gray-100 text-gray-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            title="Tải toàn bộ video từ camera về"
          >
            {isDownloading ? (
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Đang tải...</span>
            ) : (
              <span className="flex items-center gap-1"><Download className="h-3 w-3" /><span className="hidden min-[380px]:inline">Tải video từ camera</span><span className="min-[380px]:hidden">Tải video</span></span>
            )}
          </Button>
        </div>

        {rowState.loading ? (
          <div className="flex items-center justify-center py-5">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-gray-500">Đang tải danh sách video...</span>
          </div>
        ) : rowState.error ? (
          <div className="py-4 text-center text-sm text-red-500">
            {rowState.error}
          </div>
        ) : rowState.videos.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg bg-gray-50 py-5 text-sm text-gray-500">
            <Film className="mr-2 h-5 w-5 text-gray-400" />
            Chưa có video nào cho đơn hàng này
          </div>
        ) : (
          <div className={compact ? 'grid gap-3' : 'w-full overflow-x-auto pb-4'}>
            <div className={compact ? 'grid gap-3' : 'flex min-w-max gap-4'}>
              {rowState.videos.map((video) => (
                <div key={video.id} className={`${compact ? 'w-full' : 'w-80 flex-shrink-0'} rounded-lg border border-gray-200 bg-white p-3 shadow-sm`}>
                  <div className="aspect-video overflow-hidden rounded-md bg-slate-950">
                    {previewingVideos[video.id] ? (
                      <video
                        controls
                        autoPlay
                        preload="metadata"
                        className="h-full w-full object-cover"
                        src={videoApi.getStreamUrl(video.id)}
                      >
                        Trình duyệt không hỗ trợ video.
                      </video>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPreviewingVideos(prev => ({ ...prev, [video.id]: true }))}
                        className="group relative block h-full w-full overflow-hidden text-left"
                        title={`Phát video ${video.code}`}
                      >
                        <img
                          src={videoApi.getThumbnailUrl(video.id)}
                          alt={`Thumbnail ${video.code}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-slate-900/30" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-slate-900 shadow-lg transition group-hover:scale-105">
                            <Play className="ml-0.5 h-6 w-6 fill-current" />
                          </span>
                        </div>
                        <div className="absolute left-3 top-3 rounded-full bg-slate-950/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                          Preview
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                          <p className="text-xs font-medium text-slate-100/95">
                            Nhấn để phát video
                          </p>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className="truncate text-sm font-semibold text-gray-900" title={video.code}>
                      {video.code}
                    </p>
                    <p className="truncate text-xs text-gray-600" title={video.cameraName || '-'}>
                      Camera: {video.cameraName || '-'}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {video.driveWebViewLink && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                            <Cloud className="h-3 w-3" />
                            Drive
                          </span>
                        )}
                        {previewingVideos[video.id] && (
                          <button
                            type="button"
                            onClick={() => setPreviewingVideos(prev => ({ ...prev, [video.id]: false }))}
                            className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                            title="Ẩn player"
                          >
                            Xem ảnh
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {video.driveWebViewLink ? (
                          <a
                            href={video.driveWebViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md bg-green-50 p-2 text-green-700 shadow-sm transition-colors hover:bg-green-600 hover:text-white"
                            title="Đã đồng bộ Drive - mở link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSyncVideoToDrive(order.id, video.id)}
                            disabled={syncingVideos[video.id]}
                            className="rounded-md bg-gray-100 p-2 text-gray-600 shadow-sm transition-colors hover:bg-sky-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            title="Đồng bộ lên Google Drive"
                          >
                            {syncingVideos[video.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CloudUpload className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <a
                          href={videoApi.getStreamUrl(video.id)}
                          download={`video_${video.code}.mp4`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-gray-100 p-2 text-gray-600 shadow-sm transition-colors hover:bg-blue-600 hover:text-white"
                          title="Tải video này"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">


      {/* Filters và Search */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white shadow-sm sm:mb-6 sm:rounded-xl">
        <div className="p-3 sm:p-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(12rem,14rem)_minmax(12rem,14rem)_minmax(10rem,12rem)_minmax(0,1fr)] xl:items-center">

            {/* 1. MÃ ĐƠN HÀNG (Search) */}
            <div className="relative col-span-2 w-full min-w-0 xl:col-span-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Mã đơn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            {/* 2. NHÂN VIÊN */}
            {adminView && (
              <div className="relative w-full min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="block min-h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  disabled={loadingUsers}
                >
                  <option value="">Tất cả NV</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.userName || user.fullName || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. LOẠI */}
            <div className="w-full min-w-0">
              <select
                value={isPackingFilter}
                onChange={(e) => setIsPackingFilter(e.target.value)}
                className="block min-h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Tất cả loại</option>
                <option value="true">Đóng hàng</option>
                <option value="false">Bóc hoàn</option>
              </select>
            </div>

            {/* 4. KHOẢNG THỜI GIAN */}
            <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 xl:col-span-1 xl:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_auto] xl:items-center">
              <div className="flex min-h-11 w-full min-w-0 items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 sm:gap-2 sm:px-3">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Từ:</span>
                <input
                  type="datetime-local"
                  value={startFromFilter}
                  onChange={(e) => setStartFromFilter(e.target.value)}
                  className="w-full min-w-0 border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
                />
              </div>
              <div className="flex min-h-11 w-full min-w-0 items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 sm:gap-2 sm:px-3">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Đến:</span>
                <input
                  type="datetime-local"
                  value={startToFilter}
                  onChange={(e) => setStartToFilter(e.target.value)}
                  className="w-full min-w-0 border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
                />
              </div>

              {/* Quick Range / Clear */}
              <div className="col-span-2 flex w-full min-w-0 items-center gap-1 overflow-x-auto pt-1 sm:pt-0 xl:col-span-1 xl:w-auto">
                <button type="button" onClick={() => applyQuickRange('today')} className="text-xs px-2 py-1.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 whitespace-nowrap">Hôm nay</button>
                <button type="button" onClick={() => applyQuickRange('7days')} className="text-xs px-2 py-1.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 whitespace-nowrap">7 ngày</button>
                <button type="button" onClick={() => applyQuickRange('month')} className="text-xs px-2 py-1.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 whitespace-nowrap">Tháng</button>
                {(startFromFilter || startToFilter) && (
                  <button type="button" onClick={clearTimeFilters} className="text-xs px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium whitespace-nowrap">Xóa</button>
                )}

                <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="px-2 py-1.5 h-auto text-xs whitespace-nowrap border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                  disabled={loading}
                  title="Làm mới"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline ml-1">Làm mới</span>
                </Button>
              </div>
            </div>

          </div>

          {/* Render Date Error on a new line if present */}
          {hasTimeRangeError && (
            <div className="mt-3 text-xs text-red-600 flex items-center bg-red-50 p-2 rounded border border-red-100 w-fit">
              {startRangeError}
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          {/* Table Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            {selectedOrders.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">
                  Đã chọn {selectedOrders.length} đơn hàng
                </span>
                <Button variant="outline" size="sm" disabled>
                  Xuất Excel
                </Button>
                <Button variant="outline" size="sm" className="text-red-600" disabled>
                  Xóa đã chọn
                </Button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Đang tải...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có đơn hàng</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || userFilter ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào trong hệ thống'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">

                {orders.map((order) => {
                  const isExpanded = Boolean(expandedRows[order.id]);

                  return (
                  <article
                    key={order.id}
                    className={`relative rounded-lg border p-4 shadow-sm transition-colors ${isExpanded
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200'
                        : 'border-gray-200 bg-white'
                      }`}
                  >
                    {isExpanded && (
                      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-blue-600" />
                    )}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleVideos(order.id)}
                        aria-expanded={isExpanded}
                        className="block w-full rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="break-all text-lg font-bold text-gray-950">{order.code}</p>
                          </div>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm text-gray-600">{order.userName || 'Chưa có nhân viên'}</p>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getPackingBadge(order.isPacking)}`}>
                            {order.isPacking ? 'Đóng hàng' : 'Bóc hoàn'}
                          </span>
                        </div>

                        <div className={`mt-4 grid grid-cols-2 divide-x rounded-lg px-3 py-2 text-sm ${isExpanded ? 'divide-blue-200 bg-white/80' : 'divide-gray-200 bg-gray-50'}`}>
                          <div className="min-w-0 pr-3">
                            <p className="text-[11px] font-semibold uppercase text-gray-500">Bắt đầu</p>
                            <p className="mt-1 truncate font-medium text-gray-900" title={formatDate(order.start)}>
                              {formatDate(order.start)}
                            </p>
                          </div>
                          <div className="min-w-0 pl-3">
                            <p className="text-[11px] font-semibold uppercase text-gray-500">Kết thúc</p>
                            <p className="mt-1 truncate font-medium text-gray-900" title={formatDate(order.end)}>
                              {formatDate(order.end)}
                            </p>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 border-t border-blue-200 pt-4">
                          {renderVideoPanel(order, true)}
                        </div>
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>

              {/* Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mã đơn
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NV
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TG Bắt đầu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TG Kết thúc
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
                    {orders.map((order) => {
                      const isExpanded = Boolean(expandedRows[order.id]);

                      return (
                      <React.Fragment key={order.id}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-blue-50 shadow-[inset_4px_0_0_#2563eb]' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleSelectOrder(order.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {order.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.userName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.start)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.end)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPackingBadge(order.isPacking)}`}>
                              {order.isPacking ? 'Đóng hàng' : 'Bóc hoàn'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleVideos(order.id)}
                                className={isExpanded ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                              >
                                <Eye className="h-4 w-4" />
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3 ml-1" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Video Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0 border-b border-blue-200 bg-blue-50/70">
                              <div className="w-0 min-w-full overflow-hidden">
                                <div className="px-6 py-4">
                                  {/* Progress Bar */}
                                  {orderProgress[order.id] && orderProgress[order.id].progress > 0 && (
                                    <div className="mb-8 px-12">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-blue-700">
                                          {orderProgress[order.id].message}
                                        </span>
                                        <span className="text-sm font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                          {orderProgress[order.id].progress}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                                        <div
                                          className={`h-2.5 rounded-full transition-all duration-500 ${getProgressBarColor(orderProgress[order.id])}`}
                                          style={{ width: `${Math.min(orderProgress[order.id].progress, 100)}%` }}
                                        />
                                      </div>
                                      {orderProgress[order.id].stage && (
                                        <div className="flex items-center mt-1">
                                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${orderProgress[order.id].stage === 'completed' ? 'bg-green-100 text-green-700' :
                                            orderProgress[order.id].stage === 'error' ? 'bg-red-100 text-red-700' :
                                              orderProgress[order.id].stage === 'converting' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {orderProgress[order.id].stage === 'connecting' && 'Đang kết nối'}
                                            {orderProgress[order.id].stage === 'downloading' && 'Đang tải'}
                                            {orderProgress[order.id].stage === 'converting' && 'Đang chuyển đổi'}
                                            {orderProgress[order.id].stage === 'saving' && 'Đang lưu'}
                                            {orderProgress[order.id].stage === 'completed' && 'Hoàn thành'}
                                            {orderProgress[order.id].stage === 'error' && 'Lỗi'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Error from progress */}
                                  {orderProgress[order.id]?.status === 'error' && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                      {orderProgress[order.id].message}
                                    </div>
                                  )}

                                  {/* Download button - luôn hiển thị dù chưa có video */}
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-gray-500">
                                      {expandedRows[order.id].loading ? '' : `Tổng: ${expandedRows[order.id].videos?.length ?? 0} video`}
                                    </p>
                                    <Button
                                      size="sm"
                                      onClick={() => handleDownloadVideos(order.id)}
                                      disabled={downloadingOrders[order.id] || orderProgress[order.id]?.status === 'downloading'}
                                      className={`h-auto px-3 py-1 text-xs font-semibold rounded-lg transition-all ${downloadingOrders[order.id] || orderProgress[order.id]?.status === 'downloading'
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                      title="Tải toàn bộ video từ camera về (mất vài phút)"
                                    >
                                      {downloadingOrders[order.id] || orderProgress[order.id]?.status === 'downloading' ? (
                                        <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Đang tải...</span>
                                      ) : (
                                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />Tải video từ camera</span>
                                      )}
                                    </Button>
                                  </div>

                                  {/* Video List */}
                                  {expandedRows[order.id].loading ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                                      <span className="text-sm text-gray-500">Đang tải danh sách video...</span>
                                    </div>
                                  ) : expandedRows[order.id].error ? (
                                    <div className="text-center py-4 text-sm text-red-500">
                                      {expandedRows[order.id].error}
                                    </div>
                                  ) : expandedRows[order.id].videos.length === 0 ? (
                                    <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                                      <Film className="h-5 w-5 mr-2 text-gray-400" />
                                      Chưa có video nào cho đơn hàng này
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="w-full overflow-x-auto pb-4">
                                        <div className="flex gap-4 min-w-max">
                                          {expandedRows[order.id].videos.map((video) => (
                                            <div key={video.id} className="w-80 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                              <div className="aspect-video overflow-hidden rounded-md bg-slate-950">
                                                {previewingVideos[video.id] ? (
                                                  <video
                                                    controls
                                                    autoPlay
                                                    preload="metadata"
                                                    className="h-full w-full object-cover"
                                                    src={videoApi.getStreamUrl(video.id)}
                                                  >
                                                    Trình duyệt không hỗ trợ video.
                                                  </video>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => setPreviewingVideos(prev => ({ ...prev, [video.id]: true }))}
                                                    className="group relative block h-full w-full overflow-hidden text-left"
                                                    title={`Phát video ${video.code}`}
                                                  >
                                                    <img
                                                      src={videoApi.getThumbnailUrl(video.id)}
                                                      alt={`Thumbnail ${video.code}`}
                                                      loading="lazy"
                                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-slate-900/30" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-slate-900 shadow-lg transition group-hover:scale-105">
                                                        <Play className="ml-0.5 h-6 w-6 fill-current" />
                                                      </span>
                                                    </div>
                                                    <div className="absolute left-3 top-3 rounded-full bg-slate-950/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                                      Preview
                                                    </div>
                                                    <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                                                      <p className="text-xs font-medium text-slate-100/95">
                                                        Nhấn để phát video
                                                      </p>
                                                    </div>
                                                  </button>
                                                )}
                                              </div>

                                              <div className="mt-3 space-y-2">
                                                <p className="text-sm font-semibold text-gray-900 truncate" title={video.code}>
                                                  {video.code}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate" title={video.cameraName || '-'}>
                                                  Camera: {video.cameraName || '-'}
                                                </p>
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    {video.driveWebViewLink && (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">
                                                        <Cloud className="h-3 w-3" />
                                                        Drive
                                                      </span>
                                                    )}
                                                    {previewingVideos[video.id] && (
                                                      <button
                                                        type="button"
                                                        onClick={() => setPreviewingVideos(prev => ({ ...prev, [video.id]: false }))}
                                                        className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                                        title="Ẩn player"
                                                      >
                                                        Xem ảnh
                                                      </button>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    {video.driveWebViewLink ? (
                                                      <a
                                                        href={video.driveWebViewLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white rounded-md transition-colors shadow-sm"
                                                        title="Đã đồng bộ Drive - mở link"
                                                      >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                      </a>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleSyncVideoToDrive(order.id, video.id)}
                                                        disabled={syncingVideos[video.id]}
                                                        className="p-1.5 bg-gray-100 text-gray-600 hover:bg-sky-600 hover:text-white rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Đồng bộ lên Google Drive"
                                                      >
                                                        {syncingVideos[video.id] ? (
                                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                          <CloudUpload className="h-3.5 w-3.5" />
                                                        )}
                                                      </button>
                                                    )}
                                                    <a
                                                      href={videoApi.getStreamUrl(video.id)}
                                                      download={`video_${video.code}.mp4`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="p-1.5 bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white rounded-md transition-colors shadow-sm"
                                                      title="Tải video này"
                                                    >
                                                      <Download className="h-3.5 w-3.5" />
                                                    </a>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-1 text-sm text-gray-500">Đang tải thêm...</p>
                </div>
              )}

              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="h-4" />

              {/* Thông báo khi hết dữ liệu */}
              {!hasMore && orders.length > 0 && !loading && (
                <div className="text-center py-3 text-sm text-gray-400">
                  Đã hiển thị tất cả đơn hàng
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};



