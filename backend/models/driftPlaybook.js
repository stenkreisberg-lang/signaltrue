import mongoose from 'mongoose';

/**
 * Drift Response Playbook
 * Standard, safe, reversible actions tied to specific drift patterns
 * 
 * Each playbook must include:
 * - Why this action is recommended
 * - Expected short-term effect
 * - Reversibility note
 * - Time-bound scope (1-2 weeks)
 */
const driftPlaybookSchema = new mongoose.Schema({
  // Identification
  name: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    required: true,
    enum: [
      'Meeting Reduction',
      'Focus Protection',
      'Coordination Restructure',
      'Communication Norms',
      'Capacity Adjustment',
      'Decision Clarity',
      'Other'
    ]
  },
  
  // Applicability
  appliesTo: {
    driftStates: [{ 
      type: String, 
      enum: ['Stable', 'Early Drift', 'Developing Drift', 'Critical Drift'] 
    }],
    cliStates: [{ 
      type: String, 
      enum: ['Execution-dominant', 'Balanced', 'Coordination-heavy', 'Coordination overload'] 
    }],
    btiStates: [{ 
      type: String, 
      enum: ['Low tax', 'Moderate tax', 'Severe tax'] 
    }],
    sriStates: [{ 
      type: String, 
      enum: ['Low Silence Risk', 'Rising Silence Risk', 'High Silence Risk'] 
    }],
    triggerSignals: [{ type: String }] // e.g., ['meetingLoad', 'afterHoursActivity']
  },
  
  // Action details
  action: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    steps: [{ type: String }],
    timebound: { type: String, required: true }, // e.g., "1-2 weeks", "One sprint", "14 days"
  },
  
  // Why this action is recommended
  why: {
    type: String,
    required: true
  },
  
  // Expected short-term effect
  expectedEffect: {
    description: { type: String, required: true },
    metrics: [{
      name: { type: String },
      expectedChange: { type: String } // e.g., "↓ 20-30%", "Stable", "↑ 10-15%"
    }],
    timeframe: { type: String } // e.g., "within 1 week", "2-3 weeks"
  },
  
  // Reversibility note
  reversibility: {
    isReversible: { type: Boolean, required: true, default: true },
    note: { type: String, required: true },
    howToRevert: { type: String }
  },
  
  // Risk assessment
  risk: {
    level: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    description: { type: String },
    mitigations: [{ type: String }]
  },
  
  // Effort required
  effort: {
    level: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    estimatedHours: { type: Number },
    rolesInvolved: [{ type: String }] // e.g., ['Team Lead', 'HR', 'Individual Contributors']
  },
  
  // Success indicators
  successIndicators: [{
    metric: { type: String, required: true },
    target: { type: String },
    measurement: { type: String }
  }],
  
  // Example scenarios
  examples: [{
    scenario: { type: String },
    outcome: { type: String }
  }],
  
  // Usage tracking
  usage: {
    timesUsed: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }, // 0-100
    avgImpact: { type: Number, default: 0 }, // measured improvement
    lastUsed: { type: Date }
  },
  
  // Metadata
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }, // default recommendation for this pattern
  priority: { type: Number, default: 0 }, // higher priority shown first
  
}, { timestamps: true });

// Indexes
driftPlaybookSchema.index({ 'appliesTo.driftStates': 1 });
driftPlaybookSchema.index({ 'appliesTo.triggerSignals': 1 });
driftPlaybookSchema.index({ category: 1, isActive: 1 });
driftPlaybookSchema.index({ priority: -1, 'usage.successRate': -1 });

export default mongoose.model('DriftPlaybook', driftPlaybookSchema);
