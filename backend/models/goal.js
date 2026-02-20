/**
 * Goal Model
 * Tracks organizational and team goals with progress monitoring
 */

import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  // Organization reference
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Optional team-specific goal (null = org-wide)
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
    index: true
  },
  
  // Goal details
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  
  // Metric being tracked
  metricType: {
    type: String,
    required: true,
    enum: [
      // Core metrics
      'oar', // Organizational Agility Rating
      'energy-index',
      'meeting-load',
      'focus-time',
      'response-latency',
      'sentiment',
      'after-hours',
      'network-breadth',
      // OAR pillars
      'oar-execution',
      'oar-innovation',
      'oar-wellbeing',
      'oar-culture',
      // Custom
      'custom'
    ]
  },
  
  // Target values
  targetValue: {
    type: Number,
    required: true
  },
  startValue: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    default: null
  },
  
  // Unit of measurement
  unit: {
    type: String,
    default: '',
    enum: ['', '%', 'hours', 'days', 'score', 'ratio', 'index']
  },
  
  // Direction: is higher better or lower better?
  direction: {
    type: String,
    required: true,
    enum: ['higher-is-better', 'lower-is-better'],
    default: 'higher-is-better'
  },
  
  // Timeline
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'active',
    index: true
  },
  
  // Progress tracking
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  progressStatus: {
    type: String,
    enum: ['on-track', 'at-risk', 'behind', 'ahead', 'completed'],
    default: 'on-track'
  },
  
  // History of value changes
  valueHistory: [{
    value: Number,
    date: { type: Date, default: Date.now },
    source: { type: String, enum: ['automated', 'manual'], default: 'automated' }
  }],
  
  // Milestones (optional checkpoints)
  milestones: [{
    title: String,
    targetValue: Number,
    targetDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  
  // Visibility
  visibility: {
    type: String,
    enum: ['public', 'team', 'private'],
    default: 'public'
  },
  
  // Ownership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Completion tracking
  completedAt: Date,
  completionNote: String,
  
  // Tags for filtering
  tags: [String],
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Compound indexes
goalSchema.index({ orgId: 1, status: 1 });
goalSchema.index({ orgId: 1, teamId: 1, status: 1 });
goalSchema.index({ deadline: 1, status: 1 });

/**
 * Calculate progress percentage based on direction
 */
goalSchema.methods.calculateProgress = function() {
  if (this.currentValue === null) return 0;
  
  const total = Math.abs(this.targetValue - this.startValue);
  if (total === 0) return this.currentValue === this.targetValue ? 100 : 0;
  
  const current = Math.abs(this.currentValue - this.startValue);
  let progress;
  
  if (this.direction === 'higher-is-better') {
    if (this.targetValue > this.startValue) {
      progress = (current / total) * 100;
    } else {
      progress = ((this.startValue - this.currentValue) / (this.startValue - this.targetValue)) * 100;
    }
  } else {
    if (this.targetValue < this.startValue) {
      progress = (current / total) * 100;
    } else {
      progress = ((this.currentValue - this.startValue) / (this.targetValue - this.startValue)) * 100;
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(progress)));
};

/**
 * Determine progress status based on timeline and progress
 */
goalSchema.methods.calculateProgressStatus = function() {
  const now = new Date();
  const totalDuration = this.deadline - this.startDate;
  const elapsed = now - this.startDate;
  const timeProgress = (elapsed / totalDuration) * 100;
  
  if (this.progress >= 100) return 'completed';
  if (this.progress >= timeProgress + 10) return 'ahead';
  if (this.progress >= timeProgress - 10) return 'on-track';
  if (this.progress >= timeProgress - 25) return 'at-risk';
  return 'behind';
};

/**
 * Update current value and recalculate progress
 */
goalSchema.methods.updateValue = async function(newValue, source = 'automated') {
  this.currentValue = newValue;
  this.valueHistory.push({
    value: newValue,
    date: new Date(),
    source
  });
  
  this.progress = this.calculateProgress();
  this.progressStatus = this.calculateProgressStatus();
  
  // Auto-complete if target reached
  if (this.progress >= 100 && this.status === 'active') {
    const targetReached = this.direction === 'higher-is-better'
      ? this.currentValue >= this.targetValue
      : this.currentValue <= this.targetValue;
    
    if (targetReached) {
      this.status = 'completed';
      this.completedAt = new Date();
      this.progressStatus = 'completed';
    }
  }
  
  // Mark as failed if deadline passed without completion
  if (new Date() > this.deadline && this.status === 'active') {
    this.status = 'failed';
  }
  
  await this.save();
  return this;
};

/**
 * Static method to get goal summary for an org
 */
goalSchema.statics.getSummary = async function(orgId) {
  const goals = await this.find({ orgId });
  
  const summary = {
    total: goals.length,
    active: 0,
    completed: 0,
    failed: 0,
    onTrack: 0,
    atRisk: 0,
    behind: 0
  };
  
  goals.forEach(goal => {
    if (goal.status === 'active') summary.active++;
    if (goal.status === 'completed') summary.completed++;
    if (goal.status === 'failed') summary.failed++;
    if (goal.progressStatus === 'on-track' || goal.progressStatus === 'ahead') summary.onTrack++;
    if (goal.progressStatus === 'at-risk') summary.atRisk++;
    if (goal.progressStatus === 'behind') summary.behind++;
  });
  
  return summary;
};

export default mongoose.model('Goal', goalSchema);
