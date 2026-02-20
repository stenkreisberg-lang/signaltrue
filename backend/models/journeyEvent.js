/**
 * Journey Event Model
 * Tracks recovery journey events for timeline visualization
 */

import mongoose from 'mongoose';

const journeyEventSchema = new mongoose.Schema({
  // Organization reference
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Optional team-specific event
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
    index: true
  },
  
  // Event type
  type: {
    type: String,
    required: true,
    enum: [
      'milestone',        // Significant achievement
      'alert',            // Warning/drift detected
      'intervention',     // Action taken
      'metric-update',    // Significant metric change
      'goal-complete',    // Goal achieved
      'baseline-set',     // Baseline established
      'integration',      // Integration connected
      'report',           // Report generated
      'crisis',           // Crisis event
      'recovery',         // Recovery from crisis/alert
      'custom'            // User-defined event
    ]
  },
  
  // Event details
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  
  // OAR/score at this point in time
  oarScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  oarDelta: {
    type: Number,
    default: 0 // Change from previous event
  },
  
  // Related metrics at this point
  metrics: {
    energyIndex: { type: Number },
    meetingLoad: { type: Number },
    focusTime: { type: Number },
    sentiment: { type: Number }
  },
  
  // Impact tracking
  impact: {
    type: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'neutral' },
    magnitude: { type: Number, default: 0 }, // Percentage impact
    description: { type: String }
  },
  
  // Related entities
  relatedEntities: {
    interventionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Intervention' },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    driftEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriftEvent' }
  },
  
  // Visual styling hints
  icon: {
    type: String,
    default: 'circle'
  },
  color: {
    type: String,
    default: 'blue'
  },
  
  // Visibility
  isHighlight: {
    type: Boolean,
    default: false // Highlighted events show prominently
  },
  
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isAutomated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
journeyEventSchema.index({ orgId: 1, createdAt: -1 });
journeyEventSchema.index({ orgId: 1, teamId: 1, createdAt: -1 });
journeyEventSchema.index({ orgId: 1, type: 1 });

// Static method to get type icon and color
journeyEventSchema.statics.getTypeStyle = function(type) {
  const styles = {
    'milestone': { icon: '🏆', color: '#10B981' },      // Green
    'alert': { icon: '⚠️', color: '#F59E0B' },          // Amber
    'intervention': { icon: '🔧', color: '#3B82F6' },   // Blue
    'metric-update': { icon: '📊', color: '#6366F1' },  // Indigo
    'goal-complete': { icon: '🎯', color: '#10B981' },  // Green
    'baseline-set': { icon: '📏', color: '#8B5CF6' },   // Purple
    'integration': { icon: '🔗', color: '#6366F1' },    // Indigo
    'report': { icon: '📄', color: '#64748B' },         // Gray
    'crisis': { icon: '🚨', color: '#EF4444' },         // Red
    'recovery': { icon: '💚', color: '#10B981' },       // Green
    'custom': { icon: '📌', color: '#64748B' }          // Gray
  };
  return styles[type] || styles['custom'];
};

export default mongoose.model('JourneyEvent', journeyEventSchema);
