import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

interface Notification {
  _id: string;
  type: 'drift_alert' | 'goal_progress' | 'milestone' | 'recommendation' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

interface NotificationBellProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userId,
  onNotificationClick,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifRes, countRes] = await Promise.all([
        api.get(`/notifications/bell?limit=10`),
        api.get(`/notifications/unread-count`),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    onNotificationClick?.(notification);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      default:
        return '#94a3b8';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'drift_alert':
        return '⚠️';
      case 'goal_progress':
        return '🎯';
      case 'milestone':
        return '🏆';
      case 'recommendation':
        return '💡';
      default:
        return '📢';
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-bell-container">
      <button
        className={`bell-button ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="notification-backdrop" onClick={() => setIsOpen(false)} />
          <div className="notification-dropdown">
            <div className="dropdown-header">
              <h4>Notifications</h4>
              {unreadCount > 0 && (
                <button className="mark-all-btn" onClick={markAllAsRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="notification-list">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="empty-state">
                  <span className="icon">🔔</span>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className="priority-indicator"
                      style={{ backgroundColor: getPriorityColor(notification.priority) }}
                    />
                    <span className="type-icon">{getTypeIcon(notification.type)}</span>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-meta">
                        <span className="time">{formatTimeAgo(notification.createdAt)}</span>
                        {notification.actionLabel && (
                          <span className="action-link">{notification.actionLabel} →</span>
                        )}
                      </div>
                    </div>
                    {!notification.read && <div className="unread-dot" />}
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="dropdown-footer">
                <button onClick={() => (window.location.href = '/notifications')}>
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .notification-bell-container {
          position: relative;
        }

        .bell-button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .bell-button:hover {
          background: var(--bg-elevated, #1e293b);
        }

        .bell-icon {
          font-size: 20px;
        }

        .bell-button.has-unread .bell-icon {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(10deg); }
        }

        .unread-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }

        .notification-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 360px;
          max-height: 480px;
          background: var(--bg-elevated, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--border, #334155);
        }

        .dropdown-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .mark-all-btn {
          background: transparent;
          border: none;
          color: var(--accent, #3b82f6);
          font-size: 12px;
          cursor: pointer;
        }

        .notification-list {
          flex: 1;
          overflow-y: auto;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: var(--text-muted, #94a3b8);
        }

        .empty-state .icon {
          font-size: 32px;
          margin-bottom: 8px;
          opacity: 0.5;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
        }

        .notification-item:hover {
          background: var(--bg, #0f172a);
        }

        .notification-item.unread {
          background: rgba(59, 130, 246, 0.05);
        }

        .priority-indicator {
          width: 3px;
          height: 100%;
          position: absolute;
          left: 0;
          top: 0;
          border-radius: 0 2px 2px 0;
        }

        .type-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notification-message {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }

        .notification-meta .time {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          opacity: 0.7;
        }

        .notification-meta .action-link {
          font-size: 11px;
          color: var(--accent, #3b82f6);
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: var(--accent, #3b82f6);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dropdown-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border, #334155);
        }

        .dropdown-footer button {
          width: 100%;
          background: transparent;
          border: 1px solid var(--border, #334155);
          color: var(--text-muted, #94a3b8);
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dropdown-footer button:hover {
          border-color: var(--accent, #3b82f6);
          color: var(--accent, #3b82f6);
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border, #334155);
          border-top-color: var(--accent, #3b82f6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
