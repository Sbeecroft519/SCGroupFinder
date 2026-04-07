import { useState, useEffect } from 'react';
import { Radio, Search, Clock, Users, Globe, MessageCircle, X, Zap, Coffee, Headphones } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';

const ACTIVITY_TAGS = [
  { id: 'mining', label: 'Mining Op', icon: '⛏️', color: '#FFB800' },
  { id: 'combat', label: 'Combat Patrol', icon: '🎯', color: '#FF4444' },
  { id: 'trade', label: 'Trade Run', icon: '📦', color: '#00CC66' },
  { id: 'exploration', label: 'Exploration', icon: '🔭', color: '#00F0FF' },
  { id: 'crew', label: 'Crew Up', icon: '🚀', color: '#6366F1' },
  { id: 'vibing', label: 'Just Vibing', icon: '☕', color: '#A855F7' },
  { id: 'pvp', label: 'PvP / Arena', icon: '⚔️', color: '#FF6600' },
  { id: 'org', label: 'Org Op', icon: '🏛️', color: '#3B82F6' },
];

const SERVER_REGIONS = ['Any', 'US', 'EU', 'AUS'];
const GROUP_SIZES = ['1 Pilot', '2-3 Crew', '4-6 Crew', 'Full Server Group', 'Any'];
const AVAILABILITY_FROM = ['Now', 'In 30 min', 'In 1 hour', 'In 2 hours'];
const AVAILABILITY_UNTIL = ['1 hour', '2 hours', '3 hours', '4 hours', 'Late / No limit'];

