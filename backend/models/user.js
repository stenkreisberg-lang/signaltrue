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
    required: function() {
      // Password not required for auto-synced users who haven't claimed their account
      return this.accountStatus === 'active';
    },
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
    // set: encryptString,
    // get: decryptString
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  // Account status for auto-synced users
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'active'
    // 'pending' = auto-synced from Slack/Google, hasn't logged in yet
    // 'active' = has set password and can log in
    // 'inactive' = deactivated or left company
  },
  // Source of user creation
  source: {
    type: String,
    enum: ['manual', 'slack', 'google_chat', 'google_workspace', 'invitation'],
    default: 'manual'
  },
  // External IDs for syncing
  externalIds: {
    slackUserId: { type: String, sparse: true },
    googleUserId: { type: String, sparse: true },
    slackTeamId: { type: String },
    googleWorkspaceId: { type: String }
  },
  // Profile information from external sources
  profile: {
    avatar: { type: String },
    title: { type: String },
    department: { type: String },
    phone: { type: String }
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
