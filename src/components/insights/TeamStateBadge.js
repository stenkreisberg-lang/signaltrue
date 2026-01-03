import React from 'react';

const STATE_CONFIG = {
  healthy: {
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    label: 'Healthy',
    description: 'Team operating within sustainable norms'
  },
  strained: {
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    label: 'Strained',
    description: 'Early pressure signals detected'
  },
  overloaded: {
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    label: 'Overloaded',
    description: 'Sustained pressure affecting capacity'
  },
  breaking: {
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    label: 'Breaking',
    description: 'Critical state requiring immediate intervention'
  }
};

function TeamStateBadge({ state, confidence, showDescription = true }) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.healthy;

  return (
    <div className={`inline-block`}>
      <div className="flex items-center gap-3">
        <div className={`px-4 py-2 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.textColor === 'text-green-800' ? 'bg-green-500' : config.textColor === 'text-yellow-800' ? 'bg-yellow-500' : config.textColor === 'text-orange-800' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
            <span className={`font-semibold ${config.textColor}`}>
              {config.label}
            </span>
          </div>
        </div>
        {confidence && (
          <span className="text-sm text-gray-500">
            {confidence}% confidence
          </span>
        )}
      </div>
      {showDescription && (
        <p className="mt-2 text-sm text-gray-600">
          {config.description}
        </p>
      )}
    </div>
  );
}

export default TeamStateBadge;
