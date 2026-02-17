import { useState, useEffect, useCallback } from 'react';
import { playNotification, playAlert } from '../utils/sounds';
import { API } from '../App';

export const useSSENotifications = (currentUserId) => {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    const eventSource = new EventSource(`${API}/notifications/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Ignore pings and connection messages
        if (data.type === 'ping' || data.type === 'connected') return;

        // Check if notification is targeted at specific user
        if (data.target_user_id && data.target_user_id !== currentUserId) {
          return; // Not for this user
        }

        // Play appropriate sound
        if (data.sound === 'alert') {
          playAlert();
        } else if (data.sound === 'notification') {
          playNotification();
        }

        // Add to notifications list
        setNotifications(prev => [
          { ...data, id: Date.now(), read: false, timestamp: new Date().toISOString() },
          ...prev.slice(0, 49) // Keep last 50
        ]);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      // Will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [currentUserId]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, connected, markAsRead, clearAll };
};

export default useSSENotifications;
