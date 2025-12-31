import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Behavioral Drift Index Card
 * Displays the primary metric for team behavioral drift
 */
const BehavioralDriftIndexCard = ({ bdi, teamId, showDetails = true }) => {
  if (!bdi) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Behavioral Drift Index</h2>
        <p className="text-slate-400">No BDI data available. Baseline being established.</p>
      </div>
    );
  }

  const stateConfig = {
    'Stable': { 
      color: 'green', 
      bgColor: 'bg-green-900/20', 
      borderColor: 'border-green-700',
      textColor: 'text-green-400',
      icon: '✓'
    },
    'Early Drift': { 
      color: 'yellow', 
      bgColor: 'bg-yellow-900/20', 
      borderColor: 'border-yellow-700',
      textColor: 'text-yellow-400',
      icon: '⚠️'
    },
    'Developing Drift': { 
      color: 'orange', 
      bgColor: 'bg-orange-900/20', 
      borderColor: 'border-orange-700',
      textColor: 'text-orange-400',
      icon: '⚠️'
    },
    'Critical Drift': { 
      color: 'red', 
      bgColor: 'bg-red-900/20', 
      borderColor: 'border-red-700',
      textColor: 'text-red-400',
      icon: '🔴'
    }
  };

  const config = stateConfig[bdi.state] || stateConfig['Stable'];

  const confidenceLevelConfig = {
    'Low': { color: 'text-slate-400', icon: '◐' },
    'Medium': { color: 'text-yellow-400', icon: '◑' },
    'High': { color: 'text-green-400', icon: '●' }
  };

  const confidenceConfig = confidenceLevelConfig[bdi.confidence?.level] || confidenceLevelConfig['Low'];

  return (
    <div className={`bg-slate-800 rounded-lg border ${config.borderColor} p-6 transition-all hover:border-opacity-80`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Behavioral Drift Index</h2>
        <span className="text-2xl">{config.icon}</span>
      </div>

      {/* State Badge and Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`${config.bgColor} ${config.borderColor} border px-4 py-2 rounded-lg`}>
          <span className={`font-semibold ${config.textColor}`}>{bdi.state}</span>
        </div>
        <div className="text-3xl font-bold text-slate-100">
          {bdi.driftScore}/100
        </div>
      </div>

      {/* Summary */}
      {bdi.summary && (
        <p className="text-slate-300 mb-4 leading-relaxed">
          {bdi.summary}
        </p>
      )}

      {showDetails && (
        <>
          {/* Top Drivers */}
          {bdi.topDrivers && bdi.topDrivers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Top Drivers
              </h3>
              <div className="space-y-2">
                {bdi.topDrivers.slice(0, 3).map((driver, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900/50 rounded px-3 py-2">
                    <span className="text-slate-300 capitalize">
                      {driver.signal.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className={`font-semibold ${driver.change.startsWith('+') ? 'text-red-400' : 'text-green-400'}`}>
                      {driver.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence */}
          {bdi.confidence && (
            <div className="mb-4 bg-slate-900/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-400">Signal Confidence</span>
                <span className={`font-semibold ${confidenceConfig.color}`}>
                  {confidenceConfig.icon} {bdi.confidence.level}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{bdi.confidence.confirmingSignals} confirming signals</span>
                <span>•</span>
                <span>{bdi.confidence.durationDays} days sustained</span>
              </div>
              {bdi.confidence.confounders && bdi.confidence.confounders.length > 0 && (
                <div className="mt-2 text-xs text-yellow-400">
                  ⚠️ Confounders: {bdi.confidence.confounders.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Recommended Playbooks */}
          {bdi.recommendedPlaybooks && bdi.recommendedPlaybooks.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {bdi.recommendedPlaybooks.slice(0, 2).map((playbook, i) => (
                  <button
                    key={i}
                    className="w-full text-left bg-blue-900/20 border border-blue-700 hover:bg-blue-900/30 rounded-lg px-4 py-2 transition-colors"
                  >
                    <div className="font-semibold text-blue-400">{playbook.name}</div>
                    {playbook.why && (
                      <div className="text-xs text-slate-400 mt-1">{playbook.why}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interpretation */}
          <div className="text-xs text-slate-500 leading-relaxed border-t border-slate-700 pt-3">
            {bdi.interpretation || 
              "Behavioral Drift Index shows whether a team's working patterns are changing compared to their own historical baseline. It detects early coordination and capacity issues before outcomes are affected."}
          </div>

          {/* View Details Link */}
          {teamId && (
            <div className="mt-4">
              <Link 
                to={`/app/teams/${teamId}/drift`}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Full Drift Analysis →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BehavioralDriftIndexCard;
