import mongoose from 'mongoose';

/**
 * Coordination Load Index (CLI)
 * Reframes meetings as system coordination cost, not productivity failure
 * 
 * Calculation: (Meeting Time + Back-to-Back Meetings + Cross-Team Sync) / Available Focus Time
 * 
 * States:
 * - Execution-dominant: Low coordination, high execution (healthy for delivery teams)
 * - Balanced: Moderate coordination, adequate focus time
 * - Coordination-heavy: High coordination, reduced execution time
 * - Coordination overload: Unsustainable coordination, minimal execution capacity
 */
const coordinationLoadIndexSchema = new mongoose.Schema({
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
  
  // Time period
  periodStart: { type: Date, required: true, index: true },
  periodEnd: { type: Date, required: true },
  
  // Raw inputs (hours per week)
  meetingTime: { type: Number, required: true, default: 0 },
  backToBackMeetings: { type: Number, required: true, default: 0 },
  crossTeamSync: { type: Number, required: true, default: 0 },
  availableFocusTime: { type: Number, required: true, default: 40 }, // total work hours
  
  // Calculated coordination load (percentage 0-100+)
  coordinationLoad: { type: Number, required: true, default: 0 },
  
  // CLI State
  state: {
    type: String,
    enum: ['Execution-dominant', 'Balanced', 'Coordination-heavy', 'Coordination overload'],
    required: true,
    default: 'Balanced'
  },
  
  // Drivers (what's pushing coordination up)
  drivers: [{
    name: { type: String, required: true },
    contribution: { type: Number }, // percentage
    value: { type: Number },
    change: { type: String }
  }],
  
  // Context and interpretation
  interpretation: {
    type: String,
    default: 'Coordination Load shows how much time teams spend aligning work versus executing it. High coordination load often indicates unclear ownership or decision structure.'
  },
  
  // Recommended actions
  recommendedActions: [{
    action: { type: String },
    expectedEffect: { type: String },
    timebound: { type: String } // e.g., "1-2 weeks"
  }],
  
  // Baseline comparison
  baseline: {
    coordinationLoad: { type: Number },
    state: { type: String },
    date: { type: Date }
  },
  
  // Deviation from baseline
  deviation: {
    absolute: { type: Number }, // percentage points
    percent: { type: Number }, // percent change
    trend: { type: String, enum: ['improving', 'stable', 'worsening'] }
  }
  
}, { timestamps: true });

// Indexes for efficient queries
coordinationLoadIndexSchema.index({ teamId: 1, periodStart: -1 });
coordinationLoadIndexSchema.index({ orgId: 1, periodStart: -1 });
coordinationLoadIndexSchema.index({ state: 1, periodStart: -1 });

// Calculate coordination load before saving
coordinationLoadIndexSchema.pre('save', function(next) {
  const totalCoordination = this.meetingTime + this.backToBackMeetings + this.crossTeamSync;
  this.coordinationLoad = this.availableFocusTime > 0 
    ? Math.round((totalCoordination / this.availableFocusTime) * 100)
    : 0;
  
  // Determine state based on coordination load
  if (this.coordinationLoad < 30) {
    this.state = 'Execution-dominant';
  } else if (this.coordinationLoad >= 30 && this.coordinationLoad < 50) {
    this.state = 'Balanced';
  } else if (this.coordinationLoad >= 50 && this.coordinationLoad < 75) {
    this.state = 'Coordination-heavy';
  } else {
    this.state = 'Coordination overload';
  }
  
  next();
});

export default mongoose.model('CoordinationLoadIndex', coordinationLoadIndexSchema);
