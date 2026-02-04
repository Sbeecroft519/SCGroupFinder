import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Star, Briefcase } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const CONTRACT_ICONS = {
  security: '🛡️',
  rescue: '🚑',
  transport: '📦',
  operations: '🤝'
};

export default function MissionHistory({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({ types: false, earnings: false, recent: false });
  const [visibleMissions, setVisibleMissions] = useState(5);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/users/${userId}/mission-history`);
        setData(response.data);
      } catch (e) {
        console.error('Failed to fetch mission history:', e);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchHistory();
  }, [userId]);

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const formatEarnings = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toString();
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return `${Math.floor(days / 30)}mo ago`;
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    return hours > 0 ? `${hours}h ago` : 'Just now';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>MISSION HISTORY</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
      </div>
    );
  }

  if (!data || data.summary.total_completed === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>MISSION HISTORY</span>
          <span style={styles.count}>[0 MISSIONS]</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          No missions completed yet.<br />
          Complete contracts to build your reputation!
        </div>
      </div>
    );
  }

  const { summary, missions } = data;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>MISSION HISTORY</span>
        <span style={styles.count}>[{summary.total_completed} MISSIONS]</span>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{summary.total_completed}</div>
          <div style={styles.statLabel}>COMPLETED</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{summary.success_rate}%</div>
          <div style={styles.statLabel}>SUCCESS</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: '#ffd700' }}>{formatEarnings(summary.total_earnings)} aUEC</div>
          <div style={styles.statLabel}>TOTAL EARNED</div>
        </div>
      </div>

      {/* Missions by Type */}
      <div style={styles.dropdown} onClick={() => toggle('types')}>
        <span>Missions by Type</span>
        {expanded.types ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      {expanded.types && (
        <div style={styles.dropdownContent}>
          {Object.entries(summary.missions_by_type || {}).map(([type, count]) => (
            <div key={type} style={styles.typeRow}>
              <span>{CONTRACT_ICONS[type] || '📋'} {type.charAt(0).toUpperCase() + type.slice(1)}</span>
              <span style={{ color: '#00f0ff' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Earnings Breakdown */}
      <div style={styles.dropdown} onClick={() => toggle('earnings')}>
        <span>Earnings Breakdown</span>
        {expanded.earnings ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      {expanded.earnings && (
        <div style={styles.dropdownContent}>
          <div style={styles.typeRow}>
            <span>This Week</span>
            <span style={{ color: '#ffd700' }}>{formatEarnings(summary.earnings_week || 0)} aUEC</span>
          </div>
          <div style={styles.typeRow}>
            <span>This Month</span>
            <span style={{ color: '#ffd700' }}>{formatEarnings(summary.earnings_month || 0)} aUEC</span>
          </div>
          <div style={styles.typeRow}>
            <span>All Time</span>
            <span style={{ color: '#ffd700' }}>{formatEarnings(summary.total_earnings)} aUEC</span>
          </div>
        </div>
      )}

      {/* Recent Missions */}
      <div style={styles.dropdown} onClick={() => toggle('recent')}>
        <span>Recent Missions</span>
        {expanded.recent ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      {expanded.recent && (
        <div style={styles.dropdownContent}>
          {missions.slice(0, visibleMissions).map((m, idx) => (
            <div key={idx} style={styles.missionEntry}>
              <div style={styles.missionHeader}>
                <span style={styles.missionType}>{CONTRACT_ICONS[m.contract_type] || '📋'} {m.contract_type?.toUpperCase()}</span>
                {m.role && <span style={styles.roleBadge}>{m.role}</span>}
              </div>
              <div style={styles.missionTitle}>{m.contract_title}</div>
              <div style={styles.missionMeta}>
                <span>{m.poster_handle}</span>
                <span style={{ color: '#ffd700' }}>{m.payout_received?.toLocaleString()} aUEC</span>
                {m.rating_received && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={12} fill="#ffd700" color="#ffd700" /> {m.rating_received}
                  </span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{getTimeAgo(m.completed_at)}</span>
              </div>
            </div>
          ))}
          {missions.length > visibleMissions && (
            <button style={styles.loadMore} onClick={(e) => { e.stopPropagation(); setVisibleMissions(v => v + 5); }}>
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(2, 11, 20, 0.9)',
    border: '1px solid #00f0ff',
    clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: '#00f0ff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2
  },
  count: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'monospace'
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 1,
    background: 'rgba(0, 240, 255, 0.1)',
    margin: 16
  },
  statBox: {
    background: 'rgba(2, 11, 20, 0.95)',
    padding: '16px 12px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4
  },
  dropdown: {
    padding: '14px 20px',
    borderTop: '1px solid rgba(0, 240, 255, 0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13
  },
  dropdownContent: {
    padding: '0 20px 16px',
    background: 'rgba(0, 240, 255, 0.03)'
  },
  typeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)'
  },
  missionEntry: {
    padding: '12px 0',
    borderBottom: '1px solid rgba(0, 240, 255, 0.1)'
  },
  missionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6
  },
  missionType: {
    fontSize: 11,
    color: '#00f0ff',
    letterSpacing: 1
  },
  roleBadge: {
    fontSize: 10,
    padding: '2px 8px',
    background: 'rgba(0, 240, 255, 0.15)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    color: '#00f0ff'
  },
  missionTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 6
  },
  missionMeta: {
    display: 'flex',
    gap: 16,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)'
  },
  loadMore: {
    width: '100%',
    padding: '10px',
    marginTop: 12,
    background: 'rgba(0, 240, 255, 0.1)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    color: '#00f0ff',
    cursor: 'pointer',
    fontSize: 12
  }
};
