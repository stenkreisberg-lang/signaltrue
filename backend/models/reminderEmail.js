/**
 * ReminderEmail Model
 * Tracks sent reminder emails to prevent duplicates and schedule follow-ups
 */

import mongoose from 'mongoose';

const reminderEmailSchema = new mongoose.Schema({
  // Who received the email
  recipientEmail: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true, 
    index: true 
  },
  
  // User reference (if applicable)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    index: true 
  },
  
  // Organization reference
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    index: true 
  },
  
  // Type of reminder
  reminderType: { 
    type: String, 
    enum: [
      'new-user-connect',      // New user - connect your tools
      'new-user-followup-24h', // 24h follow-up for users
      'new-user-followup-48h', // 48h follow-up for users
      'it-admin-invite',       // IT admin invited by HR
      'it-admin-followup-48h', // 48h urgent follow-up for IT admin
    ],
    required: true,
    index: true
  },
  
  // Email metadata
  subject: { type: String },
  emailId: { type: String }, // Resend email ID
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['sent', 'failed', 'opened', 'clicked'],
    default: 'sent'
  },
  
  // For IT admin reminders - who invited them
  invitedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String }
  },
  
  // Scheduling
  scheduledFor: { type: Date }, // For scheduled follow-ups
  sentAt: { type: Date, default: Date.now },
  
  // Error tracking
  error: { type: String },
  
}, { timestamps: true });

// Compound indexes for efficient queries
reminderEmailSchema.index({ recipientEmail: 1, reminderType: 1 });
reminderEmailSchema.index({ userId: 1, reminderType: 1 });
reminderEmailSchema.index({ orgId: 1, reminderType: 1, status: 1 });
reminderEmailSchema.index({ scheduledFor: 1, status: 1 });

/**
 * Check if a reminder of this type was already sent to this user
 */
reminderEmailSchema.statics.wasAlreadySent = async function(recipientEmail, reminderType) {
  const existing = await this.findOne({ 
    recipientEmail: recipientEmail.toLowerCase(), 
    reminderType,
    status: 'sent'
  });
  return !!existing;
};

/**
 * Get users who need follow-up reminders (registered but no integrations after X hours)
 */
reminderEmailSchema.statics.getUsersNeedingFollowUp = async function(hoursAgo, reminderType) {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  // Get emails that already received this reminder type
  const alreadySent = await this.distinct('recipientEmail', { 
    reminderType, 
    status: 'sent' 
  });
  
  return { cutoff, alreadySent };
};

/**
 * Record a sent reminder
 */
reminderEmailSchema.statics.recordSent = async function({
  recipientEmail,
  userId,
  orgId,
  reminderType,
  subject,
  emailId,
  invitedBy
}) {
  return this.create({
    recipientEmail: recipientEmail.toLowerCase(),
    userId,
    orgId,
    reminderType,
    subject,
    emailId,
    status: 'sent',
    sentAt: new Date(),
    invitedBy
  });
};

export default mongoose.model('ReminderEmail', reminderEmailSchema);
