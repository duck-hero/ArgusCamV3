import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { Sidebar } from '../components/Sidebar.jsx';

// Main layout với navbar và sidebar
export const MainLayout = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });
  const { user } = useAuth();
  const location = useLocation();
  const isScannerPage = location.pathname.startsWith('/scan');

  const toggleDesktopSidebar = () => {
    const newState = !desktopSidebarCollapsed;
    setDesktopSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className={`fixed inset-0 z-40 lg:hidden ${mobileSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/60 transition-opacity" onClick={() => setMobileSidebarOpen(false)} />
        <div className="relative flex h-full w-[min(20rem,86vw)] flex-col bg-white shadow-xl">
          <Sidebar onClose={() => setMobileSidebarOpen(false)} isMobile={true} />
        </div>
      </div>

      <div className={`hidden transition-all duration-300 lg:fixed lg:inset-y-0 lg:z-40 lg:flex ${desktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex h-full w-full flex-col">
          <Sidebar
            isCollapsed={desktopSidebarCollapsed}
            onToggleCollapse={toggleDesktopSidebar}
          />
        </div>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${desktopSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Navbar onMenuClick={() => setMobileSidebarOpen(true)} user={user} />

        <main className="w-full flex-1 overflow-x-hidden">
          <div className={isScannerPage ? 'px-3 py-3 sm:px-6 sm:py-5 lg:px-8' : 'px-4 py-5 sm:px-6 sm:py-6 lg:px-8'}>
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};
