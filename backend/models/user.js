import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encryptString, decryptString } from '../utils/crypto.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
    // set: encryptString,
    // get: decryptString
  },
  role: {
    type: String,
    // Support legacy roles and new onboarding roles
    enum: ['admin', 'viewer', 'master_admin', 'hr_admin', 'it_admin', 'team_member'],
    default: 'viewer'
  },
  isMasterAdmin: {
    type: Boolean,
    default: false
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: function() {
      return !this.isMasterAdmin; // Only required if not master admin
    }
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: function() {
      return !this.isMasterAdmin; // Only required if not master admin
    }
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  google: {
    accessToken: { type: String, set: encryptString, get: decryptString },
    refreshToken: { type: String, set: encryptString, get: decryptString },
    expiry_date: { type: Number }
  },
  
  // First Signal tracking (for "Moment of Unease" onboarding)
  firstSignalShown: {
    type: Boolean,
    default: false
  },
  firstSignalData: {
    signalType: String, // 'coordination-risk' | 'boundary-erosion' | 'execution-drag'
    metricName: String,
    value: Number,
    baseline: Number,
    delta: Number,
    statement: String,
    context: String,
    severity: String,
    detectedAt: Date,
    userAction: String, // 'see-why' | 'continue-to-dashboard'
    acknowledgedAt: Date
  },
  
  // Subscription tier (for pricing gates)
  subscriptionTier: {
    type: String,
    enum: ['free', 'detection', 'impact_proof'],
    default: 'free'
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Don't return password in JSON, and apply getters for encrypted fields
userSchema.methods.toJSON = function() {
  const obj = this.toObject({ getters: true });
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
