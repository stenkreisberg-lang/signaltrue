import mongoose from 'mongoose';

/**
 * Lead Schema
 * Stores leads captured from landing pages (EHRS Summit, etc.)
 */
const leadSchema = new mongoose.Schema({
  // Contact details
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  title: {
    type: String,
    trim: true
  },
  
  organization: {
    type: String,
    trim: true
  },
  
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  // Optional challenge/notes from form
  challenge: {
    type: String,
    trim: true
  },
  
  // Source tracking (e.g., 'EHRS2026', 'website', etc.)
  source: {
    type: String,
    required: true,
    trim: true
  },
  
  // Additional tag for campaigns
  tag: {
    type: String,
    trim: true
  },
  
  // Notification status
  clientEmailSent: {
    type: Boolean,
    default: false
  },
  
  internalNotificationSent: {
    type: Boolean,
    default: false
  },
  
  // Timestamp from form submission
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for querying leads
leadSchema.index({ email: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
