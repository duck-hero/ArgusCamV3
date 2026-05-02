import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, Plus, Eye, Edit, Trash2, Monitor, MapPin, Activity, Package, RefreshCw } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { deskApi } from '../../api/deskApi.js';
import { useToast } from '../../components/Toast.jsx';
import { DeskModal } from './DeskModal.jsx';

// Desks management page với real API integration
export const DesksPage = () => {
  const { success, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'packing', 'unpacking'
  // API state
  const [desks, setDesks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDesk, setSelectedDesk] = useState(null);

  // Infinite scroll
  const observerTarget = useRef(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch desks
  const fetchDesks = useCallback(async (isLoadMore = false) => {
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
      };

      const response = await deskApi.getDesks(params);

      if (response && response.content) {
        const { items, nextCursor, hasNextPage } = response.content;

        if (isLoadMore) {
          setDesks(prev => [...prev, ...items]);
        } else {
          setDesks(items);
        }

        setCursor(nextCursor);
        setHasMore(hasNextPage);
      }
    } catch (error) {
      console.error('Error fetching desks:', error);
      toastError('Không thể tải danh sách desk');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, debouncedSearchTerm, toastError]);

  // Load desks on mount và khi search term thay đổi
  useEffect(() => {
    fetchDesks(false);
  }, [debouncedSearchTerm]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchDesks(true);
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
  }, [hasMore, loadingMore, loading, fetchDesks]);

  // Filter desks by type
  const filteredDesks = desks.filter(desk => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'packing') return desk.isPacking === true;
    if (typeFilter === 'unpacking') return desk.isPacking === false;
    return true;
  });

  // Status utilities
  const getStatusBadge = (isPacking) => {
    return isPacking
      ? 'bg-blue-100 text-blue-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (isPacking) => {
    return isPacking ? 'Đóng gói' : 'Bóc hoàn';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle desk actions
  const handleOpenModal = (desk = null) => {
    setSelectedDesk(desk);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedDesk(null);
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    fetchDesks(false); // Refresh danh sách
  };

  const handleDeleteDesk = async (desk) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa desk "${desk.name}"?`)) {
      return;
    }

    try {
      await deskApi.deleteDesk(desk.id);
      setDesks(prev => prev.filter(d => d.id !== desk.id));
      success('Xóa desk thành công!');
    } catch (error) {
      console.error('Error deleting desk:', error);
      toastError(error.response?.data?.err || 'Có lỗi xảy ra khi xóa desk');
    }
  };

  const handleRefresh = () => {
    setCursor(null);
    fetchDesks(false);
  };

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
                placeholder="Tìm kiếm desk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full text-sm py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <div className="w-full xl:w-48 flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="block w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="packing">Đóng gói</option>
                  <option value="unpacking">Bóc hoàn</option>
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

      {/* Desks Display */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Danh sách Desk ({filteredDesks.length})
          </h3>

          {/* Loading State */}
          {loading && desks.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Đang tải...</p>
            </div>
          ) : filteredDesks.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có desk</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Không tìm thấy desk phù hợp' : 'Bắt đầu bằng cách tạo desk mới'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm Desk
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Grid View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredDesks.map((desk) => (
                    <div key={desk.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {/* Desk Header */}
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{desk.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              <span className="font-mono">{desk.code}</span>
                            </p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(desk.isPacking)}`}>
                            {getStatusText(desk.isPacking)}
                          </span>
                        </div>
                      </div>

                      {/* Desk Info */}
                      <div className="p-4">
                        <div className="space-y-2 text-sm">
                          {desk.note && (
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600">{desk.note}</span>
                            </div>
                          )}
                          {desk.currentScannerCode && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Scanner:</span>
                              <span className="font-medium font-mono">{desk.currentScannerCode}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Tạo lúc:</span>
                            <span>{formatDate(desk.createdOn)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Desk Actions */}
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(desk)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDesk(desk)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

              {/* Desktop List View */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mã Desk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tên
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loại
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ghi chú
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scanner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDesks.map((desk) => (
                        <tr key={desk.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                            {desk.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {desk.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(desk.isPacking)}`}>
                              {getStatusText(desk.isPacking)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {desk.note || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                            {desk.currentScannerCode || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModal(desk)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDesk(desk)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
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

      {/* Desk Modal */}
      <DeskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        desk={selectedDesk}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};
