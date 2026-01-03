import React from 'react';

const RISK_LABELS = {
  overload: 'Overload',
  execution: 'Execution',
  retention_strain: 'Retention Strain'
};

function ActionCard({ action, onActivate, onDismiss }) {
  const isActive = action.status === 'active';
  const isSuggested = action.status === 'suggested';

  return (
    <div className={`rounded-lg border-2 ${isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'} p-6 shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {action.title}
            </h3>
            {action.linkedRisk && (
              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                {RISK_LABELS[action.linkedRisk]}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Duration: <span className="font-medium">{action.duration} weeks</span>
          </div>
        </div>
        {isActive && (
          <div className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded">
            Active
          </div>
        )}
      </div>

      {/* Why This Action */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Why this action?</h4>
        <p className="text-gray-700 leading-relaxed">
          {action.whyThisAction}
        </p>
      </div>

      {/* Action Buttons */}
      {isSuggested && (
        <div className="flex gap-3">
          <button
            onClick={() => onActivate(action._id)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start This Action
          </button>
          <button
            onClick={() => onDismiss(action._id)}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {isActive && (
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            <strong>Active:</strong> This intervention is being tracked as an experiment. 
            Results will be measured at the end of the {action.duration}-week period.
          </p>
        </div>
      )}
    </div>
  );
}

export default ActionCard;
