import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

// Alert component với nhiều variants và styling options
export const Alert = ({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon: CustomIcon,
  className = '',
  ...props
}) => {
  // Variant configurations
  const variantConfig = {
    success: {
      containerClass: 'bg-green-50 border-green-200 text-green-800',
      iconClass: 'text-green-600',
      Icon: CheckCircle,
    },
    error: {
      containerClass: 'bg-red-50 border-red-200 text-red-800',
      iconClass: 'text-red-600',
      Icon: XCircle,
    },
    warning: {
      containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      iconClass: 'text-yellow-600',
      Icon: AlertCircle,
    },
    info: {
      containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
      iconClass: 'text-blue-600',
      Icon: Info,
    },
  };

  const config = variantConfig[variant] || variantConfig.info;
  const Icon = CustomIcon || config.Icon;

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      className={`
        border border-l-4 p-4 rounded-lg
        ${config.containerClass}
        ${className}
      `}
      {...props}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconClass}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          {children && (
            <div className="text-sm">
              {children}
            </div>
          )}
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleDismiss}
                className={`
                  inline-flex rounded-md p-1.5 
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${config.iconClass}
                  hover:bg-opacity-20 hover:bg-current
                `}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Toast component cho notifications
export const Toast = ({
  variant = 'info',
  title,
  message,
  duration = 5000,
  dismissible = true,
  onDismiss,
  position = 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  className = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0 && dismissible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, dismissible]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto
        ring-1 ring-black ring-opacity-5 overflow-hidden
        ${positionClasses[position]}
        ${className}
      `}
      {...props}
    >
      <Alert
        variant={variant}
        title={title}
        dismissible={dismissible}
        onDismiss={handleDismiss}
        className="shadow-none border-0 rounded-none"
      >
        {message}
      </Alert>
    </div>
  );
};

// Toast Container component
export const ToastContainer = ({
  toasts = [],
  position = 'top-right',
  onDismiss,
  className = '',
  ...props
}) => {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 flex flex-col space-y-2 ${positionClasses[position]}`}
      {...props}
    >
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          dismissible={toast.dismissible !== false}
          onDismiss={() => onDismiss && onDismiss(toast.id || index)}
          position={position}
          className="transform transition-all duration-300 ease-in-out"
        />
      ))}
    </div>
  );
};

// Alert Group component cho multiple alerts
export const AlertGroup = ({
  alerts = [],
  className = '',
  ...props
}) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {alerts.map((alert, index) => (
        <Alert
          key={alert.id || index}
          variant={alert.variant}
          title={alert.title}
          dismissible={alert.dismissible}
          onDismiss={alert.onDismiss}
        >
          {alert.children}
        </Alert>
      ))}
    </div>
  );
};

// Inline Alert component cho forms
export const InlineAlert = ({
  variant = 'error',
  children,
  className = '',
  ...props
}) => {
  const variantConfig = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
    success: 'text-green-600',
    info: 'text-blue-600',
  };

  const iconConfig = {
    error: XCircle,
    warning: AlertCircle,
    success: CheckCircle,
    info: Info,
  };

  const Icon = iconConfig[variant];

  return (
    <div className={`flex items-start space-x-2 ${className}`} {...props}>
      <Icon className={`h-4 w-4 mt-0.5 ${variantConfig[variant]}`} />
      <span className={`text-sm ${variantConfig[variant]}`}>
        {children}
      </span>
    </div>
  );
};

// Confirmation Dialog component
export const ConfirmationDialog = ({
  isOpen,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  onConfirm,
  onCancel,
  className = '',
  ...props
}) => {
  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const buttonVariantConfig = {
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div
          className={`
            inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full
            ${className}
          `}
          {...props}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`
                w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm
                ${buttonVariantConfig[variant]}
              `}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={handleCancel}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
