import mongoose from 'mongoose';

const teamEnergyIndexSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true }, // e.g. '2025-W45'
  date: { type: Date, required: true },
  energyIndex: { type: Number, required: true },
  energyScore: { type: Number, required: true },
  meetingHours: Number,
  afterHoursMessages: Number,
  ptoDays: Number,
  details: { type: Object },
  drivers: {
    meetingLoadPct: Number,
    afterHoursPct: Number,
    restScore: Number
  }
}, { timestamps: true });

teamEnergyIndexSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('TeamEnergyIndex', teamEnergyIndexSchema);
