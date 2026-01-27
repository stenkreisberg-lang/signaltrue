import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Brain,
  CheckCircle2,
  Info,
  Zap,
  Target,
  Shield
} from 'lucide-react';

/**
 * Category King Signal Card Component
 * 
 * Displays a single signal with severity, confidence,
 * evidence, actions, and AI copilot integration.
 */

// Signal type metadata
const SIGNAL_METADATA = {
  recovery_collapse: {
    name: 'Recovery Collapse',
    icon: Clock,
    color: 'red',
    description: 'Team recovery time between tasks/meetings has dropped significantly'
  },
  execution_stagnation: {
    name: 'Execution Stagnation',
    icon: TrendingDown,
    color: 'amber',
    description: 'Task completion rate has declined while work continues to accumulate'
  },
  rework_spiral: {
    name: 'Rework Spiral',
    icon: AlertTriangle,
    color: 'orange',
    description: 'Rising rate of reopened tasks indicates quality issues'
  },
  boundary_erosion: {
    name: 'Boundary Erosion',
    icon: Clock,
    color: 'purple',
    description: 'After-hours work has increased, signaling work-life boundary issues'
  },
  meeting_fatigue: {
    name: 'Meeting Fatigue',
    icon: Users,
    color: 'blue',
    description: 'Meeting load has exceeded sustainable thresholds'
  },
  decision_churn: {
    name: 'Decision Churn',
    icon: AlertTriangle,
    color: 'yellow',
    description: 'Documentation and decisions are being frequently revised'
  },
  wip_overload: {
    name: 'WIP Overload',
    icon: Zap,
    color: 'red',
    description: 'Work-in-progress exceeds capacity, leading to context switching'
  },
  panic_coordination: {
    name: 'Panic Coordination',
    icon: AlertTriangle,
    color: 'red',
    description: 'Spike in unscheduled meetings indicates reactive problem-solving'
  },
  external_pressure_injection: {
    name: 'External Pressure',
    icon: Target,
    color: 'orange',
    description: 'CRM activity shows increased external demands'
  },
  overcommitment_risk: {
    name: 'Overcommitment Risk',
    icon: TrendingUp,
    color: 'amber',
    description: 'Planned work exceeds demonstrated capacity'
  }
};

// Severity colors and labels
const SEVERITY_CONFIG = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' }
};

