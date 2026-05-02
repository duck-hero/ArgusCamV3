import React from 'react';

// Layout cho các trang authentication (login, register)
export const AuthLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img
            src="/logo-arguscam.png"
            alt="ArgusCam"
            className="mx-auto h-20 w-20 rounded-2xl object-contain shadow-sm"
          />
          <h2 className="mt-5 text-3xl font-bold text-gray-900">
            ArgusCam
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Giải pháp rõ ràng – Quyền lợi vững vàng
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          {children}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>&copy; 2026 ArgusCam. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
