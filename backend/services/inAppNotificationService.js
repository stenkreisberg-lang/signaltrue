/**
 * In-App Notification Service
 * Manages in-app notifications with bell icon support
 * Separate from the Slack/email notification service
 */

import Notification from '../models/notification.js';
import User from '../models/user.js';

/**
 * Create a new notification
 */
export async function createInAppNotification(data) {
  return await Notification.createNotification(data);
}

/**
 * Create notifications for multiple users (broadcast)
 */
export async function broadcastInAppNotification(userIds, notificationData) {
  const notifications = await Promise.all(
    userIds.map(userId => 
      createInAppNotification({ ...notificationData, userId })
    )
  );
  return notifications;
}

/**
 * Create notification for all users in an organization
 */
export async function notifyOrganization(orgId, notificationData) {
  const users = await User.find({ orgId, status: 'active' }).select('_id').lean();
  const userIds = users.map(u => u._id);
  
  return await broadcastInAppNotification(userIds, { ...notificationData, orgId });
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    type = null,
    unreadOnly = false,
    includeDismissed = false
  } = options;
  
  const query = { userId };
  
  if (type) {
    query.type = Array.isArray(type) ? { $in: type } : type;
  }
  
  if (unreadOnly) {
    query.read = false;
  }
  
  if (!includeDismissed) {
    query.dismissed = false;
  }
  
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.getUnreadCount(userId)
  ]);
  
  return {
    notifications,
    total,
    unreadCount,
    hasMore: offset + notifications.length < total
  };
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId) {
  return await Notification.getUnreadCount(userId);
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  
  if (!notification) {
    throw new Error('Notification not found');
  }
  
  return await notification.markAsRead();
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId) {
  const count = await Notification.markAllAsRead(userId);
  return { markedCount: count };
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId, userId) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  
  if (!notification) {
    throw new Error('Notification not found');
  }
  
  return await notification.dismiss();
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId, userId) {
  const result = await Notification.findOneAndDelete({ _id: notificationId, userId });
  return result !== null;
}

// ============================================
// Notification Creators for specific events
// ============================================

/**
 * Create metric alert notification
 */
export async function notifyMetricAlert(userId, orgId, data) {
  const { teamId, teamName, metricType, currentValue, previousValue, threshold, alertLevel } = data;
  
  const direction = currentValue > previousValue ? '↑' : '↓';
  const priority = alertLevel === 'critical' ? 'urgent' : alertLevel === 'warning' ? 'high' : 'normal';
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'metric-alert',
    priority,
    title: `${metricType} Alert: ${teamName || 'Team'}`,
    message: `${metricType} ${direction} ${previousValue} → ${currentValue} (threshold: ${threshold})`,
    data: {
      teamId,
      metricType,
      metricValue: currentValue,
      previousValue,
      threshold,
      actionUrl: `/dashboard/teams/${teamId}`,
      actionLabel: 'View Team'
    }
  });
}

/**
 * Create drift detected notification
 */
export async function notifyDriftDetected(userId, orgId, data) {
  const { teamId, teamName, driftEventId, metricType, magnitude, direction } = data;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'drift-detected',
    priority: magnitude > 20 ? 'high' : 'normal',
    title: `Drift Detected: ${teamName || 'Team'}`,
    message: `${metricType} has drifted ${direction} by ${magnitude}% from baseline`,
    data: {
      teamId,
      driftEventId,
      metricType,
      metricValue: magnitude,
      actionUrl: `/dashboard/drift/${driftEventId}`,
      actionLabel: 'View Drift'
    }
  });
}

/**
 * Create intervention reminder notification
 */
export async function notifyInterventionDue(userId, orgId, data) {
  const { interventionId, teamId, teamName, actionType } = data;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'intervention-due',
    priority: 'high',
    title: 'Intervention Recheck Due',
    message: `Time to measure the impact of "${actionType}" on ${teamName || 'team'}`,
    data: {
      interventionId,
      teamId,
      actionUrl: `/interventions/${interventionId}`,
      actionLabel: 'Record Outcome'
    }
  });
}

/**
 * Create intervention completed notification
 */
export async function notifyInterventionComplete(userId, orgId, data) {
  const { interventionId, teamId, teamName, actionType, impact } = data;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'intervention-complete',
    priority: 'normal',
    title: 'Intervention Complete',
    message: `"${actionType}" on ${teamName || 'team'} showed ${impact > 0 ? '+' : ''}${impact}% impact`,
    data: {
      interventionId,
      teamId,
      metricValue: impact,
      actionUrl: `/interventions/${interventionId}`,
      actionLabel: 'View Results'
    }
  });
}

