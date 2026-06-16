import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * NotificationBell Component
 * Path: client/src/components/common/NotificationBell.jsx
 * * Renders an interactive action bell layout with real-time tracking badges.
 * Manages click-away overlay dismissals and formats relative alert intervals.
 */
export default function NotificationBell({ notifications = [], onMarkAsRead, onMarkAllRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Filter out system indicators for active count badges
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Intercept click sequences outside the panel scope to collapse the window safely
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Utility logic translating technical timestamps into relative times
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateString).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      {/* ── Interactive Bell Button Anchor ── */}
      <button 
        type="button" 
        style={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications panel"
      >
        <span style={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <div style={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* ── Floating Dropdown Panel Matrix ── */}
      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <h4 style={styles.headerTitle}>Notifications</h4>
            {unreadCount > 0 && onMarkAllRead && (
              <button type="button" style={styles.markAllBtn} onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.listContainer}>
            {notifications.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>✨</span>
                <p style={styles.emptyText}>Your inbox is perfectly clear</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification._id} 
                  style={{
                    ...styles.notificationItem,
                    background: notification.isRead ? 'transparent' : '#1E293B'
                  }}
                  onClick={() => onMarkAsRead && !notification.isRead && onMarkAsRead(notification._id)}
                >
                  <div style={styles.itemContent}>
                    <div style={styles.titleRow}>
                      <span style={{
                        ...styles.itemTitle,
                        fontWeight: notification.isRead ? 500 : 700
                      }}>
                        {notification.title}
                      </span>
                      {!notification.isRead && <div style={styles.unreadDot} />}
                    </div>
                    <p style={styles.itemMessage}>{notification.message}</p>
                    <span style={styles.itemTime}>{getRelativeTime(notification.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <Link to="/dashboard/notifications" style={styles.viewAllLink} onClick={() => setIsOpen(false)}>
              View All Activity Log
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  bellBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
  },
  bellIcon: {
    fontSize: '22px',
    color: '#94A3B8',
    transition: 'color 0.15s ease',
  },
  badge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: '#EF4444',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '10px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #0B1120',
    boxSizing: 'border-box',
    fontVariantNumeric: 'tabular-nums',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '12px',
    width: '320px',
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #1E293B',
    background: '#0B1120',
  },
  headerTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#F1F5F9',
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#0EA5E9',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  listContainer: {
    maxHeight: '360px',
    overflowY: 'auto',
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyIcon: {
    fontSize: '28px',
  },
  emptyText: {
    margin: 0,
    fontSize: '13.5px',
    color: '#64748B',
    fontWeight: 500,
  },
  notificationItem: {
    padding: '14px 16px',
    borderBottom: '1px solid #1E293B',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    display: 'flex',
    gap: '12px',
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  itemTitle: {
    fontSize: '13.5px',
    color: '#E2E8F0',
    lineHeight: '1.4',
  },
  unreadDot: {
    width: '6px',
    height: '6px',
    background: '#0EA5E9',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '6px',
  },
  itemMessage: {
    margin: 0,
    fontSize: '12.5px',
    color: '#94A3B8',
    lineHeight: '1.5',
  },
  itemTime: {
    fontSize: '11px',
    color: '#64748B',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  viewAllLink: {
    display: 'block',
    textAlign: 'center',
    padding: '12px 0',
    background: '#0B1120',
    borderTop: '1px solid #1E293B',
    color: '#94A3B8',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'color 0.15s ease',
  },
};