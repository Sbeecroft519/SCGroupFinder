import { useState, useEffect } from 'react';
import { Shield, Heart, Package, Users, Copy, Star, MapPin, Clock, Check, Plus, X } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';

const CONTRACT_TYPES = [
  { id: 'security', label: 'Security', icon: '🛡️', color: '#00f0ff' },
  { id: 'rescue', label: 'Rescue', icon: '🚑', color: '#00ff88' },
  { id: 'transport', label: 'Transport', icon: '📦', color: '#ffcc00' },
  { id: 'operations', label: 'Operations', icon: '🤝', color: '#ff9933' }
];

const MOCK_CONTRACTS = [
  {
    id: '1',
    type: 'security',
    title: 'Cargo Run Protection',
    description: 'Need escort for Hull C transport from ArcCorp to Microtech. High-value cargo, expecting interdiction attempts.',
    location: 'Stanton System',
    shard: '360',
    poster: { handle: 'CaptainVex', reputation: 4.8, is_supporter: true },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'open'
  },
  {
    id: '2',
    type: 'rescue',
    title: 'Medical Evac Needed',
    description: 'Crew member down in bunker near Daymar. Need immediate pickup and transport to Olisar.',
    location: 'Crusader - Daymar',
    shard: '422',
    poster: { handle: 'MedRunnerX', reputation: 4.5, is_supporter: false },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'open',
    rescue_type: 'pickup'
  },
  {
    id: '3',
    type: 'transport',
    title: 'Vehicle Delivery',
    description: 'Need Ursa Rover transported from Lorville to New Babbage. Will pay extra for fast delivery.',
    location: 'Hurston to microTech',
    shard: '360',
    poster: { handle: 'GroundOps', reputation: 4.2, is_supporter: false },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'open'
  },
  {
    id: '4',
    type: 'operations',
    title: 'Mining Operation Support',
    description: 'Looking for 2 additional pilots for Quantanium mining op. MOLE provided, need laser operators.',
    location: 'Aaron Halo Belt',
    shard: '512',
    poster: { handle: 'RockBreaker', reputation: 4.9, is_supporter: true },
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'open'
  }
];

