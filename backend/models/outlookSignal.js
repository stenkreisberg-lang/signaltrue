import mongoose from 'mongoose';

/**
 * Outlook Signals Model
 * Captures behavioral patterns from Outlook/Microsoft 365 (email, Teams, call data)
 */
const outlookSignalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Email patterns
  emailMetrics: {
    sentCount: { type: Number, default: 0 },
    receivedCount: { type: Number, default: 0 },
    afterHoursEmailCount: { type: Number, default: 0 },
    weekendEmailCount: { type: Number, default: 0 },
    averageResponseTimeHours: { type: Number },
    threadLength: { type: Number }, // avg emails per thread
    unreadBacklog: { type: Number }
  },
  
  // Teams status patterns
  teamsMetrics: {
    statusChanges: [{
      status: { type: String }, // Available, Busy, DoNotDisturb, Away
      timestamp: { type: Date }
    }],
    availableHoursPerDay: { type: Number },
    busyHoursPerDay: { type: Number },
    dndHoursPerDay: { type: Number },
    statusFluctuationRate: { type: Number } // how often status changes (stress indicator)
  },
  
  // Call/meeting patterns from Teams
  teamsCallMetrics: {
    callCount: { type: Number, default: 0 },
    totalCallMinutes: { type: Number, default: 0 },
    averageCallDuration: { type: Number },
    videoCallCount: { type: Number, default: 0 },
    audioOnlyCount: { type: Number, default: 0 },
    afterHoursCallCount: { type: Number, default: 0 }
  },
  
  // Behavioral signals
  behavioralSignals: {
    emailOverload: {
      detected: { type: Boolean, default: false },
      unreadCount: { type: Number }
    },
    afterHoursWork: {
      detected: { type: Boolean, default: false },
      percentOfTotal: { type: Number }
    },
    responsivenessDrop: {
      detected: { type: Boolean, default: false },
      baselineHours: { type: Number },
      currentHours: { type: Number }
    },
    statusThrashing: {
      detected: { type: Boolean, default: false },
      changesPerDay: { type: Number }
    }
  },
  
  // Health assessment
  healthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  healthLevel: {
    type: String,
    enum: ['excellent', 'good', 'warning', 'critical']
  },
  
  recommendations: [{
    type: String
  }],
  
  period: {
    start: { type: Date },
    end: { type: Date }
  },
  
  lastAnalyzed: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

outlookSignalSchema.index({ userId: 1, 'period.start': -1 });
outlookSignalSchema.index({ teamId: 1, healthScore: 1 });

export default mongoose.model('OutlookSignal', outlookSignalSchema);
