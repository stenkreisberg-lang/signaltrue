import React from 'react';

function ExperimentCard({ experiment }) {
  const daysRemaining = Math.ceil(
    (new Date(experiment.endDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const action = experiment.actionId;

  return (
    <div className="rounded-control border-2 border-purple-300 bg-purple-50 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            <span className="text-caption font-semibold text-purple-700 uppercase tracking-wide">
              Experiment Running
            </span>
          </div>
          <h3 className="text-lead font-semibold text-gray-900">{action.title}</h3>
        </div>
        <div className="text-right">
          <div className="text-lead font-bold text-purple-700">{daysRemaining}</div>
          <div className="text-caption text-gray-600">days left</div>
        </div>
      </div>

      {/* Hypothesis */}
      <div className="mb-4">
        <h4 className="text-caption font-semibold text-gray-700 mb-2">Hypothesis</h4>
        <p className="text-gray-700 leading-relaxed italic">{experiment.hypothesis}</p>
      </div>

      {/* Success Metrics */}
      {experiment.successMetrics && experiment.successMetrics.length > 0 && (
        <div className="mb-4">
          <h4 className="text-caption font-semibold text-gray-700 mb-2">Tracking</h4>
          <div className="space-y-1">
            {experiment.successMetrics.map((metric, idx) => (
              <div key={idx} className="flex items-center gap-2 text-caption">
                <span
                  className={`
                  ${metric.expectedDirection === 'increase' ? 'text-green-600' : 'text-blue-600'}
                `}
                >
                  {metric.expectedDirection === 'increase' ? '↑' : '↓'}
                </span>
                <span className="text-gray-700">{metric.metricKey.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded p-3 text-caption text-gray-600">
        <div className="flex justify-between">
          <span>Started: {new Date(experiment.startDate).toLocaleDateString()}</span>
          <span>Ends: {new Date(experiment.endDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-purple-100 border border-purple-200 rounded-control p-3">
        <p className="text-caption text-purple-900">
          Impact will be automatically measured when the experiment completes. You'll see results
          comparing metrics before and after the intervention.
        </p>
      </div>
    </div>
  );
}

export default ExperimentCard;
