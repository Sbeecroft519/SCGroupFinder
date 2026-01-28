import { useState, useEffect } from 'react';
import { Skull, Users, AlertTriangle, Radio } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const ALERT_ICONS = {
  pirates: Skull,
  pvp: Users
};

const ALERT_COLORS = {
  pirates: '#ff3366',
  pvp: '#ff6600'
};

export const AlertTicker = ({ userShard }) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/signals/alerts`);
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return 'expired';
  };

  const isOnMyShard = (alert) => userShard && alert.shard === userShard;
  const activeAlerts = alerts.filter(a => {
    const age = Date.now() - new Date(a.created_at).getTime();
    return age < 3600000; // 1 hour expiry
  });

  if (activeAlerts.length === 0) return null;

  return (
    <div className="alert-ticker" data-testid="alert-ticker">
      <div className="alert-ticker-label">
        <Radio size={12} className="pulse-icon" />
        <span>LIVE THREATS</span>
      </div>
      <div className="alert-ticker-scroll">
        <div className="alert-ticker-content">
          {activeAlerts.map((alert, idx) => {
            const Icon = ALERT_ICONS[alert.type] || AlertTriangle;
            const color = ALERT_COLORS[alert.type] || '#ff9933';
            const onMyShard = isOnMyShard(alert);
            
            return (
              <div 
                key={alert.id || idx} 
                className={`alert-ticker-item ${onMyShard ? 'my-shard' : ''}`}
                style={{ '--alert-color': color }}
              >
                <Icon size={14} style={{ color }} />
                <span className="alert-type">{alert.type === 'pirates' ? 'PIRATES' : 'PVP'}</span>
                <span className="alert-location">{alert.location || alert.system}</span>
                {alert.shard ? (
                  <span className={`alert-shard ${onMyShard ? 'same' : ''}`}>
                    {onMyShard ? '⚠️ YOUR SHARD' : `Shard ${alert.shard}`}
                  </span>
                ) : (
                  <span className="alert-shard global">GLOBAL</span>
                )}
                <span className="alert-time">{getTimeAgo(alert.created_at)}</span>
              </div>
            );
          })}
          {/* Duplicate for seamless scroll */}
          {activeAlerts.map((alert, idx) => {
            const Icon = ALERT_ICONS[alert.type] || AlertTriangle;
            const color = ALERT_COLORS[alert.type] || '#ff9933';
            const onMyShard = isOnMyShard(alert);
            
            return (
              <div 
                key={`dup-${alert.id || idx}`} 
                className={`alert-ticker-item ${onMyShard ? 'my-shard' : ''}`}
                style={{ '--alert-color': color }}
              >
                <Icon size={14} style={{ color }} />
                <span className="alert-type">{alert.type === 'pirates' ? 'PIRATES' : 'PVP'}</span>
                <span className="alert-location">{alert.location || alert.system}</span>
                {alert.shard ? (
                  <span className={`alert-shard ${onMyShard ? 'same' : ''}`}>
                    {onMyShard ? '⚠️ YOUR SHARD' : `Shard ${alert.shard}`}
                  </span>
                ) : (
                  <span className="alert-shard global">GLOBAL</span>
                )}
                <span className="alert-time">{getTimeAgo(alert.created_at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AlertTicker;
