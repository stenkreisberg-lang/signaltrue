import React from 'react';

/**
 * Capacity Status Card (Enhanced with Driver Explanations)
 * Shows capacity status with drivers and one-sentence explanation
 */
const CapacityStatusCard = ({ capacity, showDetails = true }) => {
  if (!capacity) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Capacity Status</h2>
        <p className="text-slate-400">No capacity data available.</p>
      </div>
    );
  }

  const statusConfig = {
    'Green': { 
      color: 'green',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700',
      textColor: 'text-green-400',
      icon: '✓'
    },
    'Yellow': { 
      color: 'yellow',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700',
      textColor: 'text-yellow-400',
      icon: '⚠️'
    },
    'Red': { 
      color: 'red',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
      textColor: 'text-red-400',
      icon: '🔴'
    }
  };

  const config = statusConfig[capacity.status] || statusConfig['Green'];

  const trendConfig = {
    'improving': { icon: '↗', color: 'text-green-400' },
    'stable': { icon: '→', color: 'text-slate-400' },
    'declining': { icon: '↘', color: 'text-red-400' }
  };

  const trend = trendConfig[capacity.deviation?.trend] || trendConfig['stable'];

  return (
    <div className={`bg-slate-800 rounded-lg border ${config.borderColor} p-6 transition-all hover:border-opacity-80`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Capacity Status</h2>
        <span className="text-2xl">{config.icon}</span>
      </div>

      {/* Status Badge and Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`${config.bgColor} ${config.borderColor} border px-4 py-2 rounded-lg`}>
          <span className={`font-semibold ${config.textColor}`}>{capacity.status}</span>
        </div>
        <div className="text-3xl font-bold text-slate-100">
          {capacity.capacityScore}/100
        </div>
        {capacity.deviation && (
          <div className={`text-lg ${trend.color}`}>
            {trend.icon}
          </div>
        )}
      </div>

      {/* ONE-SENTENCE EXPLANATION (CRITICAL - ALWAYS SHOW) */}
      {capacity.explanation && (
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <p className="text-slate-200 leading-relaxed">
            {capacity.explanation}
          </p>
        </div>
      )}

      {showDetails && (
        <>
          {/* Drivers (CRITICAL - ALWAYS SHOW) */}
          {capacity.drivers && capacity.drivers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Capacity Drivers
              </h3>
              <div className="space-y-2">
                {capacity.drivers.map((driver, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between rounded px-3 py-2 ${
                      driver.direction === 'negative' 
                        ? 'bg-red-900/10 border border-red-900/30' 
                        : 'bg-green-900/10 border border-green-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{driver.icon}</span>
                      <span className="text-slate-300">{driver.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={driver.direction === 'negative' ? 'text-red-400' : 'text-green-400'}>
                        {driver.direction === 'negative' ? '↓' : '↑'}
                      </span>
                      <span className="font-semibold text-slate-300">
                        {driver.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Baseline Deviation */}
          {capacity.baseline && capacity.deviation && (
            <div className="mb-4 bg-slate-900/30 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Change from baseline:</span>
                <span className={`font-semibold ${
                  capacity.deviation.absolute > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {capacity.deviation.absolute > 0 ? '+' : ''}{capacity.deviation.absolute?.toFixed(0)} points
                </span>
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {capacity.recommendedActions && capacity.recommendedActions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {capacity.recommendedActions.map((action, i) => (
                  <div key={i} className="bg-blue-900/20 border border-blue-700 rounded-lg px-4 py-2">
                    <div className="font-semibold text-blue-400 text-sm">{action.action}</div>
                    {action.expectedEffect && (
                      <div className="text-xs text-slate-400 mt-1">{action.expectedEffect}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {capacity.warnings && capacity.warnings.length > 0 && (
            <div className="mb-4">
              {capacity.warnings.map((warning, i) => (
                <div 
                  key={i} 
                  className={`rounded-lg px-3 py-2 mb-2 ${
                    warning.severity === 'critical' 
                      ? 'bg-red-900/20 border border-red-700 text-red-400' 
                      : warning.severity === 'warning'
                      ? 'bg-yellow-900/20 border border-yellow-700 text-yellow-400'
                      : 'bg-blue-900/20 border border-blue-700 text-blue-400'
                  }`}
                >
                  <span className="text-sm">{warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Interpretation */}
          <div className="text-xs text-slate-500 leading-relaxed border-t border-slate-700 pt-3">
            {capacity.interpretation || 
              "Capacity reflects the team's ability to sustain current workload without long-term strain. Changes are driven by observable working patterns, not self-reported sentiment."}
          </div>
        </>
      )}
    </div>
  );
};

export default CapacityStatusCard;
