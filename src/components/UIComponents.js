import React from 'react';

/**
 * Shared Button component with consistent styling
 * Variants: primary, secondary, ghost, danger
 */
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  onClick, 
  disabled = false,
  type = 'button',
  className = '',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    secondary: 'bg-slate-700 text-white hover:bg-slate-800 focus:ring-slate-500',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Card component with consistent styling
 */
export const Card = ({ children, className = '', padding = 'normal', ...props }) => {
  const baseStyles = 'bg-slate-800 rounded-lg border border-slate-700';
  
  const paddings = {
    none: '',
    small: 'p-4',
    normal: 'p-6',
    large: 'p-8'
  };
  
  return (
    <div className={`${baseStyles} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Badge component for severity, confidence, status indicators
 */
export const Badge = ({ 
  children, 
  variant = 'default',
  size = 'medium',
  icon = null,
  className = '' 
}) => {
  const baseStyles = 'inline-flex items-center gap-1 font-medium rounded-md';
  
  const variants = {
    // Severity badges
    critical: 'bg-red-900/50 text-red-300 border border-red-700',
    risk: 'bg-orange-900/50 text-orange-300 border border-orange-700',
    informational: 'bg-blue-900/50 text-blue-300 border border-blue-700',
    
    // Confidence badges
    high: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
    medium: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
    low: 'bg-slate-700 text-slate-300 border border-slate-600',
    
    // Status badges
    open: 'bg-slate-700 text-slate-300 border border-slate-600',
    acknowledged: 'bg-blue-900/50 text-blue-300 border border-blue-700',
    'in-progress': 'bg-purple-900/50 text-purple-300 border border-purple-700',
    resolved: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
    ignored: 'bg-slate-700 text-slate-400 border border-slate-600',
    
    // Default
    default: 'bg-slate-700 text-slate-300 border border-slate-600'
  };
  
  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-3 py-1.5 text-base'
  };
  
  return (
    <span className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size]} ${className}`}>
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </span>
  );
};

/**
 * Progress bar component
 */
export const ProgressBar = ({ 
  progress = 0, 
  label = null,
  showPercentage = true,
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: 'bg-emerald-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  };
  
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-300">{label}</span>
          {showPercentage && (
            <span className="text-sm text-slate-400">{progress}%</span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${variants[variant]} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Empty state component
 */
export const EmptyState = ({ 
  icon = null,
  title,
  description,
  action = null,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4 text-slate-500">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-slate-400 mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
};

/**
 * Loading spinner component
 */
export const Spinner = ({ size = 'medium', className = '' }) => {
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };
  
  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg className="animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
};

/**
 * Modal component
 */
export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  footer = null,
  size = 'medium',
  className = ''
}) => {
  if (!isOpen) return null;
  
  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`relative bg-slate-800 rounded-lg border border-slate-700 shadow-2xl w-full ${sizes[size]} ${className}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