const PilotsLounge = () => {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [regionFilter, setRegionFilter] = useState('Any');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userBroadcast, setUserBroadcast] = useState(null);

  useEffect(() => {
    fetchBroadcasts();
    const interval = setInterval(fetchBroadcasts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBroadcasts = async () => {
    try {
      const res = await axios.get(`${API}/lounge/broadcasts`);
      setBroadcasts(res.data);
      const mine = res.data.find(b => b.user_id === user?.id && b.status === 'open');
      setUserBroadcast(mine || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filtered = broadcasts.filter(b => {
    if (b.status !== 'open') return false;
    if (activeFilter !== 'all' && b.activity !== activeFilter) return false;
    if (availableNowOnly && b.available_from !== 'Now') return false;
    if (regionFilter !== 'Any' && b.region !== regionFilter && b.region !== 'Any') return false;
    if (searchQuery && !b.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !b.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'expiring') return new Date(a.expires_at) - new Date(b.expires_at);
    if (sortBy === 'popular') return b.responses - a.responses;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const handleHail = async (id) => {
    try {
      await axios.post(`${API}/lounge/broadcasts/${id}/hail`);
      fetchBroadcasts();
    } catch (e) { 
      console.error(e);
      // Show error if trying to hail own broadcast
      if (e.response?.data?.detail) {
        alert(e.response.data.detail);
      }
    }
  };

  const handleClose = async (id) => {
    try {
      await axios.post(`${API}/lounge/broadcasts/${id}/close`);
      fetchBroadcasts();
    } catch (e) { console.error(e); }
  };

  const getTimeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const getTag = (id) => ACTIVITY_TAGS.find(t => t.id === id) || ACTIVITY_TAGS[0];

  return (
    <div className="page-container" data-testid="pilots-lounge-page">
      {/* Lounge Header - Distinct casual vibe */}
      <div className="lounge-header" data-testid="lounge-header">
        <div className="lounge-title-section">
          <div className="lounge-icon-wrap">
            <Headphones size={28} />
          </div>
          <div>
            <p className="lounge-eyebrow">// OPEN_COMMS</p>
            <h1 className="lounge-title">Pilot's Lounge</h1>
            <p className="lounge-subtitle">
              <Coffee size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {sorted.length} pilots broadcasting • casual grouping • no contracts
            </p>
          </div>
        </div>
        <button 
          className="broadcast-btn"
          onClick={() => setShowCreateModal(true)}
          disabled={!!userBroadcast}
          data-testid="broadcast-btn"
        >
          <Radio size={18} /> 
          <span>Broadcast on Open Comms</span>
        </button>
      </div>

      {/* User's Active Broadcast Banner */}
      {userBroadcast && (
        <div className="your-broadcast-banner" data-testid="your-active-broadcast">
          <div className="your-broadcast-content">
            <Radio size={18} className="pulse-icon" />
            <div>
              <span className="your-broadcast-label">YOUR BROADCAST IS LIVE</span>
              <p className="your-broadcast-title">{userBroadcast.title}</p>
            </div>
          </div>
          <button 
            onClick={() => handleClose(userBroadcast.id)} 
            className="close-comms-btn"
            data-testid="close-comms-btn"
          >
            Close Comms
          </button>
        </div>
      )}

      {/* Filters Row */}
      <div className="lounge-filters" data-testid="lounge-filters">
        <div className="search-box">
          <Search size={16} />
          <input 
            placeholder="Search broadcasts..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            data-testid="search-input"
          />
        </div>
        <button 
          className={`filter-btn ${availableNowOnly ? 'active' : ''}`} 
          onClick={() => setAvailableNowOnly(!availableNowOnly)}
          data-testid="available-now-filter"
        >
          <Zap size={14} /> Available Now
        </button>
        <select 
          value={regionFilter} 
          onChange={e => setRegionFilter(e.target.value)} 
          className="filter-select"
          data-testid="region-filter"
        >
          {SERVER_REGIONS.map(r => <option key={r} value={r}>{r === 'Any' ? 'All Regions' : r}</option>)}
        </select>
        <select 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value)} 
          className="filter-select"
          data-testid="sort-select"
        >
          <option value="newest">Newest</option>
          <option value="expiring">Expiring Soon</option>
          <option value="popular">Most Responses</option>
        </select>
      </div>

      {/* Activity Tags */}
      <div className="activity-tags-row" data-testid="activity-tags">
        <button 
          className={`activity-chip ${activeFilter === 'all' ? 'active' : ''}`} 
          onClick={() => setActiveFilter('all')}
          data-testid="filter-all"
        >
          All
        </button>
        {ACTIVITY_TAGS.map(tag => (
          <button 
            key={tag.id} 
            className={`activity-chip ${activeFilter === tag.id ? 'active' : ''}`} 
            onClick={() => setActiveFilter(tag.id)} 
            style={{ '--chip-color': tag.color }}
            data-testid={`filter-${tag.id}`}
          >
            {tag.icon} {tag.label}
          </button>
        ))}
      </div>

      {/* Broadcasts Grid */}
      {loading ? (
        <div className="lounge-empty" data-testid="loading-state">
          <Radio size={48} className="scan-icon" />
          <p>Scanning frequencies...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="lounge-empty" data-testid="empty-state">
          <Radio size={48} />
          <p>No signals detected on this frequency.</p>
          <span>Adjust your filters or broadcast your own.</span>
        </div>
      ) : (
        <div className="broadcasts-grid" data-testid="broadcasts-grid">
          {sorted.map(b => {
            const tag = getTag(b.activity);
            const isOwn = b.user_id === user?.id;
            const hasHailed = b.hailers?.includes(user?.id);
            return (
              <div 
                key={b.id} 
                className="broadcast-card" 
                style={{ '--card-accent': tag.color }}
                data-testid={`broadcast-card-${b.id}`}
              >
                <div className="broadcast-top">
                  <span className="broadcast-tag" style={{ background: tag.color }}>
                    {tag.icon} {tag.label}
                  </span>
                  <span className="broadcast-time">
                    <Clock size={12} /> {getTimeRemaining(b.expires_at)}
                  </span>
                </div>
                
                <div className="broadcast-handle">{b.handle}</div>
                <h3 className="broadcast-title">{b.title}</h3>
                {b.description && <p className="broadcast-desc">{b.description}</p>}
                
                <div className="broadcast-meta">
                  <span><Clock size={13} /> {b.available_from} — {b.available_until}</span>
                  <span><Users size={13} /> {b.group_size}</span>
                  {b.region !== 'Any' && <span><Globe size={13} /> {b.region}</span>}
                </div>
                
                <div className="broadcast-footer">
                  <span className="response-count">
                    <MessageCircle size={14} /> {b.responses} {b.responses === 1 ? 'response' : 'responses'}
                  </span>
                  {isOwn ? (
                    <button 
                      onClick={() => handleClose(b.id)} 
                      className="card-btn secondary"
                      data-testid={`close-btn-${b.id}`}
                    >
                      Close Comms
                    </button>
                  ) : hasHailed ? (
                    <span className="hailed-badge" data-testid={`hailed-badge-${b.id}`}>✓ HAIL SENT</span>
                  ) : (
                    <button 
                      onClick={() => handleHail(b.id)} 
                      className="card-btn primary"
                      data-testid={`hail-btn-${b.id}`}
                    >
                      📡 Hail Pilot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateBroadcastModal 
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => { setShowCreateModal(false); fetchBroadcasts(); }} 
        />
      )}

      <style>{`
        .lounge-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(0, 240, 255, 0.1);
        }
        .lounge-title-section {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .lounge-icon-wrap {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15));
          border: 1px solid rgba(0, 240, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--nc-cyan);
        }
        .lounge-eyebrow {
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 11px;
          letter-spacing: 2px;
          margin: 0 0 4px 0;
        }
        .lounge-title {
          font-family: var(--nc-font-display);
          font-size: 28px;
          color: var(--nc-text-primary);
          margin: 0;
          letter-spacing: 1px;
        }
        .lounge-subtitle {
          color: var(--nc-text-muted);
          font-size: 13px;
          margin: 6px 0 0 0;
        }
        .broadcast-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.1));
          border: 1px solid var(--nc-cyan);
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 13px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .broadcast-btn:hover:not(:disabled) {
          background: rgba(0, 240, 255, 0.3);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
        }
        .broadcast-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .your-broadcast-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(90deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.05));
          border: 1px solid var(--nc-cyan);
          margin-bottom: 24px;
        }
        .your-broadcast-content {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .pulse-icon {
          color: var(--nc-cyan);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .your-broadcast-label {
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 11px;
          letter-spacing: 2px;
          display: block;
        }
        .your-broadcast-title {
          color: var(--nc-text-primary);
          margin: 4px 0 0 0;
          font-size: 14px;
        }
        .close-comms-btn {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--nc-border);
          color: var(--nc-text-secondary);
          font-family: var(--nc-font-display);
          font-size: 12px;
          cursor: pointer;
        }
        .close-comms-btn:hover {
          border-color: #FF4444;
          color: #FF4444;
        }
        
        .lounge-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .search-box svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--nc-text-muted);
        }
        .search-box input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-primary);
          font-size: 14px;
        }
        .search-box input:focus {
          border-color: var(--nc-cyan);
          outline: none;
        }
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-secondary);
          font-family: var(--nc-font-display);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          border-color: var(--nc-cyan);
          color: var(--nc-text-primary);
        }
        .filter-btn.active {
          background: rgba(0, 240, 255, 0.1);
          border-color: var(--nc-cyan);
          color: var(--nc-cyan);
        }
        .filter-select {
          padding: 10px 12px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-primary);
          font-size: 13px;
          cursor: pointer;
        }
        
        .activity-tags-row {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .activity-chip {
          padding: 8px 14px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-secondary);
          font-family: var(--nc-font-display);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .activity-chip:hover {
          border-color: var(--chip-color, var(--nc-cyan));
          color: var(--nc-text-primary);
        }
        .activity-chip.active {
          border-color: var(--chip-color, var(--nc-cyan));
          background: rgba(0, 240, 255, 0.1);
          color: var(--nc-text-primary);
        }
        
        .lounge-empty {
          text-align: center;
          padding: 80px 20px;
          color: var(--nc-text-muted);
        }
        .lounge-empty svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .lounge-empty p {
          color: var(--nc-text-secondary);
          margin-bottom: 8px;
        }
        .lounge-empty span {
          font-size: 13px;
        }
        .scan-icon {
          animation: scan 1.5s infinite;
        }
        @keyframes scan {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
        
        .broadcasts-grid {
          display: grid;
          gap: 16px;
        }
        .broadcast-card {
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          padding: 20px;
          transition: all 0.2s;
        }
        .broadcast-card:hover {
          border-color: var(--card-accent);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .broadcast-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .broadcast-tag {
          padding: 4px 10px;
          font-family: var(--nc-font-display);
          font-size: 11px;
          color: #000;
          letter-spacing: 0.5px;
        }
        .broadcast-time {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--nc-text-muted);
          font-size: 12px;
        }
        .broadcast-handle {
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 13px;
          margin-bottom: 6px;
        }
        .broadcast-title {
          color: var(--nc-text-primary);
          font-family: var(--nc-font-display);
          font-size: 16px;
          margin: 0 0 8px 0;
        }
        .broadcast-desc {
          color: var(--nc-text-secondary);
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 12px 0;
        }
        .broadcast-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          font-size: 13px;
          color: var(--nc-text-muted);
        }
        .broadcast-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .broadcast-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--nc-border);
        }
        .response-count {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--nc-text-muted);
          font-size: 13px;
        }
        .card-btn {
          padding: 10px 18px;
          font-family: var(--nc-font-display);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-btn.primary {
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.1));
          border: 1px solid var(--nc-cyan);
          color: var(--nc-cyan);
        }
        .card-btn.primary:hover {
          background: rgba(0, 240, 255, 0.3);
        }
        .card-btn.secondary {
          background: transparent;
          border: 1px solid var(--nc-border);
          color: var(--nc-text-secondary);
        }
        .card-btn.secondary:hover {
          border-color: #FF4444;
          color: #FF4444;
        }
        .hailed-badge {
          color: var(--nc-green, #00CC66);
          font-family: var(--nc-font-display);
          font-size: 12px;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
};

const CreateBroadcastModal = ({ onClose, onCreated }) => {
  const [activity, setActivity] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fromTime, setFromTime] = useState('Now');
  const [untilTime, setUntilTime] = useState('2 hours');
  const [groupSize, setGroupSize] = useState('Any');
  const [region, setRegion] = useState('Any');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim() && activity && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/lounge/broadcasts`, {
        activity, title: title.trim(), description: description.trim(),
        available_from: fromTime, available_until: untilTime,
        group_size: groupSize, region
      });
      onCreated();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create broadcast');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" data-testid="create-broadcast-modal">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">// OPEN_COMMS</p>
            <h2 className="modal-title">Broadcast on Open Comms</h2>
          </div>
          <button onClick={onClose} className="modal-close" data-testid="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="form-section">
          <label className="form-label">ACTIVITY TYPE</label>
          <div className="activity-select">
            {ACTIVITY_TAGS.map(tag => (
              <button 
                key={tag.id} 
                onClick={() => setActivity(tag.id)} 
                className={`activity-option ${activity === tag.id ? 'active' : ''}`} 
                style={{ '--opt-color': tag.color }}
                data-testid={`activity-${tag.id}`}
              >
                {tag.icon} {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">BROADCAST TITLE</label>
          <input 
            className="form-input" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            maxLength={80} 
            placeholder="e.g. Need a gunner for my Hammerhead"
            data-testid="broadcast-title-input"
          />
          <span className="char-count">{title.length}/80</span>
        </div>

        <div className="form-section">
          <label className="form-label">DETAILS (optional)</label>
          <textarea 
            className="form-input" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            maxLength={280} 
            rows={3} 
            placeholder="What are you doing? What do you need?"
            data-testid="broadcast-description-input"
          />
          <span className="char-count">{description.length}/280</span>
        </div>

        <div className="form-row">
          <div className="form-section half">
            <label className="form-label">AVAILABLE FROM</label>
            <select 
              className="form-input" 
              value={fromTime} 
              onChange={e => setFromTime(e.target.value)}
              data-testid="available-from-select"
            >
              {AVAILABILITY_FROM.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-section half">
            <label className="form-label">AVAILABLE UNTIL</label>
            <select 
              className="form-input" 
              value={untilTime} 
              onChange={e => setUntilTime(e.target.value)}
              data-testid="available-until-select"
            >
              {AVAILABILITY_UNTIL.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-section half">
            <label className="form-label">GROUP SIZE</label>
            <select 
              className="form-input" 
              value={groupSize} 
              onChange={e => setGroupSize(e.target.value)}
              data-testid="group-size-select"
            >
              {GROUP_SIZES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-section half">
            <label className="form-label">SERVER REGION</label>
            <select 
              className="form-input" 
              value={region} 
              onChange={e => setRegion(e.target.value)}
              data-testid="region-select"
            >
              {SERVER_REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="expiry-notice">
          <Clock size={14} />
          <span>Your broadcast auto-expires when your availability window ends or after 4 hours max. You can close comms manually at any time.</span>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={!canSubmit} 
          className="submit-btn"
          data-testid="submit-broadcast-btn"
        >
          📡 Broadcast
        </button>
        <p className="submit-note">You can only have 1 active broadcast at a time.</p>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .modal-eyebrow {
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 11px;
          letter-spacing: 2px;
          margin: 0 0 4px 0;
        }
        .modal-title {
          color: var(--nc-text-primary);
          font-family: var(--nc-font-display);
          font-size: 20px;
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          color: var(--nc-text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .modal-close:hover {
          color: var(--nc-text-primary);
        }
        
        .form-section {
          margin-bottom: 20px;
        }
        .form-section.half {
          flex: 1;
        }
        .form-row {
          display: flex;
          gap: 16px;
        }
        .form-label {
          display: block;
          color: var(--nc-text-muted);
          font-family: var(--nc-font-display);
          font-size: 11px;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%;
          padding: 12px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-primary);
          font-size: 14px;
          resize: none;
        }
        .form-input:focus {
          border-color: var(--nc-cyan);
          outline: none;
        }
        .char-count {
          display: block;
          text-align: right;
          font-size: 11px;
          color: var(--nc-text-muted);
          margin-top: 4px;
        }
        
        .activity-select {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .activity-option {
          padding: 8px 12px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-secondary);
          font-family: var(--nc-font-display);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .activity-option:hover {
          border-color: var(--opt-color);
          color: var(--nc-text-primary);
        }
        .activity-option.active {
          border-color: var(--opt-color);
          background: rgba(0, 240, 255, 0.1);
          color: var(--nc-text-primary);
        }
        
        .expiry-notice {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          margin-bottom: 20px;
          font-size: 12px;
          color: var(--nc-text-muted);
          line-height: 1.5;
        }
        .expiry-notice svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .submit-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.1));
          border: 1px solid var(--nc-cyan);
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 14px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          background: rgba(0, 240, 255, 0.3);
        }
        .submit-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .submit-note {
          text-align: center;
          font-size: 11px;
          color: var(--nc-text-muted);
          margin: 12px 0 0 0;
        }
      `}</style>
    </div>
  );
};

export default PilotsLounge;
