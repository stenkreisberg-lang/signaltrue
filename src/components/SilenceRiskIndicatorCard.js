import React from 'react';

/**
 * Silence Risk Indicator Card
 * Shows reduced voice and communication friction patterns
 */
const SilenceRiskIndicatorCard = ({ sri, showDetails = true }) => {
  if (!sri) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Silence Risk Indicator</h2>
        <p className="text-slate-400">No SRI data available.</p>
      </div>
    );
  }

  const stateConfig = {
    'Low Silence Risk': { 
      color: 'green',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700',
      textColor: 'text-green-400',
      icon: '✓',
      description: 'Healthy communication patterns'
    },
    'Rising Silence Risk': { 
      color: 'yellow',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700',
      textColor: 'text-yellow-400',
      icon: '⚠️',
      description: 'Early signs of withdrawal'
    },
    'High Silence Risk': { 
      color: 'red',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
      textColor: 'text-red-400',
      icon: '🔴',
      description: 'Significant reduction in voice'
    }
  };

  const config = stateConfig[sri.state] || stateConfig['Low Silence Risk'];

  const severityColors = {
    'low': 'text-yellow-400',
    'medium': 'text-orange-400',
    'high': 'text-red-400'
  };

  return (
    <div className={`bg-slate-800 rounded-lg border ${config.borderColor} p-6 transition-all hover:border-opacity-80`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Silence Risk</h2>
        <span className="text-2xl">{config.icon}</span>
      </div>

      {/* State Badge and Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`${config.bgColor} ${config.borderColor} border px-4 py-2 rounded-lg flex-1`}>
          <div className={`font-semibold ${config.textColor} mb-1`}>{sri.state}</div>
          <div className="text-xs text-slate-400">{config.description}</div>
        </div>
        <div className="text-3xl font-bold text-slate-100">
          {sri.silenceRiskScore}/100
        </div>
      </div>

      {showDetails && (
        <>
          {/* Proxies Detected */}
          {sri.proxies && sri.proxies.filter(p => p.detected).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Detected Proxies
              </h3>
              <div className="space-y-2">
                {sri.proxies.filter(p => p.detected).map((proxy, i) => (
                  <div 
                    key={i} 
                    className={`rounded-lg px-4 py-3 border ${
                      proxy.severity === 'high' 
                        ? 'bg-red-900/10 border-red-900/30' 
                        : proxy.severity === 'medium'
                        ? 'bg-orange-900/10 border-orange-900/30'
                        : 'bg-yellow-900/10 border-yellow-900/30'
                    }`}
                  >
                    <div className={`font-semibold mb-1 ${severityColors[proxy.severity]}`}>
                      {proxy.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {proxy.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Metrics */}
          <div className="mb-4 bg-slate-900/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Communication Metrics
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  Async Contributions
                </span>
                <span className="font-semibold text-slate-100">
                  {sri.asyncContributionCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">🤝</span>
                  Unique Collaborators
                </span>
                <span className="font-semibold text-slate-100">
                  {sri.uniqueCollaborators}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">⬆️</span>
                  Upward Response Time
                </span>
                <span className="font-semibold text-slate-100">
                  {sri.upwardResponseTimeHours?.toFixed(1)} hrs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  Sentiment Variance
                </span>
                <span className="font-semibold text-slate-100">
                  {(sri.sentimentVariance * 100)?.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Deviation Metrics */}
          {sri.deviation && sri.baseline && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Changes from Baseline
              </h3>
              <div className="space-y-2 bg-slate-900/30 rounded-lg p-3">
                {sri.deviation.asyncContributionChange !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Contributions:</span>
                    <span className={`font-semibold ${
                      sri.deviation.asyncContributionChange < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {sri.deviation.asyncContributionChange > 0 ? '+' : ''}{sri.deviation.asyncContributionChange?.toFixed(0)}%
                    </span>
                  </div>
                )}
                {sri.deviation.collaborationNetworkChange !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Network:</span>
                    <span className={`font-semibold ${
                      sri.deviation.collaborationNetworkChange < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {sri.deviation.collaborationNetworkChange > 0 ? '+' : ''}{sri.deviation.collaborationNetworkChange?.toFixed(0)}%
                    </span>
                  </div>
                )}
                {sri.deviation.upwardResponseChange !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Upward Response:</span>
                    <span className={`font-semibold ${
                      sri.deviation.upwardResponseChange > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      +{sri.deviation.upwardResponseChange?.toFixed(0)}%
                    </span>
                  </div>
                )}
                {sri.deviation.sentimentVarianceChange !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Sentiment Variance:</span>
                    <span className={`font-semibold ${
                      sri.deviation.sentimentVarianceChange < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {sri.deviation.sentimentVarianceChange > 0 ? '+' : ''}{sri.deviation.sentimentVarianceChange?.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drivers */}
          {sri.drivers && sri.drivers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Primary Drivers
              </h3>
              <div className="space-y-2">
                {sri.drivers.map((driver, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900/30 rounded px-3 py-2">
                    <span className="text-slate-300">{driver.name}</span>
                    <span className="text-slate-400 text-sm">{driver.change}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {sri.recommendedActions && sri.recommendedActions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {sri.recommendedActions.map((action, i) => (
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
            {sri.interpretation || 
              "Silence Risk highlights patterns where people contribute less or avoid sharing input, often before issues surface openly."}
          </div>
        </>
      )}
    </div>
  );
};

export default SilenceRiskIndicatorCard;
