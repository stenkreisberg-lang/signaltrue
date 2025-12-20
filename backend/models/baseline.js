import mongoose from 'mongoose';

/**
 * Baseline model - stores organizational baseline metrics for comparison
 * Tracks baseline calibration period and confidence scores
 */
const baselineSchema = new mongoose.Schema({
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
  
  // Calibration metadata
  calibrationStartDate: { type: Date, required: true },
  calibrationEndDate: { type: Date, required: true },
  calibrationDay: { type: Number, default: 0 }, // 0-30
  isCalibrationComplete: { type: Boolean, default: false },
  
  // Confidence score (increases with more data)
  confidence: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Low' 
  },
  confidenceScore: { type: Number, default: 0, min: 0, max: 100 }, // 0-100
  
  // Baseline metrics
  metrics: {
    // BDI baseline
    bdi: {
      mean: { type: Number },
      median: { type: Number },
      variance: { type: Number },
      stdDev: { type: Number },
      p25: { type: Number }, // 25th percentile
      p75: { type: Number }, // 75th percentile
      min: { type: Number },
      max: { type: Number }
    },
    
    // Meeting metrics baseline
    meetingHoursWeek: {
      mean: { type: Number },
      variance: { type: Number },
      p25: { type: Number },
      p75: { type: Number }
    },
    
    // After-hours baseline
    afterHoursMeetings: {
      mean: { type: Number },
      variance: { type: Number },
      p25: { type: Number },
      p75: { type: Number }
    },
    
    // Focus time baseline
    focusHoursWeek: {
      mean: { type: Number },
      variance: { type: Number },
      p25: { type: Number },
      p75: { type: Number }
    },
    
    // Slack metrics baseline
    messageCount: {
      mean: { type: Number },
      variance: { type: Number },
      p25: { type: Number },
      p75: { type: Number }
    },
    
    responseDelayHours: {
      mean: { type: Number },
      variance: { type: Number },
      p25: { type: Number },
      p75: { type: Number }
    }
  },
  
  // Seasonality patterns detected during calibration
  seasonality: {
    hasWeekdayPattern: { type: Boolean, default: false },
    weekdayVariance: { type: Number },
    hasMonthlyPattern: { type: Boolean, default: false },
    monthlyVariance: { type: Number },
    notes: { type: String }
  },
  
  // Sample size during calibration
  sampleSize: {
    days: { type: Number, default: 0 },
    dataPoints: { type: Number, default: 0 }
  },
  
  // Rolling window settings for post-calibration updates
  rollingWindow: {
    enabled: { type: Boolean, default: false },
    windowSizeDays: { type: Number, default: 90 },
    lastRecalculated: { type: Date }
  }
  
}, { timestamps: true });

// Compound index for querying baselines by org and team
baselineSchema.index({ orgId: 1, teamId: 1 });

export default mongoose.model('Baseline', baselineSchema);
