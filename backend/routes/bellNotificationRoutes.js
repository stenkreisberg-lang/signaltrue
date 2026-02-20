/**
 * In-App Notification Routes (Bell Icon API)
 * API endpoints for in-app notification management
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  deleteNotification,
  sendBroadcast
} from '../services/inAppNotificationService.js';

const router = express.Router();

/**
 * GET /api/notifications/bell
 * Get notifications for the bell icon dropdown
 */
router.get('/bell', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, unreadOnly = 'false' } = req.query;
    
    const result = await getUserNotifications(req.user.userId, {
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Notifications API] Error getting bell notifications:', error);
    res.status(500).json({ message: 'Failed to get notifications', error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for badge
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.userId);
    
    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('[Notifications API] Error getting unread count:', error);
    res.status(500).json({ message: 'Failed to get unread count', error: error.message });
  }
});

/**
 * GET /api/notifications/all
 * Get all notifications with pagination
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, type, unreadOnly = 'false' } = req.query;
    
    const result = await getUserNotifications(req.user.userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      type: type || null,
      unreadOnly: unreadOnly === 'true'
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Notifications API] Error getting all notifications:', error);
    res.status(500).json({ message: 'Failed to get notifications', error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.userId);
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        read: notification.read,
        readAt: notification.readAt
      }
    });
  } catch (error) {
    console.error('[Notifications API] Error marking as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.userId);
    
    res.json({
      success: true,
      message: `${result.markedCount} notifications marked as read`,
      markedCount: result.markedCount
    });
  } catch (error) {
    console.error('[Notifications API] Error marking all as read:', error);
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/dismiss
 * Dismiss a notification (won't show in bell anymore)
 */
router.put('/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const notification = await dismissNotification(req.params.id, req.user.userId);
    
    res.json({
      success: true,
      message: 'Notification dismissed',
      notification: {
        id: notification._id,
        dismissed: notification.dismissed
      }
    });
  } catch (error) {
    console.error('[Notifications API] Error dismissing:', error);
    res.status(500).json({ message: 'Failed to dismiss notification', error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await deleteNotification(req.params.id, req.user.userId);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('[Notifications API] Error deleting:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
});

/**
 * POST /api/notifications/broadcast
 * Send broadcast notification (admin only)
 */
router.post('/broadcast', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'master_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { title, message, targetOrgId } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    const result = await sendBroadcast(req.user.orgId, { title, message, targetOrgId }, req.user.userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Notifications API] Error sending broadcast:', error);
    res.status(500).json({ message: 'Failed to send broadcast', error: error.message });
  }
});

export default router;
