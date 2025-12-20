import mongoose from 'mongoose';

/**
 * BenchmarkSet model - stores three-layer benchmarking data
 * Layer 1: Internal baseline (primary)
 * Layer 2: Role-based benchmark (secondary)
 * Layer 3: External anonymized benchmark (optional)
 */
const benchmarkSetSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true,
    index: true
  },
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team',
    index: true
  },
  
  // Benchmark type
  benchmarkType: {
    type: String,
    enum: ['internal', 'role-based', 'external-anonymized'],
    required: true
  },
  
  // Team metadata for role-based benchmarking
  teamMetadata: {
    function: { 
      type: String, 
      enum: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Support', 'Operations', 'Other'] 
    },
    sizeBand: { 
      type: String, 
      enum: ['1-5', '6-10', '11-20', '21-50', '50+'] 
    },
    industry: { type: String }
  },
  
  // Internal baseline benchmark (vs own org history)
  internal: {
    metricName: { type: String },
    currentValue: { type: Number },
    baselineMean: { type: Number },
    baselineP25: { type: Number },
    baselineP75: { type: Number },
    delta: { type: Number },
    deltaPercent: { type: Number },
    trend: { type: String, enum: ['improving', 'stable', 'degrading'] }
  },
  
  // Role-based benchmark (similar teams)
  roleBased: {
    metricName: { type: String },
    teamValue: { type: Number },
    peerMean: { type: Number },
    peerMedian: { type: Number },
    peerP25: { type: Number },
    peerP75: { type: Number },
    percentileRank: { type: Number }, // 0-100, where team sits vs peers
    sampleSize: { type: Number }, // number of peer teams in comparison
    lastUpdated: { type: Date }
  },
  
  // External anonymized benchmark (optional context)
  externalAnonymized: {
    metricName: { type: String },
    teamValue: { type: Number },
    industryMean: { type: Number },
    industryMedian: { type: Number },
    industryP25: { type: Number },
    industryP75: { type: Number },
    percentileRank: { type: Number },
    sampleSize: { type: Number },
    privacyCompliant: { type: Boolean, default: true }, // must be true
    minimumGroupSize: { type: Number, default: 10 }, // for privacy
    lastUpdated: { type: Date }
  },
  
  // Display priority (internal = 1, role-based = 2, external = 3)
  priority: { type: Number, default: 1 },
  
  // Visibility settings
  showExternal: { type: Boolean, default: false }, // toggle for external context
  
  // Metric details
  metric: {
    name: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['meetings', 'focus', 'communication', 'recovery', 'sentiment', 'bdi'] 
    },
    unit: { type: String }, // e.g., "hours/week", "count", "score"
  },
  
  // Calculation metadata
  calculatedAt: { type: Date, default: Date.now },
  validUntil: { type: Date }, // when benchmark should be recalculated
  
}, { timestamps: true });

// Indexes for efficient queries
benchmarkSetSchema.index({ orgId: 1, teamId: 1, 'metric.name': 1 });
benchmarkSetSchema.index({ benchmarkType: 1, 'teamMetadata.function': 1, 'teamMetadata.sizeBand': 1 });

export default mongoose.model('BenchmarkSet', benchmarkSetSchema);