export default function CategoryKingSignalCard({
  signal,
  onActionTaken,
  onViewDetails,
  showCopilot = true,
  className = ''
}) {
  const [expanded, setExpanded] = useState(false);
  const [actionsTaken, setActionsTaken] = useState([]);

  const metadata = SIGNAL_METADATA[signal.signal_type] || {
    name: signal.signal_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: AlertTriangle,
    color: 'gray',
    description: 'A pattern deviation was detected'
  };

  const Icon = metadata.icon;
  const severityLevel = getSeverityLevel(signal.severity);
  const severityConfig = SEVERITY_CONFIG[severityLevel];

  const handleActionTaken = (action, index) => {
    setActionsTaken(prev => [...prev, index]);
    onActionTaken?.(signal, action);
  };

  return (
    <div className={`rounded-lg border ${severityConfig.border} ${severityConfig.bg} overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-${metadata.color}-100 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${metadata.color}-600`} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{metadata.name}</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityConfig.badge}`}>
                {severityLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500">{metadata.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Severity Score */}
          <div className="text-right">
            <p className={`text-2xl font-bold ${severityConfig.text}`}>
              {Math.round(signal.severity)}
            </p>
            <p className="text-xs text-gray-500">severity</p>
          </div>
          
          {/* Expand Toggle */}
          <div className="text-gray-400">
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 bg-white">
          {/* Metrics & Confidence */}
          <div className="px-4 py-3 grid grid-cols-2 gap-4 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      signal.confidence >= 70 ? 'bg-green-500' :
                      signal.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${signal.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(signal.confidence)}%
                </span>
              </div>
              {signal.confidence < 60 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Low confidence - interpret with caution
                </p>
              )}
            </div>
            
            <div>
              <p className="text-xs text-gray-500 mb-1">Scope</p>
              <p className="text-sm text-gray-700">
                {signal.scope?.level === 'team' && signal.scope?.team_name && (
                  <>Team: {signal.scope.team_name}</>
                )}
                {signal.scope?.level === 'org' && 'Organization-wide'}
                {signal.scope?.level === 'user' && 'Individual'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {signal.affected_users?.length || 0} users affected
              </p>
            </div>
          </div>
          
          {/* What Changed */}
          {signal.metric_deltas && signal.metric_deltas.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                What Changed
              </h4>
              <div className="space-y-2">
                {signal.metric_deltas.map((delta, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{formatMetricName(delta.metric)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {formatValue(delta.baseline)} → {formatValue(delta.current)}
                      </span>
                      <span className={`text-sm font-medium ${
                        delta.delta_pct > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {delta.delta_pct > 0 ? '+' : ''}{Math.round(delta.delta_pct)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Evidence */}
          {signal.evidence && signal.evidence.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Evidence
              </h4>
              <ul className="space-y-1">
                {signal.evidence.slice(0, 5).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommended Actions */}
          {signal.recommended_actions && signal.recommended_actions.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Recommended Actions
              </h4>
              <div className="space-y-2">
                {signal.recommended_actions.map((action, i) => (
                  <div 
                    key={i}
                    className={`p-3 rounded-lg border ${
                      actionsTaken.includes(i) 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${
                          actionsTaken.includes(i) ? 'text-green-700 line-through' : 'text-gray-900'
                        }`}>
                          {action.action}
                        </p>
                        {action.why && (
                          <p className="text-xs text-gray-500 mt-1">{action.why}</p>
                        )}
                      </div>
                      
                      {!actionsTaken.includes(i) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionTaken(action, i);
                          }}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Mark as done"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      {actionsTaken.includes(i) && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                      {action.owner && (
                        <span className="text-xs text-gray-500">
                          <Users className="w-3 h-3 inline mr-1" />
                          {action.owner}
                        </span>
                      )}
                      {action.effort && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          action.effort === 'low' ? 'bg-green-100 text-green-700' :
                          action.effort === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {action.effort} effort
                        </span>
                      )}
                      {action.timeframe && (
                        <span className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {action.timeframe}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Research Backing */}
          <div className="px-4 py-3 bg-gray-50 flex items-start gap-3">
            <Shield className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-700">Research Backing</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {getResearchBacking(signal.signal_type)}
              </p>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Detected {formatTimeAgo(signal.detected_at || signal.createdAt)}
            </div>
            
            <div className="flex items-center gap-2">
              {showCopilot && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails?.(signal);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                >
                  <Brain className="w-3 h-3" />
                  Ask Copilot
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getSeverityLevel(severity) {
  if (severity >= 70) return 'high';
  if (severity >= 40) return 'medium';
  return 'low';
}

function formatMetricName(metric) {
  return metric
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/Wip/g, 'WIP')
    .replace(/Pct/g, '%');
}

function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    if (value % 1 !== 0) return value.toFixed(1);
    return value.toString();
  }
  return value;
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'recently';
  
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function getResearchBacking(signalType) {
  const research = {
    recovery_collapse: 'Based on meeting fatigue research showing cognitive recovery needs 5-15 minutes between focused activities.',
    execution_stagnation: 'Based on the JD-R model linking sustained high demands with accumulating work to exhaustion.',
    rework_spiral: 'Based on quality research showing rework creates demand without adding value.',
    boundary_erosion: 'Based on research linking after-hours email expectations to emotional exhaustion (Barber & Santuzzi, 2015).',
    meeting_fatigue: 'Based on virtual meeting fatigue research highlighting recovery needs (Bailenson, 2021).',
    decision_churn: 'Based on decision fatigue research showing repeated deliberation drains cognitive resources.',
    wip_overload: 'Based on flow research showing context-switching costs can consume 20-40% of productive time.',
    panic_coordination: 'Based on crisis management research linking reactive meetings to underlying process failures.',
    external_pressure_injection: 'Based on boundary theory research on external demands disrupting internal workflows.',
    overcommitment_risk: 'Based on planning fallacy research showing systematic underestimation of effort required.'
  };
  
  return research[signalType] || 'Based on peer-reviewed organizational psychology research.';
}
