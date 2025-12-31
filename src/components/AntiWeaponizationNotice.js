import React from 'react';

/**
 * Anti-Weaponization Notice
 * REQUIRED persistent warning on all insight views
 */
const AntiWeaponizationNotice = ({ variant = 'default' }) => {
  const variants = {
    default: {
      bg: 'bg-yellow-900/20',
      border: 'border-yellow-700',
      text: 'text-yellow-300',
      icon: '⚠️'
    },
    info: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-700',
      text: 'text-blue-300',
      icon: 'ℹ️'
    },
    sticky: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-700',
      text: 'text-yellow-200',
      icon: '⚠️'
    }
  };

  const config = variants[variant] || variants.default;

  const isSticky = variant === 'sticky';

  return (
    <div 
      className={`${config.bg} border ${config.border} rounded-lg p-4 mb-6 ${
        isSticky ? 'sticky top-0 z-50 shadow-lg backdrop-blur-sm bg-opacity-95' : ''
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1">
          <p className={`${config.text} font-semibold mb-1`}>
            Important: Usage Guidelines
          </p>
          <p className={`${config.text} text-sm leading-relaxed`}>
            SignalTrue insights are designed for early detection and system improvement. 
            They should <strong>not</strong> be used for individual performance evaluation, 
            rankings, or surveillance. All metrics are team-level aggregated.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AntiWeaponizationNotice;