export default function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState(MOCK_CONTRACTS);
  const [filter, setFilter] = useState('all');
  const [myShard, setMyShard] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(null);

  // New contract form state
  const [newContract, setNewContract] = useState({
    type: 'security',
    title: '',
    description: '',
    location: '',
    rescue_type: 'pickup'
  });

  useEffect(() => {
    fetchContracts();
  }, [filter]);

  const fetchContracts = async () => {
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await axios.get(`${API}/contracts`, { params });
      if (response.data && response.data.length > 0) {
        setContracts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      // Keep mock data on error
    }
  };

  const handleCopyHandle = (handle) => {
    navigator.clipboard.writeText(handle);
    setCopiedHandle(handle);
    setTimeout(() => setCopiedHandle(null), 2000);
  };

  const handleCreateContract = async () => {
    if (!newContract.title || !newContract.description) return;

    try {
      const response = await axios.post(`${API}/contracts`, {
        ...newContract,
        shard: myShard
      });
      setContracts(prev => [response.data, ...prev]);
      setShowCreate(false);
      setNewContract({ type: 'security', title: '', description: '', location: '', rescue_type: 'pickup' });
    } catch (error) {
      console.error('Failed to create contract:', error);
      // Add to local state for demo
      const mockNew = {
        id: Date.now().toString(),
        ...newContract,
        shard: myShard,
        poster: { handle: user?.rsi_handle || 'Anonymous', reputation: 5.0, is_supporter: user?.is_supporter },
        created_at: new Date().toISOString(),
        status: 'open'
      };
      setContracts(prev => [mockNew, ...prev]);
      setShowCreate(false);
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getContractType = (typeId) => CONTRACT_TYPES.find(t => t.id === typeId) || CONTRACT_TYPES[0];

  const filteredContracts = contracts.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false;
    return true;
  });

  const isMyShardContract = (contract) => myShard && contract.shard === myShard;

  return (
    <div className="navcom-page" data-testid="contracts-page">
      {/* Create Contract Modal */}
      {showCreate && (
        <div className="mission-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// NEW_BEACON</div>
                <h2 className="mission-title">Create Contract</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              <div className="form-group">
                <label className="nc-label">CONTRACT TYPE</label>
                <div className="nc-toggle-group">
                  {CONTRACT_TYPES.map(type => (
                    <button
                      key={type.id}
                      className={`nc-toggle ${newContract.type === type.id ? 'active' : ''}`}
                      onClick={() => setNewContract(prev => ({ ...prev, type: type.id }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {newContract.type === 'rescue' && (
                <div className="form-group">
                  <label className="nc-label">RESCUE TYPE</label>
                  <div className="nc-toggle-group">
                    <button
                      className={`nc-toggle ${newContract.rescue_type === 'body_marker' ? 'active' : ''}`}
                      onClick={() => setNewContract(prev => ({ ...prev, rescue_type: 'body_marker' }))}
                    >
                      Body Marker
                    </button>
                    <button
                      className={`nc-toggle ${newContract.rescue_type === 'pickup' ? 'active' : ''}`}
                      onClick={() => setNewContract(prev => ({ ...prev, rescue_type: 'pickup' }))}
                    >
                      Pickup
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="nc-label">TITLE</label>
                <input
                  type="text"
                  className="nc-input"
                  placeholder="Brief description of the job"
                  value={newContract.title}
                  onChange={e => setNewContract(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="nc-label">DESCRIPTION</label>
                <textarea
                  className="nc-input"
                  rows={4}
                  placeholder="Full details about what you need..."
                  value={newContract.description}
                  onChange={e => setNewContract(prev => ({ ...prev, description: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="nc-label">LOCATION</label>
                <input
                  type="text"
                  className="nc-input"
                  placeholder="e.g., Stanton - Crusader area"
                  value={newContract.location}
                  onChange={e => setNewContract(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <button 
                className="nc-btn nc-btn-primary" 
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleCreateContract}
                disabled={!newContract.title || !newContract.description}
              >
                POST BEACON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-label">// NAVCOM_CONNECT</div>
          <h1 className="page-title">Mercenary Beacons</h1>
          <p className="page-subtitle">Player-to-player contracts and services</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="font-mono text-muted" style={{ fontSize: 11 }}>MY SHARD:</span>
            <input
              type="text"
              className="nc-input"
              placeholder="e.g., 360"
              value={myShard}
              onChange={e => setMyShard(e.target.value)}
              style={{ width: 80, padding: '8px 12px' }}
              data-testid="shard-input"
            />
          </div>
          <button 
            className="nc-btn nc-btn-primary"
            onClick={() => setShowCreate(true)}
            data-testid="create-contract-btn"
          >
            <Plus size={16} />
            POST BEACON
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: 24 }}>
        <div className="nc-toggle-group" data-testid="contract-filter">
          <button
            className={`nc-toggle ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {CONTRACT_TYPES.map(type => (
            <button
              key={type.id}
              className={`nc-toggle ${filter === type.id ? 'active' : ''}`}
              onClick={() => setFilter(type.id)}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, background: 'var(--nc-red)', borderRadius: 2 }} />
          <span className="font-mono text-muted" style={{ fontSize: 11 }}>MY SHARD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, background: 'var(--nc-orange)', borderRadius: 2 }} />
          <span className="font-mono text-muted" style={{ fontSize: 11 }}>GLOBAL</span>
        </div>
      </div>

      {/* Contracts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredContracts.map(contract => {
          const type = getContractType(contract.type);
          const isMyShard = isMyShardContract(contract);
          
          return (
            <div 
              key={contract.id} 
              className={`contract-card ${isMyShard ? 'my-shard' : 'global'}`}
              data-testid={`contract-${contract.id}`}
            >
              <div className="contract-header">
                <div className="contract-type">
                  <span className="contract-type-icon">{type.icon}</span>
                  <span className="contract-type-label">{type.label.toUpperCase()}</span>
                  {contract.rescue_type && (
                    <span className="font-mono text-muted" style={{ fontSize: 10 }}>
                      ({contract.rescue_type === 'body_marker' ? 'Body Marker' : 'Pickup'})
                    </span>
                  )}
                </div>
                <span className="contract-time">{getTimeAgo(contract.created_at)}</span>
              </div>

              <h3 className="contract-title">{contract.title}</h3>
              <p className="contract-desc">{contract.description}</p>

              <div className="contract-meta">
                <div className="contract-meta-item">
                  <MapPin size={12} />
                  {contract.location}
                </div>
                <div className="contract-meta-item">
                  <Users size={12} />
                  Shard {contract.shard || 'Any'}
                </div>
                <div className="contract-meta-item">
                  <Star size={12} className="text-gold" />
                  {contract.poster.reputation.toFixed(1)}
                </div>
                {contract.poster.is_supporter && (
                  <span className="supporter-badge" style={{ marginLeft: 'auto' }}>SYNDICATE</span>
                )}
              </div>

              <div className="contract-actions">
                <button
                  className="nc-btn nc-btn-secondary"
                  onClick={() => handleCopyHandle(contract.poster.handle)}
                  data-testid={`copy-handle-${contract.id}`}
                >
                  {copiedHandle === contract.poster.handle ? (
                    <>
                      <Check size={14} className="text-green" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy RSI Handle
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {filteredContracts.length === 0 && (
          <div className="nc-card" style={{ textAlign: 'center', padding: 48 }}>
            <Users size={48} className="text-muted" style={{ marginBottom: 16, opacity: 0.5 }} />
            <h3 className="font-display text-muted" style={{ fontSize: 16, marginBottom: 8 }}>
              No Active Beacons
            </h3>
            <p className="text-muted" style={{ fontSize: 14 }}>
              Be the first to post a contract!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