/**
 * Create goal progress notification
 */
export async function notifyGoalProgress(userId, orgId, data) {
  const { goalId, goalTitle, progress, milestone } = data;
  
  const message = milestone 
    ? `Milestone reached: "${milestone}" on "${goalTitle}"`
    : `Goal "${goalTitle}" is now at ${progress}% progress`;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'goal-progress',
    priority: 'normal',
    title: milestone ? 'Milestone Achieved! 🎯' : 'Goal Progress Update',
    message,
    data: {
      goalId,
      metricValue: progress,
      actionUrl: `/goals/${goalId}`,
      actionLabel: 'View Goal'
    }
  });
}

/**
 * Create goal at risk notification
 */
export async function notifyGoalAtRisk(userId, orgId, data) {
  const { goalId, goalTitle, progress, daysRemaining } = data;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'goal-at-risk',
    priority: 'high',
    title: 'Goal At Risk ⚠️',
    message: `"${goalTitle}" is at ${progress}% with only ${daysRemaining} days remaining`,
    data: {
      goalId,
      metricValue: progress,
      actionUrl: `/goals/${goalId}`,
      actionLabel: 'View Goal'
    }
  });
}

/**
 * Create AI recommendation notification
 */
export async function notifyRecommendation(userId, orgId, data) {
  const { teamId, teamName, recommendationType, reason, confidence } = data;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'recommendation',
    priority: confidence === 'high' ? 'high' : 'normal',
    title: 'AI Recommendation Available',
    message: `Suggested: ${recommendationType} for ${teamName || 'team'}. ${reason}`,
    data: {
      teamId,
      metadata: { recommendationType, reason, confidence },
      actionUrl: `/dashboard/recommendations`,
      actionLabel: 'View Recommendation'
    }
  });
}

/**
 * Create crisis alert notification
 */
export async function notifyCrisis(userId, orgId, data) {
  const { teamId, teamName, crisisType, severity, description } = data;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'crisis',
    priority: 'urgent',
    title: `🚨 Crisis Alert: ${teamName || 'Team'}`,
    message: description || `${crisisType} detected with ${severity} severity`,
    data: {
      teamId,
      metadata: { crisisType, severity },
      actionUrl: `/dashboard/crisis`,
      actionLabel: 'View Crisis'
    }
  });
}

/**
 * Create system notification
 */
export async function notifySystem(userId, orgId, data) {
  const { title, message, actionUrl, actionLabel } = data;
  
  return await createInAppNotification({
    userId,
    orgId,
    type: 'system',
    priority: 'normal',
    title,
    message,
    data: {
      actionUrl,
      actionLabel
    }
  });
}

/**
 * Create broadcast notification (admin to all users)
 */
export async function sendBroadcast(orgId, data, senderId) {
  const { title, message, targetOrgId } = data;
  
  const query = targetOrgId ? { orgId: targetOrgId, status: 'active' } : { status: 'active' };
  const users = await User.find(query).select('_id orgId').lean();
  
  const notifications = await Promise.all(
    users.map(user => 
      createInAppNotification({
        userId: user._id,
        orgId: user.orgId,
        type: 'broadcast',
        priority: 'normal',
        title,
        message,
        data: {
          metadata: { sentBy: senderId }
        }
      })
    )
  );
  
  return {
    sent: notifications.length,
    message: `Broadcast sent to ${notifications.length} users`
  };
}

/**
 * Create welcome notification
 */
export async function notifyWelcome(userId, orgId) {
  return await createInAppNotification({
    userId,
    orgId,
    type: 'welcome',
    priority: 'normal',
    title: 'Welcome to SignalTrue! 👋',
    message: 'Your account is set up. Start by connecting your integrations to see team health insights.',
    data: {
      actionUrl: '/settings/integrations',
      actionLabel: 'Connect Integrations'
    }
  });
}

/**
 * Clean up old notifications (utility)
 */
export async function cleanupOldNotifications(daysOld = 60) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await Notification.deleteMany({
    createdAt: { $lt: cutoff },
    read: true
  });
  
  return { deleted: result.deletedCount };
}

export default {
  createInAppNotification,
  broadcastInAppNotification,
  notifyOrganization,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  deleteNotification,
  notifyMetricAlert,
  notifyDriftDetected,
  notifyInterventionDue,
  notifyInterventionComplete,
  notifyGoalProgress,
  notifyGoalAtRisk,
  notifyRecommendation,
  notifyCrisis,
  notifySystem,
  sendBroadcast,
  notifyWelcome,
  cleanupOldNotifications
};
