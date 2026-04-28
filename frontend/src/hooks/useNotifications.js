import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// Star Citizen style alert sound (short beep)
const ALERT_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleC8NNIng9rWKMhAkf+T2vpAvECR/5Pa+kC8QJH/k9r6QLxAkf+T2vpAvECBl3/W+ky8QIFzY8r6WNhEPQnrR6bqfMQsNOn7Y+MaRKQ0kctHws5c7FhIvaeT7z6I2DxI6ee3/y48oDCF25/zAkS8RIXbn/MCRLxEhduf8wJEvESF25/zAkS8RIXH29siPKxMkW8fWsqhCHxklVMLSrK1MLCAcN27AzbKkWTMbJk+52LC0Zy8WIDFru+e2oVcfFidPu9q0rmYwGCU+YrjduKdaMxcjQGe44LinWDMXIz9muOC4p1gzFyM/ZrjguKdYMxcjP2a44LinWDMXIz9muOC4p1gzFyM/ZrjguKdYMxcjP2a44A==';

export const useNotifications = (userShard, settings, onAlert) => {
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(ALERT_SOUND_URL);
    audioRef.current.volume = 0.3;
  }, []);

  const playAlertSound = useCallback(() => {
    if (settings?.sound_enabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [settings?.sound_enabled]);

  useEffect(() => {
    if (!settings?.websocket_enabled) return;

    // Connect to Socket.IO server
    socketRef.current = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      
      // Join shard room if set
      if (userShard) {
        socketRef.current.emit('join_shard', { shard: userShard });
      }
      
      // Subscribe to contract types if configured
      if (settings?.contract_types?.length) {
        socketRef.current.emit('subscribe_contracts', { types: settings.contract_types });
      }
    });

    socketRef.current.on('new_alert', (alert) => {
      // Check if user wants this type of alert
      const alertCategory = getAlertCategory(alert.type);
      if (!shouldShowAlert(alertCategory, settings)) return;
      
      // Check shard filtering
      if (userShard && alert.shard && alert.shard !== userShard) return;
      
      // Play sound and show notification
      playAlertSound();
      
      // Show browser notification if permitted and enabled
      if (Notification.permission === 'granted' && localStorage.getItem('navcom_popups_enabled') !== 'false') {
        new Notification(`SC Group Finder Alert: ${alert.type.replace('_', ' ').toUpperCase()}`, {
          body: `${alert.location || alert.system || 'Unknown location'}${alert.shard ? ` - ${alert.shard}` : ''}`,
          icon: '/favicon.ico',
          tag: alert.id,
        });
      }
      
      if (onAlert) onAlert(alert);
    });

    socketRef.current.on('new_contract', (contract) => {
      if (!settings?.contract_alerts) return;
      
      // Check if user subscribed to this contract type
      if (settings?.contract_types?.length && !settings.contract_types.includes(contract.type)) {
        return;
      }
      
      playAlertSound();
      
      if (Notification.permission === 'granted' && localStorage.getItem('navcom_popups_enabled') !== 'false') {
        new Notification(`New Contract: ${contract.title}`, {
          body: contract.description?.slice(0, 100),
          icon: '/favicon.ico',
          tag: contract.id,
        });
      }
      
      if (onAlert) onAlert({ ...contract, alertType: 'contract' });
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userShard, settings, playAlertSound, onAlert]);

  // Update shard room when shard changes
  useEffect(() => {
    if (socketRef.current?.connected && userShard) {
      socketRef.current.emit('join_shard', { shard: userShard });
    }
  }, [userShard]);

  return socketRef.current;
};

function getAlertCategory(type) {
  if (['pirates', 'pvp'].includes(type)) return 'threat_alerts';
  if (['lag', '30k'].includes(type)) return 'stability_alerts';
  if (['mission_bug', 'cargo_issue'].includes(type)) return 'issue_alerts';
  return null;
}

function shouldShowAlert(category, settings) {
  if (!category || !settings) return true;
  return settings[category] !== false;
}

// Request notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
};

export default useNotifications;
