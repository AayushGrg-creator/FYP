import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../utils/constants';

/**
 * useNotifications Custom Hook
 * Path: client/src/hooks/useNotifications.js
 * * Manages real-time platform alert arrays via synchronized full-duplex WebSocket channels.
 * Features automated state pruning, optimistic updates, and background cleanup structures.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // References to safely isolate network and socket objects across execution scopes
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);

  // Synchronize component mounting state to prevent ghost updates on unmounted nodes
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Core Fetch Operation: Pull Database Notification Backlog ──
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tt_token');
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      const { success, data } = response.data;
      if (success && isMountedRef.current) {
        const alertList = data || [];
        setNotifications(alertList);
        setUnreadCount(alertList.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Notification backlog retrieval exception encountered:', err);
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to sync platform notification buffers.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ── Mutation Operation: Mark Individual Alert Item as Read Optimistically ──
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    // Optimistically patch local collection states to guarantee instantaneous interface response
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const token = localStorage.getItem('tt_token');
      await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
    } catch (err) {
      console.error('Failed to sync alert state with backend data layers:', err);
      // Revert states immediately upon operational network failure to match database truth
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ── Mutation Operation: Flush and Mark All Active Notifications as Read ──
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      const token = localStorage.getItem('tt_token');
      await axios.patch(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
    } catch (err) {
      console.error('Batch read mutation routine execution failure:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ── Web Socket Pipeline Initialization Listener Loop ──
  useEffect(() => {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    // Connect socket safely with authorized handshake authentication payloads
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    // Ingest streaming events push-broadcasted directly from backend engines
    socketRef.current.on('notification:received', (newNotification) => {
      if (newNotification && isMountedRef.current) {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Optional hook layer to spawn localized HTML5 browser ambient desk toasts
        if (Notification.permission === 'granted') {
          new Notification('Task Tide Notification', {
            body: newNotification.message || 'New system update received.',
            icon: '/favicon.ico'
          });
        }
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Real-time web-socket gateway link failure:', err.message);
    });

    // Clean up socket listener configurations on unmount to prevent ghost connection loops
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
}