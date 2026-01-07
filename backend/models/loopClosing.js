import mongoose from 'mongoose';

/**
 * Meeting ROI Score Model
 * Tracks meeting efficiency at the team level
 */
const meetingROISchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  date: { type: Date, required: true, index: true }, // Date of calculation
  
  // Input metrics
  totalMeetingMinutes: { type: Number, default: 0 },
  totalAttendeeMinutes: { type: Number, default: 0 }, // duration × attendees summed
  meetingCount: { type: Number, default: 0 },
  
  // Follow-up Load (messages within 48h after meetings)
  messagesAfterMeetings: { type: Number, default: 0 },
  followUpLoad: { type: Number, default: 0 }, // messages / meeting cost ratio
  
  // Rework Indicator (meetings with >60% same attendees within 72h)
  reMeetingCount: { type: Number, default: 0 },
  reworkRate: { type: Number, default: 0 }, // percentage 0-100
  
  // Output Score
  roiScore: { type: Number, default: 50 }, // 0-100, higher = better ROI
  
  // Breakdown by meeting type
  recurringMeetings: {
    count: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    avgROI: { type: Number, default: 50 }
  },
  adHocMeetings: {
    count: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    avgROI: { type: Number, default: 50 }
  },
  
  // Low ROI percentage for dashboard display
  lowROIPercentage: { type: Number, default: 0 }, // "42% of meeting time shows low ROI"
  
}, { timestamps: true });

meetingROISchema.index({ teamId: 1, date: 1 }, { unique: true });


/**
 * Focus Recovery Forecast Model
 * Predicts future focus capacity based on trends
 */
const focusForecastSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  date: { type: Date, required: true, index: true },
  
  // Current state metrics
  currentFocusBlocksPerDay: { type: Number, default: 0 }, // ≥90 min uninterrupted blocks
  currentFragmentationIndex: { type: Number, default: 0 }, // context switches per day
  currentAfterHoursRate: { type: Number, default: 0 },
  
  // 14-day trend slopes
  focusBlocksTrend: { type: Number, default: 0 }, // blocks/day change per day
  fragmentationTrend: { type: Number, default: 0 }, // fragmentation change per day
  afterHoursTrend: { type: Number, default: 0 },
  
  // Forecast (14 days out)
  forecastedFocusBlocks: { type: Number, default: 0 },
  forecastedFragmentation: { type: Number, default: 0 },
  focusCapacityChange: { type: Number, default: 0 }, // e.g., -18% projected loss
  
  // Warning state
  warningState: { 
    type: String, 
    enum: ['Stable', 'Degrading', 'Critical'], 
    default: 'Stable' 
  },
  
  // Human-readable forecast message
  forecastMessage: { type: String }, // "Team will lose ~18% focus capacity in 14 days"
  
  // Historical data points for trend visualization (14 days)
  trendData: [{
    date: { type: Date },
    focusBlocks: { type: Number },
    fragmentation: { type: Number }
  }],
  
}, { timestamps: true });

focusForecastSchema.index({ teamId: 1, date: 1 }, { unique: true });


/**
 * Work Health Delta Report Model
 * 30-day before/after comparison (Pilot Killer feature)
 */
const workHealthDeltaSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  reportDate: { type: Date, required: true, index: true },
  
  // Report period
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  
  // Baseline (first 7 days)
  baseline: {
    periodStart: { type: Date },
    periodEnd: { type: Date },
    focusTimeHours: { type: Number, default: 0 },
    meetingLoadHours: { type: Number, default: 0 },
    fragmentationIndex: { type: Number, default: 0 },
    afterHoursHours: { type: Number, default: 0 },
    loadBalanceIndex: { type: Number, default: 50 },
    meetingROI: { type: Number, default: 50 }
  },
  
  // Current (last 7 days)
  current: {
    periodStart: { type: Date },
    periodEnd: { type: Date },
    focusTimeHours: { type: Number, default: 0 },
    meetingLoadHours: { type: Number, default: 0 },
    fragmentationIndex: { type: Number, default: 0 },
    afterHoursHours: { type: Number, default: 0 },
    loadBalanceIndex: { type: Number, default: 50 },
    meetingROI: { type: Number, default: 50 }
  },
  
  // Delta calculations (current - baseline)
  deltas: {
    focusTime: { type: Number, default: 0 }, // percentage change
    meetingLoad: { type: Number, default: 0 },
    fragmentation: { type: Number, default: 0 },
    afterHours: { type: Number, default: 0 },
    loadBalance: { type: Number, default: 0 },
    meetingROI: { type: Number, default: 0 }
  },
  
  // Delta status (green/yellow/red)
  deltaStatus: {
    focusTime: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' },
    meetingLoad: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' },
    fragmentation: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' },
    afterHours: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' },
    loadBalance: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' },
    meetingROI: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' }
  },
  
  // Overall verdict
  overallStatus: { type: String, enum: ['improved', 'stable', 'declined'], default: 'stable' },
  summaryMessage: { type: String }, // "Work health improved: focus time +15%, meeting load -10%"
  
  // PDF export status
  pdfGenerated: { type: Boolean, default: false },
  pdfUrl: { type: String },
  
}, { timestamps: true });

workHealthDeltaSchema.index({ teamId: 1, reportDate: 1 }, { unique: true });


/**
 * After-Hours Cost Model (Phase 2)
 */
const afterHoursCostSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  weekStart: { type: Date, required: true, index: true },
  
  // Inputs
  afterHoursHours: { type: Number, default: 0 },
  workingHoursTotal: { type: Number, default: 40 },
  
  // Calculations
  equivalentFTE: { type: Number, default: 0 }, // afterHoursHours / 40
  estimatedCost: { type: Number, default: 0 }, // FTE × avg_role_cost
  avgRoleCost: { type: Number, default: 75000 }, // Configurable per org
  
  // Weekly breakdown by day
  dailyBreakdown: [{
    date: { type: Date },
    hours: { type: Number, default: 0 }
  }],
  
  // Cumulative monthly
  monthlyAccumulated: { type: Number, default: 0 },
  
}, { timestamps: true });

afterHoursCostSchema.index({ teamId: 1, weekStart: 1 }, { unique: true });


/**
 * Meeting Collision Heatmap Model (Phase 2)
 */
const meetingCollisionSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  weekStart: { type: Date, required: true, index: true },
  
  // Heatmap data: weekday × hour grid
  // 0 = Monday, 4 = Friday; hours 8-18 typically
  heatmap: [{
    day: { type: Number }, // 0-4 (Mon-Fri)
    hour: { type: Number }, // 0-23
    collisionDensity: { type: Number, default: 0 }, // 0-100
    bookedPercentage: { type: Number, default: 0 }, // % of team members booked
    fragmentationCount: { type: Number, default: 0 }
  }],
  
  // Red zones (focus impossible)
  redZones: [{
    day: { type: Number },
    startHour: { type: Number },
    endHour: { type: Number },
    severity: { type: String, enum: ['high', 'critical'], default: 'high' }
  }],
  
  // Available focus windows
  focusWindows: [{
    day: { type: Number },
    startHour: { type: Number },
    endHour: { type: Number },
    quality: { type: String, enum: ['good', 'moderate'], default: 'good' }
  }],
  
}, { timestamps: true });

meetingCollisionSchema.index({ teamId: 1, weekStart: 1 }, { unique: true });


// Export all models
export const MeetingROI = mongoose.model('MeetingROI', meetingROISchema);
export const FocusForecast = mongoose.model('FocusForecast', focusForecastSchema);
export const WorkHealthDelta = mongoose.model('WorkHealthDelta', workHealthDeltaSchema);
export const AfterHoursCost = mongoose.model('AfterHoursCost', afterHoursCostSchema);
export const MeetingCollision = mongoose.model('MeetingCollision', meetingCollisionSchema);

export default {
  MeetingROI,
  FocusForecast,
  WorkHealthDelta,
  AfterHoursCost,
  MeetingCollision
};
