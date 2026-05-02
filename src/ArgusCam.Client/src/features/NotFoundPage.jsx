import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button.jsx';

// 404 Not Found page
export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div className="max-w-max mx-auto">
        <main className="sm:flex">
          <p className="text-4xl font-extrabold text-blue-600 sm:text-5xl">404</p>
          <div className="sm:ml-6">
            <div className="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                Trang không tìm thấy
              </h1>
              <p className="mt-1 text-base text-gray-500">
                Vui lòng kiểm tra lại URL hoặc quay về trang chủ.
              </p>
            </div>
            <div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
              <Button
                onClick={() => navigate('/dashboard')}
                icon={Home}
              >
                Về trang chủ
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                icon={ArrowLeft}
              >
                Quay lại
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
