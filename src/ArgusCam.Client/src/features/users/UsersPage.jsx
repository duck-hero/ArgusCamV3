import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, RefreshCw, QrCode } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { Card } from '../../components/Card.jsx';
import { Alert } from '../../components/Alert.jsx';
import { Loading } from '../../components/Loading.jsx';
import { userApi } from '../../api/userApi.js';
import { UserModal } from './UserModal.jsx';
import { UserQRModal } from './UserQRModal.jsx';
import { useToast } from '../../components/Toast.jsx';

// Status utilities
const getStatusBadge = (status) => {
  const badges = {
    true: 'bg-green-100 text-green-800',
    false: 'bg-red-100 text-red-800',
  };
  return badges[status] || badges[false];
};

const getStatusText = (status) => {
  return status ? 'Hoạt động' : 'Không hoạt động';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const UsersPage = () => {
  const { success, error: toastError } = useToast();
  const observerTarget = useRef(null);

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination State
  const [nextPageCursor, setNextPageCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(20); // TÄƒng page size máº·c Ä‘á»‹nh cho scroll

  // Selection & Actions
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // QR Modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUser, setQrUser] = useState(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users logic
  const fetchUsers = useCallback(async (cursorToFetch) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        cursor: cursorToFetch,
        limit: pageSize,
        searchTerm: debouncedSearchTerm.trim(),
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter === 'active';
      }

      const response = await userApi.getUsers(params);

      // Handle custom error structure if present in logic (though axiosInstance handles thrown errors)
      if (response && response.err) {
        throw new Error(response.err);
      }

      const { items, nextCursor, hasNextPage: apiHasNext } = response.content || response;

      setUsers(prev => {
        // Náº¿u cursor lÃ  null thÃ¬ replace (first load / filter change)
        // Náº¿u cursor cÃ³ giÃ¡ trá»‹ thÃ¬ append
        return cursorToFetch ? [...prev, ...(items || [])] : (items || []);
      });

      setNextPageCursor(nextCursor);
      setHasNextPage(apiHasNext);

    } catch (err) {
      console.error('Error fetching users:', err);
      // Chá»‰ hiá»‡n lá»—i náº¿u lÃ  trang Ä‘áº§u, trÃ¡nh hiá»‡n khi scroll
      if (!cursorToFetch) {
        setError(err.message || 'Không thể tải danh sách người dùng');
        setUsers([]);
      } else {
        toastError('Không thể tải thêm dữ liệu');
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, debouncedSearchTerm, statusFilter, toastError]);

  // Initial Load & Filter Changes -> Reset list & fetch first page
  useEffect(() => {
    setNextPageCursor(null);
    setHasNextPage(false);
    fetchUsers(null);
  }, [fetchUsers]); // fetchUsers changes when filters change

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !loading) {
          console.log("Loading more...");
          fetchUsers(nextPageCursor);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, loading, nextPageCursor, fetchUsers]);


  // Actions
  const handleRefresh = () => {
    fetchUsers(null);
    setSelectedUsers([]);
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  // QR Modal handlers
  const handleOpenQR = (user) => {
    setQrUser(user);
    setShowQRModal(true);
  };

  const handleCloseQR = () => {
    setShowQRModal(false);
    setQrUser(null);
  };

  const handleModalSubmit = async (formData) => {
    try {
      setModalLoading(true);
      if (editingUser) {
        await userApi.updateUser(editingUser.id, formData);
        success('Cập nhật người dùng thành công');
      } else {
        await userApi.createUser(formData);
        success('Tạo người dùng mới thành công');
      }
      setShowModal(false);
      handleRefresh(); // Refresh list to see updates
    } catch (err) {
      toastError(err.message || 'Có lỗi xảy ra');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await userApi.deleteUser(userId);
        success('Xóa người dùng thành công');

        // Remove locally to avoid full refresh/jump
        setUsers(prev => prev.filter(u => u.id !== userId));
        setSelectedUsers(prev => prev.filter(id => id !== userId));

      } catch (error) {
        toastError(error.message);
      }
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await userApi.toggleUserStatus(userId);
      success('Cập nhật trạng thái thành công');
      // Update locally
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, status: !u.status } : u
      ));
    } catch (error) {
      toastError(error.message);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return;
    try {
      if (action === 'delete') {
        if (window.confirm(`Xóa ${selectedUsers.length} người dùng?`)) {
          await userApi.bulkDeleteUsers(selectedUsers);
          success(`Đã xóa ${selectedUsers.length} người dùng`);
          setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
        }
      } else if (action === 'activate') {
        await userApi.bulkToggleStatus(selectedUsers, true);
        success('Đã kích hoạt các tài khoản đã chọn');
        setUsers(prev => prev.map(u => selectedUsers.includes(u.id) ? { ...u, status: true } : u));
      } else if (action === 'deactivate') {
        await userApi.bulkToggleStatus(selectedUsers, false);
        success('Đã khóa các tài khoản đã chọn');
        setUsers(prev => prev.map(u => selectedUsers.includes(u.id) ? { ...u, status: false } : u));
      }
      setSelectedUsers([]);
    } catch (e) {
      toastError(e.message || 'Lỗi khi thực hiện thao tác hàng loạt');
    }
  };

  return (
    <div className="space-y-6">

      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Lỗi" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters và Search */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white shadow-sm sm:mb-6 sm:rounded-xl">
        <div className="p-3 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(14rem,18rem)_minmax(11rem,13rem)_minmax(9rem,11rem)_minmax(0,1fr)] xl:items-center">
            
            {/* Search */}
            <div className="relative w-full min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full min-w-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block min-h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>

            {/* Page Size */}
            <div className="w-full min-w-0">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="block min-h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
            
            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1 xl:flex xl:items-center xl:justify-end">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="w-full border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 xl:w-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''} mr-1.5`} />
                Làm mới
              </Button>
              <Button 
                onClick={handleCreate} 
                size="sm"
                className="w-full px-3 py-2 text-xs xl:w-auto"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Thêm mới
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card padding="none">
        <div className="space-y-3 p-3 md:hidden">
          {users.length === 0 && !loading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Không có người dùng nào
            </div>
          ) : (
            users.map((user) => (
              <article key={user.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <span className="text-sm font-semibold text-blue-700">
                        {user.fullName?.charAt(0)?.toUpperCase() || user.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.fullName || user.userName}</p>
                      <p className="truncate text-xs text-gray-500">@{user.userName}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(user.status)}`}>
                    {getStatusText(user.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-xs font-medium uppercase text-gray-500">Email</span>
                    <span className="min-w-0 truncate text-right text-gray-900">{user.email || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200 rounded-lg bg-gray-50 px-3 py-2">
                    <div className="min-w-0 pr-3">
                      <p className="text-[11px] font-semibold uppercase text-gray-500">SĐT</p>
                      <p className="mt-1 truncate font-medium text-gray-900">{user.phoneNumber || '-'}</p>
                    </div>
                    <div className="min-w-0 pl-3">
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Desk</p>
                      <p className="mt-1 truncate font-medium text-gray-900">{user.desk?.deskName || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-xs font-medium uppercase text-gray-500">Ngày tạo</span>
                    <span className="min-w-0 truncate text-right text-gray-900">{formatDate(user.createdOn)}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenQR(user)} className="w-full">
                    <QrCode className="h-4 w-4" />
                    QR
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(user)} className="w-full">
                    Sửa
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)} className="w-full text-red-600">
                    Xóa
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số điện thoại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Desk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    Không có người dùng nào
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleOpenQR(user)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Xem mã QR"
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.fullName?.charAt(0)?.toUpperCase() || user.userName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.fullName || user.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.userName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.phoneNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.desk ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.desk.deskName}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                        {getStatusText(user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdOn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>
        {/* Loading Indicator & Sentinel */}
        <div ref={observerTarget} className="py-4 text-center">
          {loading && <Loading />}
          {!hasNextPage && users.length > 0 && !loading && (
            <span className="text-sm text-gray-500">Đã tải hết dữ liệu</span>
          )}
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Đã chọn <span className="font-medium">{selectedUsers.length}</span> người dùng
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('activate')}
              >
                Kích hoạt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
              >
                Khóa
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBulkAction('delete')}
              >
                Xóa
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <UserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        user={editingUser}
        isLoading={modalLoading}
      />

      {/* QR Code Modal */}
      <UserQRModal
        isOpen={showQRModal}
        onClose={handleCloseQR}
        user={qrUser}
      />
    </div>
  );
};
