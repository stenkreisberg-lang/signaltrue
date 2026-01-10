import mongoose from 'mongoose';

const industryBenchmarkSchema = new mongoose.Schema({
  industry: {
    type: String,
    required: true,
    index: true
  },
  companySizeBand: {
    type: String,
    required: true,
    enum: ['1-50', '51-200', '201-500', '501-1000', '1000+'],
    index: true
  },
  metric: {
    type: String,
    required: true,
    enum: ['bdi', 'meetingLoad', 'executionDrag', 'attritionExposure'],
    index: true
  },
  // Percentile values
  p25: {
    type: Number,
    required: true
  },
  p50: {
    type: Number,
    required: true
  },
  p75: {
    type: Number,
    required: true
  },
  // Optional metadata
  sampleSize: {
    type: Number,
    default: null
  },
  dataSource: {
    type: String,
    default: 'SignalTrue Aggregate'
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
industryBenchmarkSchema.index({ industry: 1, companySizeBand: 1, metric: 1 });

// Static method to get benchmark for specific context
industryBenchmarkSchema.statics.getBenchmark = async function(industry, companySizeBand, metric) {
  return await this.findOne({
    industry,
    companySizeBand,
    metric
  }).sort({ updatedAt: -1 }); // Get most recent
};

// Method to get percentile position for a given value
industryBenchmarkSchema.methods.getPercentilePosition = function(value) {
  if (value <= this.p25) return 'bottom-25';
  if (value <= this.p50) return 'bottom-50';
  if (value <= this.p75) return 'top-50';
  return 'top-25';
};

// Method to generate narrative (leadership-only)
industryBenchmarkSchema.methods.generateNarrative = function(value, metricName) {
  const position = this.getPercentilePosition(value);
  
  const narratives = {
    'bottom-25': `You are in the worst 25% for ${metricName} among similar companies.`,
    'bottom-50': `You are below median for ${metricName} compared to similar companies.`,
    'top-50': `You are above median for ${metricName} compared to similar companies.`,
    'top-25': `You are in the top 25% for ${metricName} among similar companies.`
  };
  
  return narratives[position];
};

const IndustryBenchmark = mongoose.model('IndustryBenchmark', industryBenchmarkSchema);

export default IndustryBenchmark;
