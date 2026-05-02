import React from 'react';
import { Loader2 } from 'lucide-react';

// Loading component với nhiều variants
export const Loading = ({
  size = 'md',
  variant = 'spinner',
  text = 'Đang tải...',
  overlay = false,
  className = '',
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  // Text size classes
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Variant classes
  const variantClasses = {
    spinner: 'animate-spin',
    dots: 'flex space-x-1',
    pulse: 'animate-pulse',
  };

  const baseClasses = 'flex items-center justify-center';
  const overlayClasses = overlay 
    ? 'fixed inset-0 bg-white bg-opacity-75 z-50' 
    : '';

  const classes = `
    ${baseClasses} 
    ${overlayClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const renderSpinner = () => (
    <div className={`flex items-center space-x-2 ${text ? 'space-x-3' : ''}`}>
      <Loader2 className={`${sizeClasses[size]} text-blue-600 ${variantClasses[variant]}`} />
      {text && <span className={`${textSizeClasses[size]} text-gray-600`}>{text}</span>}
    </div>
  );

  const renderDots = () => (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s',
            }}
          />
        ))}
      </div>
      {text && <span className={`${textSizeClasses[size]} text-gray-600`}>{text}</span>}
    </div>
  );

  const renderPulse = () => (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${sizeClasses[size]} bg-gray-300 rounded`}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1.5s',
            }}
          />
        ))}
      </div>
      {text && <span className={`${textSizeClasses[size]} text-gray-600`}>{text}</span>}
    </div>
  );

  const content = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  if (overlay) {
    return (
      <div className={classes} {...props}>
        {content()}
      </div>
    );
  }

  return (
    <div className={classes} {...props}>
      {content()}
    </div>
  );
};

// Loading Button component
export const LoadingButton = ({
  children,
  loading = false,
  loadingText = 'Đang xử lý...',
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        loading ? 'opacity-75' : ''
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {loading ? loadingText : children}
    </button>
  );
};

// Loading Overlay component
export const LoadingOverlay = ({
  text = 'Đang tải...',
  className = '',
  ...props
}) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
};

// Loading Skeleton component
export const LoadingSkeleton = ({
  variant = 'text',
  width = 'full',
  height = 'md',
  lines = 1,
  className = '',
  ...props
}) => {
  // Width classes
  const widthClasses = {
    sm: 'w-16',
    md: 'w-32',
    lg: 'w-48',
    xl: 'w-64',
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/4': 'w-1/4',
  };

  // Height classes
  const heightClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-6',
    xl: 'h-8',
  };

  // Variant classes
  const variantClasses = {
    text: 'bg-gray-200 rounded',
    avatar: 'bg-gray-200 rounded-full',
    button: 'bg-gray-200 rounded',
    card: 'bg-gray-200 rounded-lg',
    image: 'bg-gray-200 rounded',
  };

  const classes = `
    ${variantClasses[variant]} 
    ${widthClasses[width]} 
    ${heightClasses[height]}
    animate-pulse
    ${className}
  `.trim().replace(/\s+/g, ' ');

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {[...Array(lines)].map((_, index) => (
          <div
            key={index}
            className={`${variantClasses[variant]} ${widthClasses[index === lines - 1 ? '3/4' : width]} ${heightClasses[height]}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={classes} {...props} />
  );
};

// Loading Table component
export const LoadingTable = ({
  columns = 4,
  rows = 5,
  className = '',
  ...props
}) => {
  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`} {...props}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {[...Array(columns)].map((_, index) => (
            <LoadingSkeleton key={index} variant="text" width="full" height="md" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-gray-200">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {[...Array(columns)].map((_, colIndex) => (
              <LoadingSkeleton key={colIndex} variant="text" width="full" height="sm" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Loading Card component
export const LoadingCard = ({
  className = '',
  ...props
}) => {
  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`} {...props}>
      <div className="p-6">
        <LoadingSkeleton variant="text" width="3/4" height="lg" className="mb-4" />
        <LoadingSkeleton variant="text" width="full" height="md" className="mb-2" />
        <LoadingSkeleton variant="text" width="full" height="md" className="mb-2" />
        <LoadingSkeleton variant="text" width="1/2" height="md" />
      </div>
    </div>
  );
};
