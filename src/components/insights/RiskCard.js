import React, { useState } from 'react';

const BAND_CONFIG = {
  green: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-800',
    dotColor: 'bg-green-500',
    label: 'Low Risk'
  },
  yellow: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-800',
    dotColor: 'bg-yellow-500',
    label: 'Moderate Risk'
  },
  red: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    dotColor: 'bg-red-500',
    label: 'High Risk'
  }
};

const RISK_NAMES = {
  overload: 'Overload Risk',
  execution: 'Execution Risk',
  retention_strain: 'Retention Strain'
};

function RiskCard({ risk }) {
  const [showDrivers, setShowDrivers] = useState(false);
  const config = BAND_CONFIG[risk.band] || BAND_CONFIG.green;
  const riskName = RISK_NAMES[risk.riskType] || risk.riskType;

  return (
    <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-5 transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{riskName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${config.dotColor}`}></div>
            <span className={`text-sm font-medium ${config.textColor}`}>
              {config.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${config.textColor}`}>
            {Math.round(risk.score)}
          </div>
          <div className="text-xs text-gray-500">
            {risk.confidence}% conf.
          </div>
        </div>
      </div>

      {/* Explanation */}
      {risk.explanationText && (
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
          {risk.explanationText}
        </p>
      )}

      {/* Drivers Toggle */}
      {risk.drivers && risk.drivers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => setShowDrivers(!showDrivers)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <span>{showDrivers ? '▼' : '▶'}</span>
            <span>
              {showDrivers ? 'Hide' : 'Show'} contributing metrics ({risk.drivers.length})
            </span>
          </button>

          {showDrivers && (
            <div className="mt-3 space-y-2">
              {risk.drivers
                .sort((a, b) => b.contributionWeight - a.contributionWeight)
                .map((driver, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-700 font-medium">
                        {driver.metricKey.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-600">
                        {Math.round(driver.contributionWeight * 100)}%
                      </span>
                    </div>
                    {driver.explanationText && (
                      <p className="text-gray-600 text-xs ml-2">
                        {driver.explanationText}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RiskCard;
