/**
 * Notification Model
 * In-app notifications with bell icon support
 */

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // User who receives the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Organization context
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Notification type for categorization
  type: {
    type: String,
    required: true,
    enum: [
      'metric-alert',        // Metric threshold crossed
      'drift-detected',      // Drift event detected
      'intervention-due',    // Intervention needs recheck
      'intervention-complete', // Intervention completed
      'goal-progress',       // Goal milestone/progress update
      'goal-at-risk',        // Goal at risk of missing deadline
      'recommendation',      // AI recommendation available
      'system',              // System announcements
      'broadcast',           // Admin broadcast message
      'crisis',              // Crisis alert
      'welcome',             // Welcome/onboarding
      'report-ready'         // Report/export ready
    ],
    index: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Optional rich data for rendering
  data: {
    // Link to action
    actionUrl: String,
    actionLabel: String,
    
    // Related entity IDs
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    interventionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Intervention' },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    driftEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriftEvent' },
    
    // Metric context
    metricType: String,
    metricValue: Number,
    previousValue: Number,
    threshold: Number,
    
    // Additional context
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Read state
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  
  // Dismissed state (won't show in bell anymore)
  dismissed: {
    type: Boolean,
    default: false
  },
  dismissedAt: {
    type: Date,
    default: null
  },
  
  // Delivery tracking
  deliveredVia: [{
    channel: { type: String, enum: ['in-app', 'email', 'slack'] },
    deliveredAt: { type: Date, default: Date.now },
    success: { type: Boolean, default: true }
  }],
  
  // Expiration (auto-cleanup old notifications)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ orgId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

/**
 * Get unread count for a user
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ userId, read: false, dismissed: false });
};

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

/**
 * Dismiss notification
 */
notificationSchema.methods.dismiss = async function() {
  if (!this.dismissed) {
    this.dismissed = true;
    this.dismissedAt = new Date();
    await this.save();
  }
  return this;
};

/**
 * Create a notification with proper defaults
 */
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this({
    ...data,
    deliveredVia: [{ channel: 'in-app', success: true }]
  });
  
  await notification.save();
  return notification;
};

/**
 * Mark all notifications as read for a user
 */
notificationSchema.statics.markAllAsRead = async function(userId) {
  const result = await this.updateMany(
    { userId, read: false },
    { 
      $set: { 
        read: true, 
        readAt: new Date() 
      }
    }
  );
  return result.modifiedCount;
};

export default mongoose.model('Notification', notificationSchema);
