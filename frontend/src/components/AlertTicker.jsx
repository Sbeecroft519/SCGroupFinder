import { useState, useEffect } from 'react';
import { Skull, Users, AlertTriangle, Radio, Wifi, Zap, Bug, Package } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const TICKER_CONFIG = {
  threats: {
    types: ['pirates', 'pvp'],
    label: 'LIVE THREATS',
    color: '#ff2222',
    icons: { pirates: Skull, pvp: Users }
  },
  stability: {
    types: ['lag', '30k'],
    label: 'STABILITY',
    color: '#ffaa00',
    icons: { lag: Wifi, '30k': Zap }
  },
  issues: {
    types: ['mission_bug', 'cargo_issue'],
    label: 'ISSUES',
    color: '#00ccff',
    icons: { mission_bug: Bug, cargo_issue: Package }
  }
};

export const AlertTicker = ({ userShard, tickerSettings }) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Poll every 15s
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

  // Filter alerts: only show if on same shard OR if user has no shard set (show global only)
  const filterAlerts = (types) => {
    return alerts.filter(a => {
      const age = Date.now() - new Date(a.created_at).getTime();
      if (age > 3600000) return false; // 1 hour expiry
      if (!types.includes(a.type)) return false;
      
      // Shard filtering: show if same shard, or if alert has no shard (global)
      if (userShard && a.shard && a.shard !== userShard) return false;
      
      return true;
    });
  };

  const renderTicker = (configKey) => {
    const config = TICKER_CONFIG[configKey];
    if (!tickerSettings?.[configKey]) return null;
    
    const filteredAlerts = filterAlerts(config.types);
    const isEmpty = filteredAlerts.length === 0;

    return (
      <div className="alert-ticker" style={{ '--ticker-color': isEmpty ? '#4a6070' : config.color }} key={configKey}>
        <div className="alert-ticker-label" style={{ background: isEmpty ? '#1a2530' : `${config.color}22`, borderColor: isEmpty ? '#2a3540' : `${config.color}44`, color: isEmpty ? '#6a7a8a' : config.color }}>
          <Radio size={12} className={isEmpty ? '' : 'pulse-icon'} />
          <span>{config.label}</span>
        </div>
        <div className="alert-ticker-scroll">
          <div className="alert-ticker-content">
            {isEmpty ? (
              <>
                <div className="alert-ticker-item all-clear">
                  <span style={{ color: '#4a6070' }}>ALL CLEAR — No active {config.label.toLowerCase()} reported</span>
                </div>
                <div className="alert-ticker-item all-clear">
                  <span style={{ color: '#4a6070' }}>ALL CLEAR — No active {config.label.toLowerCase()} reported</span>
                </div>
              </>
            ) : (
              [...filteredAlerts, ...filteredAlerts].map((alert, idx) => {
                const Icon = config.icons[alert.type] || AlertTriangle;
                const isOnMyShard = userShard && alert.shard === userShard;
                
                return (
                  <div 
                    key={`${alert.id || idx}-${idx}`} 
                    className={`alert-ticker-item ${isOnMyShard ? 'my-shard' : ''}`}
                    style={{ '--alert-color': config.color }}
                  >
                    <Icon size={14} style={{ color: config.color }} />
                    <span className="alert-type" style={{ color: config.color }}>
                      {alert.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="alert-location">{alert.location || alert.system}</span>
                    {alert.details && <span className="alert-details">"{alert.details}"</span>}
                    {alert.shard ? (
                      <span className={`alert-shard ${isOnMyShard ? 'same' : ''}`} style={isOnMyShard ? { borderColor: config.color, color: config.color } : {}}>
                        {isOnMyShard ? '⚠️ YOUR SHARD' : `Shard ${alert.shard}`}
                      </span>
                    ) : (
                      <span className="alert-shard global">GLOBAL</span>
                    )}
                    <span className="alert-time">{getTimeAgo(alert.created_at)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="alert-tickers-container" data-testid="alert-tickers">
      {renderTicker('threats')}
      {renderTicker('stability')}
      {renderTicker('issues')}
    </div>
  );
};

export default AlertTicker;
