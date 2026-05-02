import React from 'react';

// Badge component cho status indicators
export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  color = 'blue',
  outline = false,
  dot = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  // Base classes cho badge
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  // Variant classes
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    solid: `bg-${color}-600 text-white`,
    outline: `border border-${color}-600 text-${color}-600 bg-transparent`,
    ghost: `text-${color}-600 bg-${color}-50`,
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };
  
  // Color classes for solid variant
  const colorClasses = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    red: 'bg-red-600 text-white',
    yellow: 'bg-yellow-600 text-white',
    purple: 'bg-purple-600 text-white',
    gray: 'bg-gray-600 text-white',
    orange: 'bg-orange-600 text-white',
    pink: 'bg-pink-600 text-white',
    indigo: 'bg-indigo-600 text-white',
    teal: 'bg-teal-600 text-white',
  };
  
  // Outline color classes
  const outlineClasses = {
    blue: 'border border-blue-600 text-blue-600 bg-transparent',
    green: 'border border-green-600 text-green-600 bg-transparent',
    red: 'border border-red-600 text-red-600 bg-transparent',
    yellow: 'border border-yellow-600 text-yellow-600 bg-transparent',
    purple: 'border border-purple-600 text-purple-600 bg-transparent',
    gray: 'border border-gray-600 text-gray-600 bg-transparent',
    orange: 'border border-orange-600 text-orange-600 bg-transparent',
    pink: 'border border-pink-600 text-pink-600 bg-transparent',
    indigo: 'border border-indigo-600 text-indigo-600 bg-transparent',
    teal: 'border border-teal-600 text-teal-600 bg-transparent',
  };
  
  // Ghost color classes
  const ghostClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    purple: 'text-purple-600 bg-purple-50',
    gray: 'text-gray-600 bg-gray-50',
    orange: 'text-orange-600 bg-orange-50',
    pink: 'text-pink-600 bg-pink-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    teal: 'text-teal-600 bg-teal-50',
  };

  let variantClass;
  if (variant === 'solid') {
    variantClass = colorClasses[color] || colorClasses.blue;
  } else if (variant === 'outline') {
    variantClass = outlineClasses[color] || outlineClasses.blue;
  } else if (variant === 'ghost') {
    variantClass = ghostClasses[color] || ghostClasses.blue;
  } else {
    variantClass = variantClasses[variant] || variantClasses.default;
  }

  const classes = `
    ${baseClasses} 
    ${variantClass} 
    ${sizeClasses[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <span className={classes} {...props}>
      {dot && (
        <span className={`w-2 h-2 rounded-full mr-1.5 ${
          variant === 'solid' 
            ? 'bg-white' 
            : variant === 'outline' || variant === 'ghost'
            ? `bg-${color}-600`
            : 'bg-gray-600'
        }`} />
      )}
      {Icon && !dot && (
        <Icon className="w-3 h-3 mr-1.5" />
      )}
      {children}
    </span>
  );
};

// Status Badge component với predefined statuses
export const StatusBadge = ({
  status,
  size = 'md',
  className = '',
  ...props
}) => {
  const statusConfig = {
    active: { color: 'green', text: 'Hoạt động', dot: true },
    inactive: { color: 'red', text: 'Không hoạt động', dot: true },
    online: { color: 'green', text: 'Trực tuyến', dot: true },
    offline: { color: 'gray', text: 'Ngoại tuyến', dot: true },
    pending: { color: 'yellow', text: 'Chờ xử lý', dot: true },
    completed: { color: 'blue', text: 'Hoàn thành', dot: true },
    cancelled: { color: 'red', text: 'Đã hủy', dot: true },
    maintenance: { color: 'orange', text: 'Bảo trì', dot: true },
    error: { color: 'red', text: 'Lỗi', dot: true },
    warning: { color: 'yellow', text: 'Cảnh báo', dot: true },
    success: { color: 'green', text: 'Thành công', dot: true },
    processing: { color: 'blue', text: 'Đang xử lý', dot: true },
    shipped: { color: 'purple', text: 'Đã giao', dot: true },
    delivered: { color: 'green', text: 'Đã nhận', dot: true },
    returned: { color: 'orange', text: 'Trả hàng', dot: true },
  };

  const config = statusConfig[status] || { 
    color: 'gray', 
    text: status, 
    dot: true 
  };

  return (
    <Badge
      variant="solid"
      color={config.color}
      size={size}
      dot={config.dot}
      className={className}
      {...props}
    >
      {config.text}
    </Badge>
  );
};

// Role Badge component cho user roles
export const RoleBadge = ({
  role,
  size = 'md',
  className = '',
  ...props
}) => {
  const roleConfig = {
    admin: { color: 'purple', text: 'Admin' },
    manager: { color: 'blue', text: 'Manager' },
    user: { color: 'green', text: 'User' },
    viewer: { color: 'gray', text: 'Viewer' },
    operator: { color: 'orange', text: 'Operator' },
    moderator: { color: 'indigo', text: 'Moderator' },
  };

  const config = roleConfig[role.toLowerCase()] || { 
    color: 'gray', 
    text: role 
  };

  return (
    <Badge
      variant="solid"
      color={config.color}
      size={size}
      className={className}
      {...props}
    >
      {config.text}
    </Badge>
  );
};
