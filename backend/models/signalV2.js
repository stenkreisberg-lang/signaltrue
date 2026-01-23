import mongoose from 'mongoose';

/**
 * Signal V2 - Backend-ready signal schema based on comprehensive spec
 * Implements all 6 signal types with robust baseline deviation detection
 * 
 * Signal Types:
 * - recovery_gap_index (RGI): Shrinking recovery windows
 * - focus_fragmentation (FFS): Loss of uninterrupted focus blocks
 * - meeting_load_drift (MLD): Sustained upward drift in meeting load
 * - responsiveness_pressure (RPI): Tightening response-time norms
 * - engagement_asymmetry (EAS): Participation imbalance
 * - signal_convergence (SCD): Multiple risk signals moving together
 */

const signalSchemaV2 = new mongoose.Schema({
  // Entity identification (shared across all signals)
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true,
    index: true
  },
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team',
    required: true,
    index: true
  },
  
  // Period tracking
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  weekStart: { 
    type: String, 
    required: true,
    index: true  // ISO date, Monday 00:00 in org timezone, e.g., "2025-12-16"
  },
  timezone: { 
    type: String, 
    required: true  // IANA timezone, e.g., "America/New_York"
  },
  
  // Signal identity
  signalType: { 
    type: String, 
    required: true,
    enum: [
      'recovery_gap_index',      // RGI - Recovery window shrinkage
      'focus_fragmentation',     // FFS - Focus block erosion
      'meeting_load_drift',      // MLD - Meeting creep
      'responsiveness_pressure', // RPI - Reactivity pressure
      'engagement_asymmetry',    // EAS - Participation imbalance
      'signal_convergence',      // SCD - Multi-signal system overload
      'context_switching',       // CSI - Context switching overhead
      'network_bottleneck',      // NBI - Collaboration concentration
      'rework_churn'             // RCI - Task reopening/reassignment
    ],
    index: true
  },
  // Category for grouping signals (per Category King spec)
  signalCategory: {
    type: String,
    enum: ['coordination', 'execution', 'recovery', 'network'],
    required: true,
    index: true
  },
  // Data sources that contributed to this signal
  sources: [{
    type: String,
    enum: ['slack', 'calendar', 'jira', 'asana', 'email', 'basecamp', 'linear']
  }],
  
  // Severity (INFO → RISK → CRITICAL escalation path)
  severity: { 
    type: String, 
    required: true,
    enum: ['INFO', 'RISK', 'CRITICAL'],
    index: true
  },
  
  // Confidence score (0-1, computed from multiple factors)
  confidence: { 
    type: Number, 
    required: true,
    min: 0,
    max: 1
  },
  confidenceFactors: {
    dataCoverage: { 
      type: Number, 
      min: 0, 
      max: 1,
      comment: 'Fraction of active users with usable data in the week'
    },
    baselineConfidence: { 
      type: Number, 
      min: 0, 
      max: 1,
      comment: 'From baseline builder'
    },
    sustainFactor: { 
      type: Number, 
      min: 0, 
      max: 1,
      comment: '1.0 if sustained for risk/critical thresholds, else 0.5'
    },
    sourceQuality: { 
      type: Number, 
      min: 0, 
      max: 1,
      comment: '1.0 if calendar+slack, 0.7 if calendar only, 0.5 if sparse'
    }
  },
  
  // Core metric values
  currentValue: { type: Number, required: true },
  baselineValue: { type: Number, required: true },  // median preferred over mean
  deltaAbs: { type: Number, required: true },
  deltaPct: { type: Number, required: true },
  
  // Deviation from baseline (with robust z-score)
  deviation: {
    robustZScore: { 
      type: Number,
      comment: '(current_value - baseline_median) / (1.4826 * baseline_mad)'
    },
    zScore: { 
      type: Number,
      comment: 'Fallback: (current_value - baseline_mean) / baseline_std'
    },
    sustainedWeeks: { 
      type: Number, 
      default: 1,
      comment: 'Number of consecutive weeks deviation persisted'
    },
    deviationStartWeek: { 
      type: String,
      comment: 'ISO date (YYYY-MM-DD) of first week deviation started'
    },
    meetsRiskThreshold: { type: Boolean, default: false },
    meetsCriticalThreshold: { type: Boolean, default: false }
  },
  
  // Baseline reference (last 6 full weeks after calibration)
  baseline: {
    mean: { type: Number },
    median: { type: Number },
    std: { type: Number },
    mad: { 
      type: Number,
      comment: 'Median absolute deviation - robust alternative to std'
    },
    p25: { 
      type: Number,
      comment: '25th percentile - lower band for robust visualization'
    },
    p75: { 
      type: Number,
      comment: '75th percentile - upper band for robust visualization'
    },
    confidence: { 
      type: Number, 
      min: 0, 
      max: 1,
      comment: 'Baseline confidence rises with data coverage'
    },
    windowWeeks: { 
      type: Number, 
      default: 6,
      comment: 'BASELINE_WEEKS constant'
    }
  },
  
  // What's causing this signal (top 3 drivers)
  drivers: [{
    key: { 
      type: String, 
      required: true,
      comment: 'Machine-readable key, e.g., "after_hours_activity_rate"'
    },
    label: { 
      type: String, 
      required: true,
      comment: 'Human-readable label'
    },
    value: { 
      type: Number, 
      required: true 
    },
    deltaAbs: { type: Number },
    deltaPct: { type: Number },
    _id: false
  }],
  
  // What happens if ignored (severity-specific consequence text)
  consequence: { 
    type: String, 
    required: true,
    comment: 'Pre-defined consequence statement based on severity level'
  },
  
  // Time-to-impact window (days)
  timeToImpact: {
    min: { 
      type: Number, 
      required: true,
      comment: 'Minimum days until impact materializes'
    },
    max: { 
      type: Number, 
      required: true,
      comment: 'Maximum days until impact materializes'
    }
  },
  
  // Data quality and privacy guardrails
  dataQuality: {
    minGroupSize: { 
      type: Number, 
      default: 8,
      comment: 'MIN_GROUP_SIZE for privacy - never show metrics for groups smaller than this'
    },
    activeUsersCount: { 
      type: Number,
      comment: 'Number of active users in the period'
    },
    dataCoverage: { 
      type: Number, 
      min: 0, 
      max: 1,
      comment: 'Fraction of active users with usable data this week'
    },
    sampleSize: { 
      type: Number,
      comment: 'Total events (messages, meetings, etc.) in sample'
    },
    meetsMinimums: { 
      type: Boolean, 
      default: true,
      comment: 'Whether signal meets minimum sample size and coverage thresholds'
    }
  },
  
  // Recommended actions (with effort and expected effect)
  recommendedActions: [{
    actionId: { 
      type: String, 
      required: true,
      comment: 'Unique action identifier for tracking'
    },
    title: { 
      type: String, 
      required: true 
    },
    description: { type: String },
    effort: { 
      type: String, 
      enum: ['LOW', 'MED', 'HIGH'],
      required: true
    },
    expectedEffect: { 
      type: String,
      comment: 'What you gain from this action'
    },
    tradeOffs: { 
      type: String,
      comment: 'What you might lose or sacrifice'
    },
    _id: false
  }],
  
  // UI visualization configuration
  ui: {
    chartType: { 
      type: String, 
      enum: ['line', 'bar', 'distribution', 'heatmap'],
      default: 'line'
    },
    currentSeries: [{
      weekStart: { type: String, comment: 'ISO date' },
      value: { type: Number },
      _id: false
    }],
    baselineBand: {
      lower: { 
        type: Number,
        comment: 'baseline.p25 - lower robust band'
      },
      upper: { 
        type: Number,
        comment: 'baseline.p75 - upper robust band'
      }
    },
    annotations: [{
      type: { type: String },
      date: { type: Date },
      label: { type: String },
      _id: false
    }]
  },
  
  // Signal lifecycle status
  status: { 
    type: String, 
    enum: ['Open', 'Acknowledged', 'In Progress', 'Resolved', 'Ignored'], 
    default: 'Open',
    index: true
  },
  
  // Ownership
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  dueDate: { type: Date },
  
  // Action tracking
  selectedAction: { 
    actionId: { type: String },
    title: { type: String },
    startDate: { type: Date }
  },
  
  // Post-action learning loop
  outcome: {
    rating: { 
      type: String, 
      enum: ['Worked', 'Partially Worked', 'Did Not Work']
    },
    timeToNormalization: { 
      type: Number,
      comment: 'Days until metric returned to baseline after action'
    },
    notes: { type: String },
    recordedAt: { type: Date },
    recordedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    }
  },
  
  // Metadata
  firstDetected: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  ignoredAt: { type: Date },
  ignoredReason: { type: String }
  
}, { 
  timestamps: true,
  collection: 'signals_v2'
});

// Compound indexes for common queries
signalSchemaV2.index({ orgId: 1, teamId: 1, weekStart: -1 });
signalSchemaV2.index({ orgId: 1, severity: 1, status: 1 });
signalSchemaV2.index({ orgId: 1, signalType: 1, weekStart: -1 });
signalSchemaV2.index({ teamId: 1, status: 1, weekStart: -1 });
signalSchemaV2.index({ owner: 1, status: 1 });
signalSchemaV2.index({ 'deviation.sustainedWeeks': 1, severity: 1 });

// Update lastUpdated on save
signalSchemaV2.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for human-readable period
signalSchemaV2.virtual('periodDisplay').get(function() {
  const start = this.periodStart.toISOString().split('T')[0];
  const end = this.periodEnd.toISOString().split('T')[0];
  return `${start} to ${end}`;
});

export default mongoose.model('SignalV2', signalSchemaV2);
