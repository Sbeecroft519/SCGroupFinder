import { useState, useEffect } from 'react';
import { Radio, Search, Clock, Users, Globe, MessageCircle, X, Zap } from 'lucide-react';
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
      if (e.response?.data?.detail) alert(e.response.data.detail);
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
    <div className="navcom-page" data-testid="pilots-lounge-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="page-label">// OPEN_COMMS</p>
          <h1 className="page-title">Pilot's Lounge</h1>
          <p className="page-subtitle">{sorted.length} pilots broadcasting • casual grouping • no contracts</p>
        </div>
        <button 
          className="nc-btn nc-btn-primary"
          onClick={() => setShowCreateModal(true)}
          disabled={!!userBroadcast}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          data-testid="broadcast-btn"
        >
          <Radio size={16} /> Broadcast on Open Comms
        </button>
      </div>

      {userBroadcast && (
        <div className="nc-card" style={{ marginBottom: 24, border: '1px solid var(--nc-cyan)', background: 'rgba(0,240,255,0.05)' }} data-testid="your-active-broadcast">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--nc-cyan)', fontFamily: 'var(--nc-font-display)', fontSize: 12, letterSpacing: 2 }}>
              YOUR ACTIVE BROADCAST
            </span>
            <button onClick={() => handleClose(userBroadcast.id)} className="nc-btn nc-btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} data-testid="close-comms-btn">
              Close Comms
            </button>
          </div>
          <p style={{ marginTop: 8, color: 'var(--nc-text-primary)' }}>{userBroadcast.title}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--nc-text-muted)' }} />
          <input className="nc-input" placeholder="Search broadcasts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} data-testid="search-input" />
        </div>
        <button className={`nc-btn ${availableNowOnly ? 'nc-btn-primary' : 'nc-btn-secondary'}`} onClick={() => setAvailableNowOnly(!availableNowOnly)} style={{ display: 'flex', alignItems: 'center', gap: 6 }} data-testid="available-now-filter">
          <Zap size={14} /> Available Now
        </button>
        <select className="nc-input" value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ width: 'auto' }} data-testid="region-filter">
          {SERVER_REGIONS.map(r => <option key={r} value={r}>{r === 'Any' ? 'All Regions' : r}</option>)}
        </select>
        <select className="nc-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto' }} data-testid="sort-select">
          <option value="newest">Newest</option>
          <option value="expiring">Expiring Soon</option>
          <option value="popular">Most Responses</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }} data-testid="activity-tags">
        <button className={`activity-tag ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')} data-testid="filter-all">All</button>
        {ACTIVITY_TAGS.map(tag => (
          <button key={tag.id} className={`activity-tag ${activeFilter === tag.id ? 'active' : ''}`} onClick={() => setActiveFilter(tag.id)} style={{ '--tag-color': tag.color }} data-testid={`filter-${tag.id}`}>
            {tag.icon} {tag.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--nc-text-muted)' }} data-testid="loading-state">Scanning frequencies...</div>
      ) : sorted.length === 0 ? (
        <div className="nc-card" style={{ textAlign: 'center', padding: 60 }} data-testid="empty-state">
          <Radio size={48} style={{ color: 'var(--nc-text-muted)', marginBottom: 16 }} />
          <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 8 }}>No signals detected on this frequency.</p>
          <p style={{ color: 'var(--nc-text-muted)', fontSize: 13 }}>Adjust your filters or broadcast your own.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }} data-testid="broadcasts-grid">
          {sorted.map(b => {
            const tag = getTag(b.activity);
            const isOwn = b.user_id === user?.id;
            const hasHailed = b.hailers?.includes(user?.id);
            return (
              <div key={b.id} className="nc-card broadcast-card" style={{ '--tag-color': tag.color }} data-testid={`broadcast-card-${b.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ background: tag.color, color: '#000', padding: '4px 10px', fontSize: 11, fontFamily: 'var(--nc-font-display)' }}>
                      {tag.icon} {tag.label}
                    </span>
                    <span style={{ color: 'var(--nc-cyan)', fontFamily: 'var(--nc-font-display)', fontSize: 13 }}>{b.handle}</span>
                  </div>
                  <span style={{ color: 'var(--nc-text-muted)', fontSize: 12 }}><Clock size={12} style={{ verticalAlign: 'middle' }} /> {getTimeRemaining(b.expires_at)}</span>
                </div>
                <h3 style={{ fontSize: 16, color: 'var(--nc-text-primary)', marginBottom: 8, fontFamily: 'var(--nc-font-display)' }}>{b.title}</h3>
                {b.description && <p style={{ color: 'var(--nc-text-secondary)', fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>{b.description}</p>}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 13, color: 'var(--nc-text-muted)' }}>
                  <span><Clock size={14} style={{ verticalAlign: 'middle' }} /> {b.available_from} — {b.available_until}</span>
                  <span><Users size={14} style={{ verticalAlign: 'middle' }} /> {b.group_size}</span>
                  {b.region !== 'Any' && <span><Globe size={14} style={{ verticalAlign: 'middle' }} /> {b.region}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--nc-border)', paddingTop: 12 }}>
                  <span style={{ color: 'var(--nc-text-muted)', fontSize: 13 }}><MessageCircle size={14} style={{ verticalAlign: 'middle' }} /> {b.responses} responses</span>
                  {isOwn ? (
                    <button onClick={() => handleClose(b.id)} className="nc-btn nc-btn-secondary" style={{ padding: '8px 16px' }} data-testid={`close-btn-${b.id}`}>Close Comms</button>
                  ) : hasHailed ? (
                    <span style={{ color: 'var(--nc-green)', fontFamily: 'var(--nc-font-display)', fontSize: 12 }} data-testid={`hailed-badge-${b.id}`}>✓ HAIL SENT</span>
                  ) : (
                    <button onClick={() => handleHail(b.id)} className="nc-btn nc-btn-primary" style={{ padding: '8px 16px' }} data-testid={`hail-btn-${b.id}`}>📡 Hail Pilot</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && <CreateBroadcastModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchBroadcasts(); }} />}

      <style>{`
        .activity-tag {
          padding: 6px 12px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-secondary);
          font-family: var(--nc-font-display);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .activity-tag:hover { border-color: var(--tag-color, var(--nc-cyan)); color: var(--nc-text-primary); }
        .activity-tag.active { border-color: var(--tag-color, var(--nc-cyan)); background: rgba(0,240,255,0.1); color: var(--nc-text-primary); }
        .broadcast-card { transition: border-color 0.2s; }
        .broadcast-card:hover { border-color: var(--tag-color); }
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} data-testid="create-broadcast-modal">
      <div className="nc-card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 18, color: 'var(--nc-cyan)' }}>Broadcast on Open Comms</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--nc-text-muted)', cursor: 'pointer' }} data-testid="modal-close-btn"><X size={20} /></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="nc-label">ACTIVITY TYPE</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ACTIVITY_TAGS.map(tag => (
              <button key={tag.id} onClick={() => setActivity(tag.id)} className={`activity-tag ${activity === tag.id ? 'active' : ''}`} style={{ '--tag-color': tag.color }} data-testid={`activity-${tag.id}`}>
                {tag.icon} {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="nc-label">BROADCAST TITLE</label>
          <input className="nc-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Need a gunner for my Hammerhead" style={{ width: '100%' }} data-testid="broadcast-title-input" />
          <span style={{ fontSize: 11, color: 'var(--nc-text-muted)' }}>{title.length}/80</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="nc-label">DETAILS (optional)</label>
          <textarea className="nc-input" value={description} onChange={e => setDescription(e.target.value)} maxLength={280} rows={3} placeholder="What are you doing? What do you need?" style={{ width: '100%', resize: 'none' }} data-testid="broadcast-description-input" />
          <span style={{ fontSize: 11, color: 'var(--nc-text-muted)' }}>{description.length}/280</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label className="nc-label">AVAILABLE FROM</label>
            <select className="nc-input" value={fromTime} onChange={e => setFromTime(e.target.value)} style={{ width: '100%' }} data-testid="available-from-select">
              {AVAILABILITY_FROM.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="nc-label">AVAILABLE UNTIL</label>
            <select className="nc-input" value={untilTime} onChange={e => setUntilTime(e.target.value)} style={{ width: '100%' }} data-testid="available-until-select">
              {AVAILABILITY_UNTIL.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label className="nc-label">GROUP SIZE</label>
            <select className="nc-input" value={groupSize} onChange={e => setGroupSize(e.target.value)} style={{ width: '100%' }} data-testid="group-size-select">
              {GROUP_SIZES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="nc-label">SERVER REGION</label>
            <select className="nc-input" value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%' }} data-testid="region-select">
              {SERVER_REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--nc-text-muted)', marginBottom: 16, padding: 12, background: 'var(--nc-bg-secondary)', border: '1px solid var(--nc-border)' }}>
          Your broadcast auto-expires when your availability window ends or after 4 hours max.
        </p>

        <button onClick={handleSubmit} disabled={!canSubmit} className="nc-btn nc-btn-primary" style={{ width: '100%', padding: 14, opacity: canSubmit ? 1 : 0.5 }} data-testid="submit-broadcast-btn">
          📡 Broadcast
        </button>
        <p style={{ fontSize: 11, color: 'var(--nc-text-muted)', textAlign: 'center', marginTop: 8 }}>You can only have 1 active broadcast at a time.</p>
      </div>
    </div>
  );
};

export default PilotsLounge;
