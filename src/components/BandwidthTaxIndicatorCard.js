import React from 'react';

/**
 * Bandwidth Tax Indicator Card
 * Shows cognitive overload masked by responsiveness
 */
const BandwidthTaxIndicatorCard = ({ bti, showDetails = true }) => {
  if (!bti) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Bandwidth Tax Indicator</h2>
        <p className="text-slate-400">No BTI data available.</p>
      </div>
    );
  }

  const stateConfig = {
    'Low tax': { 
      color: 'green',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700',
      textColor: 'text-green-400',
      icon: '✓',
      description: 'Sustainable cognitive load'
    },
    'Moderate tax': { 
      color: 'yellow',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700',
      textColor: 'text-yellow-400',
      icon: '⚠️',
      description: 'Increasing capacity strain'
    },
    'Severe tax': { 
      color: 'red',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
      textColor: 'text-red-400',
      icon: '🔴',
      description: 'Decision quality at risk'
    }
  };

  const config = stateConfig[bti.state] || stateConfig['Low tax'];

  const severityColors = {
    'low': 'text-yellow-400',
    'medium': 'text-orange-400',
    'high': 'text-red-400'
  };

  return (
    <div className={`bg-slate-800 rounded-lg border ${config.borderColor} p-6 transition-all hover:border-opacity-80`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Bandwidth Tax</h2>
        <span className="text-2xl">{config.icon}</span>
      </div>

      {/* State Badge and Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`${config.bgColor} ${config.borderColor} border px-4 py-2 rounded-lg flex-1`}>
          <div className={`font-semibold ${config.textColor} mb-1`}>{bti.state}</div>
          <div className="text-xs text-slate-400">{config.description}</div>
        </div>
        <div className="text-3xl font-bold text-slate-100">
          {bti.bandwidthTaxScore}/100
        </div>
      </div>

      {showDetails && (
        <>
          {/* Triggers Detected */}
          {bti.triggers && bti.triggers.filter(t => t.detected).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Detected Triggers
              </h3>
              <div className="space-y-2">
                {bti.triggers.filter(t => t.detected).map((trigger, i) => (
                  <div 
                    key={i} 
                    className={`rounded-lg px-4 py-3 border ${
                      trigger.severity === 'high' 
                        ? 'bg-red-900/10 border-red-900/30' 
                        : trigger.severity === 'medium'
                        ? 'bg-orange-900/10 border-orange-900/30'
                        : 'bg-yellow-900/10 border-yellow-900/30'
                    }`}
                  >
                    <div className={`font-semibold mb-1 ${severityColors[trigger.severity]}`}>
                      {trigger.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {trigger.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="mb-4 bg-slate-900/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Key Metrics
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  Avg Response Time
                </span>
                <span className="font-semibold text-slate-100">
                  {bti.avgResponseTimeHours?.toFixed(1)} hrs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">⏰</span>
                  After-Hours Activity
                </span>
                <span className={`font-semibold ${bti.afterHoursActivityPercent > 30 ? 'text-red-400' : 'text-slate-100'}`}>
                  {bti.afterHoursActivityPercent?.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  Avg Focus Block
                </span>
                <span className={`font-semibold ${bti.avgFocusBlockMinutes < 60 ? 'text-red-400' : 'text-slate-100'}`}>
                  {bti.avgFocusBlockMinutes?.toFixed(0)} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">🔔</span>
                  Interruptions/Day
                </span>
                <span className={`font-semibold ${bti.interruptionsPerDay > 15 ? 'text-red-400' : 'text-slate-100'}`}>
                  {bti.interruptionsPerDay?.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Impact Indicators */}
          {bti.impactIndicators && Object.values(bti.impactIndicators).some(v => v) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Impact Risks
              </h3>
              <div className="space-y-2">
                {bti.impactIndicators.decisionQualityRisk && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <span>⚠️</span>
                    <span>Decision Quality at Risk</span>
                  </div>
                )}
                {bti.impactIndicators.sustainabilityRisk && (
                  <div className="flex items-center gap-2 text-orange-400 text-sm">
                    <span>⚠️</span>
                    <span>Sustainability at Risk</span>
                  </div>
                )}
                {bti.impactIndicators.burnoutRisk && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <span>⚠️</span>
                    <span>Capacity Risk Elevated</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {bti.recommendedActions && bti.recommendedActions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {bti.recommendedActions.map((action, i) => (
                  <div key={i} className="bg-blue-900/20 border border-blue-700 rounded-lg px-4 py-3">
                    <div className="font-semibold text-blue-400 mb-1">{action.action}</div>
                    {action.expectedEffect && (
                      <div className="text-xs text-slate-400 mb-1">{action.expectedEffect}</div>
                    )}
                    {action.reversibility && (
                      <div className="text-xs text-slate-500">🔄 {action.reversibility}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interpretation */}
          <div className="text-xs text-slate-500 leading-relaxed border-t border-slate-700 pt-3">
            {bti.interpretation || 
              "Bandwidth Tax reflects how much cognitive capacity is consumed by constant interruptions and urgency. High tax reduces decision quality even when output appears stable."}
          </div>
        </>
      )}
    </div>
  );
};

export default BandwidthTaxIndicatorCard;
