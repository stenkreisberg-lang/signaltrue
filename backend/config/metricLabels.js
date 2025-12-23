/**
 * Metric Label Mapping - New Framework
 * 
 * OLD FRAMEWORK (Activity Monitoring):
 * - Recovery
 * - Focus
 * - Response Time
 * - Collaboration Score
 * 
 * NEW FRAMEWORK (Capability Indicators):
 * - Resilience (was Recovery)
 * - Execution Capacity (was Focus)
 * - Decision Speed (was Response Time)
 * - Structural Health (was Collaboration)
 * - Decision Closure Rate (NEW)
 */

export const METRIC_LABELS = {
  // Core Capability Indicators
  resilience: {
    label: 'Resilience',
    oldLabel: 'Recovery',
    description: 'Can the team restore capacity after disruption?',
    interpretation: {
      high: 'Team can restore capacity quickly after disruption',
      medium: 'Team shows moderate resilience to workload changes',
      low: 'Team struggles to recover from high-intensity periods'
    }
  },
  
  executionCapacity: {
    label: 'Execution Capacity',
    oldLabel: 'Focus',
    description: 'Can people do cognitively demanding work?',
    interpretation: {
      high: 'Team has protected time for deep work',
      medium: 'Some fragmentation in work patterns',
      low: 'High interruption patterns limiting deep work'
    }
  },
  
  decisionSpeed: {
    label: 'Decision Speed',
    oldLabel: 'Response Time',
    description: 'How quickly can the team make and communicate decisions?',
    interpretation: {
      high: 'Fast decision-making and communication loops',
      medium: 'Moderate response times on key decisions',
      low: 'Slow decision loops creating bottlenecks'
    }
  },
  
  structuralHealth: {
    label: 'Structural Health',
    oldLabel: 'Collaboration',
    description: 'Are dependencies and handoffs clean?',
    interpretation: {
      high: 'Clean handoffs and healthy collaboration patterns',
      medium: 'Some coordination friction present',
      low: 'Structural issues creating coordination overhead'
    }
  },
  
  decisionClosureRate: {
    label: 'Decision Closure Rate',
    oldLabel: null, // NEW METRIC
    description: 'Does collaboration produce outcomes with clarity?',
    interpretation: {
      high: 'Collaboration generates clear outcomes',
      medium: 'Some coordination theater present',
      low: 'High risk of activity without outcomes'
    }
  }
};

// Energy Index Configuration
export const ENERGY_INDEX_CONFIG = {
  // NEVER show Energy Index as standalone number
  // Always expand to show:
  expandTo: {
    topMetrics: 3, // Show top 3 capability indicators
    showDrift: true, // Show drift explanation
    showRecommendation: true // Show recommended action
  },
  
  // Metric weights for Energy Index calculation
  weights: {
    resilience: 0.25,
    executionCapacity: 0.25,
    decisionSpeed: 0.20,
    structuralHealth: 0.15,
    decisionClosureRate: 0.15
  },
  
  // Display configuration
  display: {
    hideStandaloneScore: true, // NEVER show just "Energy Index: 67"
    alwaysShowBreakdown: true, // Always show what drives the score
    contextualDisplay: 'expanded' // 'expanded' | 'summary' (but never 'number-only')
  }
};

// Signal Type Mapping
export const SIGNAL_TYPES = {
  'meeting-load-spike': {
    category: 'executionCapacity',
    severity: 'Risk',
    title: 'Meeting Load Spike Detected'
  },
  'after-hours-creep': {
    category: 'resilience',
    severity: 'Risk',
    title: 'After-Hours Work Pattern Change'
  },
  'focus-erosion': {
    category: 'executionCapacity',
    severity: 'Risk',
    title: 'Execution Capacity Decline'
  },
  'response-delay-increase': {
    category: 'decisionSpeed',
    severity: 'Risk',
    title: 'Decision Speed Slowdown'
  },
  'message-volume-drop': {
    category: 'structuralHealth',
    severity: 'Informational',
    title: 'Communication Pattern Change'
  },
  'recovery-deficit': {
    category: 'resilience',
    severity: 'Critical',
    title: 'Resilience Deficit'
  },
  'sentiment-decline': {
    category: 'structuralHealth',
    severity: 'Risk',
    title: 'Structural Health Decline'
  },
  'handoff-bottleneck': {
    category: 'structuralHealth',
    severity: 'Risk',
    title: 'Handoff Bottleneck Detected'
  }
};

// Copy replacements for global consistency
export const COPY_REPLACEMENTS = {
  // Remove "monitoring" language
  'monitoring': 'behavioral signal detection',
  'tracking': 'pattern analysis',
  'tracked': 'analyzed',
  'monitor': 'detect patterns in',
  
  // Focus on capabilities, not activities
  'activity': 'behavioral signals',
  'metrics': 'capability indicators',
  'score': 'indicator',
  
  // Privacy-forward language
  'individual performance': 'team capacity',
  'employee tracking': 'aggregated team patterns',
  'measure productivity': 'detect capability drift'
};

// Get metric label by key
export function getMetricLabel(key, useLegacy = false) {
  const metric = METRIC_LABELS[key];
  if (!metric) return key;
  return useLegacy && metric.oldLabel ? metric.oldLabel : metric.label;
}

// Get metric interpretation
export function getMetricInterpretation(key, level = 'medium') {
  const metric = METRIC_LABELS[key];
  if (!metric || !metric.interpretation) return '';
  return metric.interpretation[level] || metric.interpretation.medium;
}

// Map old metric name to new
export function mapLegacyMetric(oldName) {
  const mapping = {
    'Recovery': 'resilience',
    'Focus': 'executionCapacity',
    'Response Time': 'decisionSpeed',
    'Collaboration': 'structuralHealth'
  };
  return mapping[oldName] || oldName;
}

export default {
  METRIC_LABELS,
  ENERGY_INDEX_CONFIG,
  SIGNAL_TYPES,
  COPY_REPLACEMENTS,
  getMetricLabel,
  getMetricInterpretation,
  mapLegacyMetric
};
