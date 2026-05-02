import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { X, Home, Package, Users, Camera, LogOut, MonitorCog, Map, ChevronLeft, ChevronRight, Settings, ScanBarcode } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { ROUTES } from '../constants/routes.js';

export const Sidebar = ({ onClose, isCollapsed = false, onToggleCollapse, isMobile = false }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const mockUser = {
    role: 'Admin',
    fullName: 'Người dùng thử',
    username: 'testuser',
  };

  const currentUser = user || mockUser;

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const navItems = [
    {
      name: 'Tổng quan',
      href: '/dashboard',
      icon: Home,
      roles: ['User', 'Admin'],
    },
    {
      name: 'Quản lý đơn hàng',
      href: ROUTES.ORDERS,
      icon: Package,
      roles: ['User', 'Admin'],
    },
    {
      name: 'Quét đơn hàng',
      href: ROUTES.SCANNER,
      icon: ScanBarcode,
      roles: ['User', 'Admin'],
    },
  ];

  const adminNavItems = [
    {
      name: 'Quản lý người dùng',
      href: ROUTES.USERS,
      icon: Users,
      roles: ['Admin'],
    },
    {
      name: 'Quản lý camera',
      href: ROUTES.CAMERAS,
      icon: Camera,
      roles: ['Admin'],
    },
    {
      name: 'Quản lý bàn',
      href: ROUTES.DESKS,
      icon: MonitorCog,
      roles: ['Admin'],
    },
    {
      name: 'Sơ đồ camera',
      href: ROUTES.MAP,
      icon: Map,
      roles: ['Admin'],
    },
    {
      name: 'Cài đặt',
      href: ROUTES.SETTINGS,
      icon: Settings,
      roles: ['Admin'],
    },
  ];

  const allNavItems = [...navItems, ...adminNavItems];

  const filteredNavItems = allNavItems.filter((item) => {
    if (!currentUser?.role) return true;
    return item.roles.includes(currentUser.role);
  });

  const displayNavItems = filteredNavItems.length > 0 ? filteredNavItems : allNavItems;

  const isActive = (href) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  return (
    <div className={`relative flex h-full flex-col bg-gray-950 transition-all duration-300 ${isCollapsed && !isMobile ? 'w-20' : 'w-full'}`}>
      {!isMobile && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 z-50 flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-800 p-1.5 text-gray-400 shadow-lg transition-colors hover:bg-gray-700 hover:text-white"
          title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      )}

      <div className={`flex h-16 items-center bg-gray-900 ${isCollapsed && !isMobile ? 'justify-center px-0' : 'justify-between px-4'}`}>
        <div className={`flex items-center ${isCollapsed && !isMobile ? 'w-full justify-center' : ''}`}>
          <img
            src="/logo-arguscam.png"
            alt="ArgusCam"
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          {(!isCollapsed || isMobile) && <span className="ml-3 font-semibold text-white transition-opacity duration-300">ArgusCam</span>}
        </div>

        {onClose && isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {displayNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={isMobile ? onClose : undefined}
              title={isCollapsed && !isMobile ? item.name : undefined}
              className={`
                group relative flex min-h-11 items-center rounded-lg py-2 text-sm font-medium transition-colors
                ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-3'}
              `}
            >
              <Icon className={`h-5 w-5 shrink-0 ${(!isCollapsed || isMobile) && 'mr-3'}`} />
              {(!isCollapsed || isMobile) && <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-2">
        <button
          type="button"
          onClick={handleLogout}
          title={isCollapsed && !isMobile ? 'Đăng xuất' : undefined}
          className={`flex min-h-11 w-full items-center rounded-lg py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white ${isCollapsed && !isMobile ? 'justify-center px-0' : 'px-3'}`}
        >
          <LogOut className={`h-5 w-5 shrink-0 ${(!isCollapsed || isMobile) && 'mr-3'}`} />
          {(!isCollapsed || isMobile) && 'Đăng xuất'}
        </button>
      </div>
    </div>
  );
};
