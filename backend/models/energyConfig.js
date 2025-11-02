import mongoose from 'mongoose';

const energyConfigSchema = new mongoose.Schema({
  weights: {
    tone: { type: Number, default: 0.4 },
    response: { type: Number, default: 0.3 },
    collaboration: { type: Number, default: 0.2 },
    meetingBalance: { type: Number, default: 0.1 },
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('EnergyConfig', energyConfigSchema);
