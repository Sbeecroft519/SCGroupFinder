import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Wifi, WifiOff } from 'lucide-react';
import { useSSENotifications } from '../hooks/useSSENotifications';

const NotificationBell = ({ currentUserId }) => {
  const { notifications, connected, markAsRead, clearAll } = useSSENotifications(currentUserId);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_contract': return '📋';
      case 'new_bid': return '🤝';
      case 'bid_accepted': return '✅';
      case 'intel_alert': return '⚠️';
      default: return '🔔';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }} data-testid="notification-bell">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="notification-bell-btn"
        style={{
          background: 'transparent',
          border: 'none',
          color: connected ? 'var(--nc-cyan)' : '#666',
          cursor: 'pointer',
          position: 'relative',
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            background: '#ff4466',
            color: '#fff',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: 11,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          width: 320,
          maxHeight: 420,
          overflowY: 'auto',
          background: 'rgba(2, 11, 20, 0.98)',
          border: '1px solid var(--nc-cyan)',
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0, 240, 255, 0.15)'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 240, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--nc-cyan)', fontSize: 12, letterSpacing: 1, fontFamily: 'var(--nc-font-display)' }}>
                NOTIFICATIONS
              </span>
              {connected ? (
                <Wifi size={12} style={{ color: '#00ff88' }} />
              ) : (
                <WifiOff size={12} style={{ color: '#ff4466' }} />
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                data-testid="clear-notifications-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notification List */}
          {notifications.length === 0 ? (
            <div style={{ padding: 32, color: '#666', textAlign: 'center', fontSize: 13 }}>
              <Bell size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div>No notifications</div>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                data-testid={`notification-${notif.id}`}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  background: notif.read ? 'transparent' : 'rgba(0, 240, 255, 0.08)',
                  display: 'flex',
                  gap: 12,
                  transition: 'background 0.2s'
                }}
              >
                <span style={{ fontSize: 18 }}>{getNotificationIcon(notif.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: notif.read ? 'normal' : 'bold',
                    marginBottom: 4
                  }}>
                    {notif.title}
                  </div>
                  <div style={{
                    color: '#888',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {notif.message}
                  </div>
                  <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
                    {formatTime(notif.timestamp)}
                  </div>
                </div>
                {!notif.read && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--nc-cyan)',
                    flexShrink: 0,
                    marginTop: 6
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
