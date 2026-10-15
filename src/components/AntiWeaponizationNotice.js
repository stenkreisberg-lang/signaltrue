import React from 'react';

/**
 * Anti-Weaponization Notice
 * REQUIRED persistent warning on all insight views
 */
const AntiWeaponizationNotice = ({ variant = 'default' }) => {
  const variants = {
    default: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-950',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-950',
      icon: 'ℹ️',
    },
    sticky: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-950',
      icon: '⚠️',
    },
  };

  const config = variants[variant] || variants.default;

  const isSticky = variant === 'sticky';

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-control p-4 mb-6 ${
        isSticky ? 'shadow-sm' : ''
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-lead flex-shrink-0">{config.icon}</span>
        <div className="flex-1">
          <p className={`${config.text} font-semibold mb-1`}>Important: Usage Guidelines</p>
          <p className={`${config.text} text-caption leading-relaxed`}>
            SignalTrue insights are designed for early observation and system improvement. They
            should <strong>not</strong> be used for individual performance evaluation, rankings, or
            surveillance. All metrics are team-level aggregated.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AntiWeaponizationNotice;
