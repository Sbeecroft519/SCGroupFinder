import { useState, useEffect, useCallback, useRef } from 'react';
import { playNotification, playAlert } from '../utils/sounds';
import { API } from '../App';

// Map contract categories to notification filter IDs
const CATEGORY_TO_FILTER = {
  'Combat': 'combat',
  'Medical': 'rescue',
  'Logistics': 'transport',
  'Industrial': 'mining',
  'Other': 'escort'  // Default mapping for "Other"
};

export const useSSENotifications = (currentUserId, notificationSettings) => {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  // Use ref to always have latest settings without re-creating EventSource
  const settingsRef = useRef(notificationSettings);
  
  // Keep settingsRef updated
  useEffect(() => {
    settingsRef.current = notificationSettings;
  }, [notificationSettings]);

  useEffect(() => {
    if (!currentUserId) return;

    const eventSource = new EventSource(`${API}/notifications/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const settings = settingsRef.current || {};

        // Ignore pings and connection messages
        if (data.type === 'ping' || data.type === 'connected') return;

        // Check if notification is targeted at specific user
        if (data.target_user_id && data.target_user_id !== currentUserId) {
          return; // Not for this user
        }

        // === GRANULAR NOTIFICATION FILTERING ===
        
        // Filter contract notifications based on user preferences
        if (data.type === 'new_contract') {
          // Check if contract alerts are enabled
          if (settings.contract_alerts === false) {
            return; // User disabled all contract alerts
          }
          
          // Check if specific contract types are selected
          const contractTypes = settings.contract_types || [];
          if (contractTypes.length > 0 && data.category) {
            // Map the contract category to filter ID
            const filterType = CATEGORY_TO_FILTER[data.category] || 'escort';
            if (!contractTypes.includes(filterType)) {
              return; // User not subscribed to this contract type
            }
          }
        }
        
        // Filter intel alerts (threat_alerts in settings)
        if (data.type === 'intel_alert' && settings.threat_alerts === false) {
          return; // User disabled threat alerts
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
