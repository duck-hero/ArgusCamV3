import React, { useState, useEffect } from 'react';
import { User, Settings, Monitor, Eye, EyeOff, Save, Camera as CameraIcon } from 'lucide-react';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { Card } from '../../components/Card.jsx';
import { accountApi } from '../../api/accountApi.js';
import { useToast } from '../../components/Toast.jsx';

// User profile page
export const ProfilePage = () => {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userData, setUserData] = useState({
    // Thông tin cá nhân
    id: '',
    username: '', // userName from API
    fullName: '',
    email: '',
    phone: '', // phoneNumber from API
    role: '', // derived from roles
    // department: 'Software Development', // Mock mainly, unless API provides - REMOVED
    // location: 'Vietnam', - REMOVED
    // bio: 'Software Engineer', // Mock - REMOVED

    // Cài đặt tài khoản
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',

    // Cài đặt giao diện
    theme: 'light',
    language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  });




  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await accountApi.getProfile();
        if (response && response.content) {
          const data = response.content;
          setUserData(prev => ({
            ...prev,
            id: data.id,
            username: data.userName,
            fullName: data.fullName,
            email: data.email,
            phone: data.phoneNumber || '',
            role: data.roles && data.roles.length > 0 ? data.roles[0] : 'User',
            // Keep other settings as per current state or defaults
          }));
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        toastError("Không thể tải thông tin hồ sơ");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const payload = {
        fullName: userData.fullName,
        phoneNumber: userData.phone
      };
      await accountApi.updateProfile(payload);
      success('Thông tin cá nhân đã được cập nhật thành công!');
    } catch (error) {
      console.error(error);
      toastError(error.response?.data?.err || 'Cập nhật thất bại');
    }
  };

  const handleChangePassword = async () => {
    if (userData.newPassword !== userData.confirmPassword) {
      toastError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    if (userData.newPassword.length < 6) {
      toastError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      const payload = {
        currentPassword: userData.currentPassword,
        newPassword: userData.newPassword
      };
      await accountApi.changePassword(payload);

      success('Mật khẩu đã được thay đổi thành công!');
      setUserData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error(error);
      toastError(error.response?.data?.err || 'Đổi mật khẩu thất bại');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Thông tin cá nhân', icon: User },
    { id: 'account', label: 'Cài đặt tài khoản', icon: Settings },
    { id: 'interface', label: 'Giao diện', icon: Monitor },
  ];

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar và thông tin cơ bản */}
      <Card>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-12 w-12 text-gray-600" />
            </div>
            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
              <CameraIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{userData.fullName || 'User'}</h3>
            <p className="text-sm text-gray-500">{userData.role}</p>
            {/* <p className="text-sm text-gray-500">{userData.department}</p> */} {/* REMOVED */}
            <span className="mt-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Hoạt động
            </span>
          </div>
          <Button variant="outline" size="sm">
            Chỉnh sửa
          </Button>
        </div>
      </Card>

      {/* Form thông tin cá nhân */}
      <Card>
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Thông tin cá nhân</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tên đăng nhập"
              value={userData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled
            />
            <Input
              label="Họ và tên"
              value={userData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={userData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled
            />
            <Input
              label="Số điện thoại"
              value={userData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
            <Input
              label="Vai trò"
              value={userData.role}
              disabled
            />
            {/* <Input
              label="Phòng ban"
              value={userData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
            /> */} {/* REMOVED */}
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <textarea
              value={userData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div> */} {/* REMOVED */}

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giới thiệu
            </label>
            <textarea
              value={userData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div> */} {/* REMOVED */}

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile}>
              <Save className="h-4 w-4 mr-2" />
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Thay đổi mật khẩu</h4>

          <Input
            label="Mật khẩu hiện tại"
            type={showPassword ? 'text' : 'password'}
            value={userData.currentPassword}
            onChange={(e) => handleInputChange('currentPassword', e.target.value)}
            icon={showPassword ? EyeOff : Eye}
            onIconClick={() => setShowPassword(!showPassword)}
          />

          <Input
            label="Mật khẩu mới"
            type={showPassword ? 'text' : 'password'}
            value={userData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
          />

          <Input
            label="Xác nhận mật khẩu mới"
            type={showPassword ? 'text' : 'password'}
            value={userData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          />

          <div className="flex justify-end">
            <Button onClick={handleChangePassword}>
              Thay đổi mật khẩu
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderInterfaceTab = () => (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Giao diện và hiển thị</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giao diện
              </label>
              <select
                value={userData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
                <option value="auto">Tự động</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngôn ngữ
              </label>
              <select
                value={userData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Múi giờ
              </label>
              <select
                value={userData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Định dạng ngày
              </label>
              <select
                value={userData.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Định dạng thời gian
              </label>
              <select
                value={userData.timeFormat}
                onChange={(e) => handleInputChange('timeFormat', e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="24h">24 giờ</option>
                <option value="12h">12 giờ (AM/PM)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Lưu cài đặt
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );


  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'account':
        return renderAccountTab();
      case 'interface':
        return renderInterfaceTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col lg:flex-row lg:space-x-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <Card className="p-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-l-lg transition-colors ${activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center py-10">Đang tải thông tin...</div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  );
};
