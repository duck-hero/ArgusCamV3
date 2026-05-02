import React from 'react';

// Card component với nhiều variants và styling options
export const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'sm',
  border = false,
  className = '',
  header,
  footer,
  onClick,
  interactive = false,
  ...props
}) => {
  // Base classes cho card
  const baseClasses = 'bg-white rounded-lg overflow-hidden';

  // Variant classes
  const variantClasses = {
    default: 'border border-gray-200',
    elevated: 'shadow-lg',
    outlined: 'border-2 border-gray-200',
    ghost: 'bg-transparent border border-gray-200',
  };

  // Padding classes
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Shadow classes
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  // Interactive classes
  const interactiveClasses = interactive
    ? 'hover:shadow-lg transition-shadow duration-200 cursor-pointer'
    : '';

  const borderClasses = border ? 'border border-gray-200' : '';

  const classes = `
    ${baseClasses} 
    ${variantClasses[variant]} 
    ${paddingClasses[padding]} 
    ${shadowClasses[shadow]} 
    ${borderClasses}
    ${interactiveClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleClick = (e) => {
    if (onClick && interactive) {
      onClick(e);
    }
  };

  return (
    <div
      className={classes}
      onClick={handleClick}
      {...props}
    >
      {header && (
        <div className="border-b border-gray-200 px-6 py-4">
          {header}
        </div>
      )}

      <div className={paddingClasses[padding]}>
        {children}
      </div>

      {footer && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

// Stats Card component cho dashboard
export const StatsCard = ({
  title,
  value,
  change,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  icon: Icon,
  color = 'blue',
  loading = false,
  className = '',
  ...props
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    purple: 'text-purple-600 bg-purple-100',
    gray: 'text-gray-600 bg-gray-100',
  };

  const changeClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const formatChange = (change) => {
    if (typeof change === 'number') {
      return change > 0 ? `+${change}%` : `${change}%`;
    }
    return change;
  };

  return (
    <Card className={`${className}`} {...props}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {Icon && <Icon className="h-6 w-6" />}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                <div className="text-2xl font-semibold text-gray-900">
                  {value}
                </div>
              )}
              {change && !loading && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${changeClasses[changeType]}`}>
                  {changeType === 'positive' && '↗'}
                  {changeType === 'negative' && '↘'}
                  {changeType === 'neutral' && '→'}
                  <span className="ml-1">{formatChange(change)}</span>
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </Card>
  );
};

// Metric Card component cho dashboard
export const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  loading = false,
  className = '',
  ...props
}) => {
  return (
    <Card className={`${className}`} {...props}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded mt-1"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          )}
          {subtitle && !loading && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {trend && !loading && (
          <div className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </Card>
  );
};
