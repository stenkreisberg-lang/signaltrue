import React from 'react';

/**
 * Coordination Load Index Card
 * Shows coordination vs execution time
 */
const CoordinationLoadIndexCard = ({ cli, showDetails = true }) => {
  if (!cli) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Coordination Load Index</h2>
        <p className="text-slate-400">No CLI data available.</p>
      </div>
    );
  }

  const stateConfig = {
    'Execution-dominant': { 
      color: 'green',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700',
      textColor: 'text-green-400',
      icon: '🎯',
      description: 'Team focused on execution'
    },
    'Balanced': { 
      color: 'blue',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700',
      textColor: 'text-blue-400',
      icon: '⚖️',
      description: 'Healthy coordination-execution balance'
    },
    'Coordination-heavy': { 
      color: 'orange',
      bgColor: 'bg-orange-900/20',
      borderColor: 'border-orange-700',
      textColor: 'text-orange-400',
      icon: '⚠️',
      description: 'High coordination reducing execution time'
    },
    'Coordination overload': { 
      color: 'red',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
      textColor: 'text-red-400',
      icon: '🔴',
      description: 'Unsustainable coordination load'
    }
  };

  const config = stateConfig[cli.state] || stateConfig['Balanced'];

  return (
    <div className={`bg-slate-800 rounded-lg border ${config.borderColor} p-6 transition-all hover:border-opacity-80`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Coordination Load Index</h2>
        <span className="text-2xl">{config.icon}</span>
      </div>

      {/* State Badge and Load Percentage */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`${config.bgColor} ${config.borderColor} border px-4 py-2 rounded-lg flex-1`}>
          <div className={`font-semibold ${config.textColor} mb-1`}>{cli.state}</div>
          <div className="text-xs text-slate-400">{config.description}</div>
        </div>
        <div className="text-3xl font-bold text-slate-100">
          {cli.coordinationLoad}%
        </div>
      </div>

      {showDetails && (
        <>
          {/* Time Breakdown */}
          <div className="mb-4 bg-slate-900/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Time Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  Meeting Time
                </span>
                <span className="font-semibold text-slate-100">
                  {cli.meetingTime?.toFixed(1)} hrs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">⏰</span>
                  Back-to-Back
                </span>
                <span className="font-semibold text-slate-100">
                  {cli.backToBackMeetings?.toFixed(1)} hrs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">🤝</span>
                  Cross-Team Sync
                </span>
                <span className="font-semibold text-slate-100">
                  {cli.crossTeamSync?.toFixed(1)} hrs
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700 pt-2 mt-2">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  Available Focus Time
                </span>
                <span className="font-semibold text-green-400">
                  {cli.availableFocusTime?.toFixed(1)} hrs
                </span>
              </div>
            </div>
          </div>

          {/* Drivers */}
          {cli.drivers && cli.drivers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                What's Driving Coordination Load
              </h3>
              <div className="space-y-2">
                {cli.drivers.map((driver, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900/30 rounded px-3 py-2">
                    <span className="text-slate-300">{driver.name}</span>
                    <span className="text-slate-400 text-sm">{driver.change}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Baseline Deviation */}
          {cli.baseline && cli.deviation && (
            <div className="mb-4 bg-slate-900/30 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Change from baseline:</span>
                <span className={`font-semibold ${
                  cli.deviation.trend === 'improving' ? 'text-green-400' :
                  cli.deviation.trend === 'worsening' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {cli.deviation.absolute > 0 ? '+' : ''}{cli.deviation.absolute?.toFixed(0)}% 
                  {cli.deviation.trend === 'improving' && ' ↗'}
                  {cli.deviation.trend === 'worsening' && ' ↘'}
                  {cli.deviation.trend === 'stable' && ' →'}
                </span>
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {cli.recommendedActions && cli.recommendedActions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {cli.recommendedActions.map((action, i) => (
                  <div key={i} className="bg-blue-900/20 border border-blue-700 rounded-lg px-4 py-3">
                    <div className="font-semibold text-blue-400 mb-1">{action.action}</div>
                    {action.expectedEffect && (
                      <div className="text-xs text-slate-400 mb-1">{action.expectedEffect}</div>
                    )}
                    {action.timebound && (
                      <div className="text-xs text-slate-500">Timeframe: {action.timebound}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interpretation */}
          <div className="text-xs text-slate-500 leading-relaxed border-t border-slate-700 pt-3">
            {cli.interpretation || 
              "Coordination Load shows how much time teams spend aligning work versus executing it. High coordination load often indicates unclear ownership or decision structure."}
          </div>
        </>
      )}
    </div>
  );
};

export default CoordinationLoadIndexCard;
