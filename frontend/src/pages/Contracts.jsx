import { useState, useEffect } from 'react';
import { Shield, Heart, Package, Users, Copy, Star, MapPin, Clock, Check, Plus, X, ThumbsUp, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';

const CONTRACT_TYPES = [
  { id: 'security', label: 'Security', icon: '🛡️', color: '#00f0ff' },
  { id: 'rescue', label: 'Rescue', icon: '🚑', color: '#00ff88' },
  { id: 'transport', label: 'Transport', icon: '📦', color: '#ffcc00' },
  { id: 'operations', label: 'Operations', icon: '🤝', color: '#ff9933' }
];

// Structured dropdown options by contract type
const CONTRACT_OPTIONS = {
  security: {
    activity: ['Escort', 'Bunker Clear', 'Airspace Defense', 'Bounty Assist'],
    threat: ['Low Risk (PVE)', 'High Risk (PVP)', 'Critical'],
    cargo_value: ['Low Value', 'Medium Value', 'High Value (Whale)']
  },
  rescue: {
    status: ['Incapacitated (Revive)', 'Stranded (Pickup)', 'Under Fire'],
    environment: ['Space', 'Ground', 'Bunker (Hostile)', 'Bunker (Safe)']
  },
  transport: {
    load: ['Single Passenger', 'Squad (2+)', 'Small Cargo'],
    destination: ['Orbital Station', 'Ground Outpost', 'Major City']
  },
  operations: {
    job: ['Mining Crew', 'Salvage Crew', 'Event Support'],
    role: ['Turret Gunner', 'Box Mover', 'Pilot', 'Medic'],
    compensation: ['Flat Fee', 'Equal Split', 'Negotiated %']
  }
};

// Major landing zones/stations for Escort routes
const MAJOR_LOCATIONS = [
  'Port Olisar', 'Grim HEX', 'Orison', 'Lorville', 'Area 18', 'New Babbage',
  'Port Tressler', 'Baijini Point', 'Everus Harbor', 'CRU-L1', 'HUR-L1', 'ARC-L1', 'MIC-L1'
];

// Location dropdowns
const SYSTEMS = ['Stanton'];
const LOCATIONS = {
  'Stanton': {
    'Crusader': ['Port Olisar', 'Grim HEX', 'Yela', 'Cellin', 'Daymar', 'Orison'],
    'Hurston': ['Lorville', 'HDMS Oparei', 'HDMS Thedus', 'Aberdeen', 'Arial', 'Magda', 'Ita'],
    'ArcCorp': ['Area 18', 'Baijini Point', 'Lyria', 'Wala'],
    'microTech': ['New Babbage', 'Port Tressler', 'Calliope', 'Clio', 'Euterpe']
  }
};

const MOCK_CONTRACTS = [
  {
    id: '1',
    type: 'security',
    activity: 'Escort',
    start_location: 'Port Olisar',
    end_location: 'Area 18',
    cargo_value: 'High Value (Whale)',
    payment_amount: 75000,
    system: 'Stanton',
    planet: 'ArcCorp',
    location: 'Area 18',
    shard: '360',
    poster: { handle: 'CaptainVex', reputation: 4.8, is_supporter: true },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'open'
  },
  {
    id: '2',
    type: 'rescue',
    status_select: 'Incapacitated (Revive)',
    environment: 'Bunker (Hostile)',
    payment_amount: 15000,
    system: 'Stanton',
    planet: 'Crusader',
    location: 'Daymar',
    shard: '422',
    poster: { handle: 'MedRunnerX', reputation: 4.5, is_supporter: false },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'open'
  },
  {
    id: '3',
    type: 'transport',
    load: 'Single Passenger',
    destination: 'Major City',
    payment_amount: 8000,
    system: 'Stanton',
    planet: 'microTech',
    location: 'New Babbage',
    shard: '360',
    poster: { handle: 'GroundOps', reputation: 4.2, is_supporter: false },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'open'
  },
  {
    id: '4',
    type: 'operations',
    job: 'Mining Crew',
    role: 'Turret Gunner',
    compensation_type: 'Equal Split',
    payment_amount: 0,
    system: 'Stanton',
    planet: 'Crusader',
    location: 'Yela',
    shard: '512',
    poster: { handle: 'RockBreaker', reputation: 4.9, is_supporter: true },
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'open'
  },
  {
    id: '5',
    type: 'security',
    activity: 'Bunker Clear',
    threat: 'Critical',
    payment_amount: 35000,
    system: 'Stanton',
    planet: 'Hurston',
    location: 'HDMS Oparei',
    shard: '360',
    poster: { handle: 'ShadowOps', reputation: 4.7, is_supporter: false },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'open'
  }
];

export default function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState(MOCK_CONTRACTS);
  const [filter, setFilter] = useState('all');
  const [myShard, setMyShard] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showReview, setShowReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [copiedHandle, setCopiedHandle] = useState(null);

  // New contract form state
  const [newContract, setNewContract] = useState({
    type: 'security',
    // Security fields
    activity: '',
    threat: '',
    // Escort-specific fields
    start_location: '',
    end_location: '',
    cargo_value: '',
    // Rescue fields
    status_select: '',
    environment: '',
    // Transport fields
    load: '',
    destination: '',
    // Operations fields
    job: '',
    role: '',
    compensation_type: 'Flat Fee',
    // Payment (global)
    payment_amount: '',
    // Location fields
    system: 'Stanton',
    planet: '',
    location: ''
  });

  const isEscort = newContract.type === 'security' && newContract.activity === 'Escort';
  const isOperations = newContract.type === 'operations';
  const showPaymentField = !isOperations || newContract.compensation_type === 'Flat Fee';

  // Generate title based on contract type and selections
  const generateTitle = (contract) => {
    switch (contract.type) {
      case 'security':
        if (contract.activity === 'Escort' && contract.start_location && contract.end_location) {
          return `Escort: ${contract.start_location} → ${contract.end_location} (${contract.cargo_value || 'Standard'})`;
        }
        return contract.activity && contract.threat 
          ? `${contract.activity} - ${contract.threat}` 
          : '';
      case 'rescue':
        return contract.status_select && contract.environment 
          ? `${contract.status_select} - ${contract.environment}` 
          : '';
      case 'transport':
        return contract.load && contract.destination 
          ? `${contract.load} to ${contract.destination}` 
          : '';
      case 'operations':
        const comp = contract.compensation_type !== 'Flat Fee' ? ` (${contract.compensation_type})` : '';
        return contract.job && contract.role 
          ? `${contract.job} - Need ${contract.role}${comp}` 
          : '';
      default:
        return '';
    }
  };

  // Check if contract form is valid
  const isContractValid = () => {
    // Payment validation (except for split compensation)
    if (showPaymentField && (!newContract.payment_amount || isNaN(parseInt(newContract.payment_amount)))) {
      return false;
    }
    
    switch (newContract.type) {
      case 'security':
        if (newContract.activity === 'Escort') {
          return newContract.start_location && newContract.end_location && newContract.cargo_value;
        }
        return newContract.activity && newContract.threat && newContract.planet && newContract.location;
      case 'rescue':
        return newContract.status_select && newContract.environment && newContract.planet && newContract.location;
      case 'transport':
        return newContract.load && newContract.destination && newContract.planet && newContract.location;
      case 'operations':
        return newContract.job && newContract.role && newContract.planet && newContract.location;
      default:
        return false;
    }
  };

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

  const handleCopyHandle = async (handle) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(handle);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = handle;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedHandle(handle);
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
      setCopiedHandle(handle);
      setTimeout(() => setCopiedHandle(null), 2000);
    }
  };

  const handleCreateContract = async () => {
    if (!isContractValid()) return;

    const title = generateTitle(newContract);
    const locationStr = `${newContract.planet} - ${newContract.location}`;

    try {
      const response = await axios.post(`${API}/contracts`, {
        type: newContract.type,
        title,
        // Include structured fields
        activity: newContract.activity,
        threat: newContract.threat,
        status_select: newContract.status_select,
        environment: newContract.environment,
        load: newContract.load,
        destination: newContract.destination,
        job: newContract.job,
        role: newContract.role,
        system: newContract.system,
        planet: newContract.planet,
        location: locationStr,
        shard: myShard
      });
      setContracts(prev => [response.data, ...prev]);
      setShowCreate(false);
      setNewContract({ type: 'security', title: '', description: '', location: '', rescue_type: 'pickup' });
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };

  const handleAcceptContract = async (contractId) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/accept`);
      fetchContracts();
    } catch (error) {
      console.error('Failed to accept contract:', error);
    }
  };

  const handleCompleteContract = async (contractId) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/complete`);
      fetchContracts();
    } catch (error) {
      console.error('Failed to complete contract:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!showReview) return;
    try {
      await axios.post(`${API}/contracts/${showReview.id}/review`, {
        contract_id: showReview.id,
        rating: reviewRating,
        comment: reviewComment,
        review_type: showReview.isClient ? 'client_to_merc' : 'merc_to_client'
      });
      setShowReview(null);
      setReviewRating(5);
      setReviewComment('');
      fetchContracts();
    } catch (error) {
      console.error('Failed to submit review:', error);
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

  const canAccept = (contract) => user && contract.status === 'open' && contract.poster_id !== user.id;
  const canComplete = (contract) => user && contract.status === 'active' && 
    (contract.poster_id === user.id || contract.accepted_by?.id === user.id);
  const canReview = (contract) => {
    if (!user || contract.status !== 'completed') return false;
    const isClient = contract.poster_id === user.id;
    const isMerc = contract.accepted_by?.id === user.id;
    if (isClient && !contract.client_review) return { isClient: true };
    if (isMerc && !contract.merc_review) return { isClient: false };
    return false;
  };

  return (
    <div className="navcom-page" data-testid="contracts-page">
      {/* Review Modal */}
      {showReview && (
        <div className="mission-modal-overlay" onClick={() => setShowReview(null)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// REVIEW</div>
                <h2 className="mission-title">Rate {showReview.isClient ? 'Mercenary' : 'Client'}</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowReview(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              <div className="rating-stars">
                {[1,2,3,4,5].map(star => (
                  <button 
                    key={star} 
                    onClick={() => setReviewRating(star)}
                    className={`star-btn ${star <= reviewRating ? 'active' : ''}`}
                  >
                    <Star size={32} fill={star <= reviewRating ? '#FFD700' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea
                className="nc-input"
                rows={3}
                placeholder="Optional comment..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                style={{ marginTop: 16 }}
              />
              <button className="nc-btn nc-btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={handleSubmitReview}>
                SUBMIT REVIEW
              </button>
            </div>
          </div>
        </div>
      )}

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
                      onClick={() => setNewContract(prev => ({ 
                        ...prev, 
                        type: type.id,
                        activity: '', threat: '', status_select: '', environment: '',
                        load: '', destination: '', job: '', role: ''
                      }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECURITY Options */}
              {newContract.type === 'security' && (
                <>
                  <div className="form-group">
                    <label className="nc-label">ACTIVITY</label>
                    <select 
                      className="nc-input"
                      value={newContract.activity}
                      onChange={e => setNewContract(prev => ({ ...prev, activity: e.target.value }))}
                    >
                      <option value="">Select activity...</option>
                      {CONTRACT_OPTIONS.security.activity.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="nc-label">THREAT LEVEL</label>
                    <select 
                      className="nc-input"
                      value={newContract.threat}
                      onChange={e => setNewContract(prev => ({ ...prev, threat: e.target.value }))}
                    >
                      <option value="">Select threat level...</option>
                      {CONTRACT_OPTIONS.security.threat.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* RESCUE Options */}
              {newContract.type === 'rescue' && (
                <>
                  <div className="form-group">
                    <label className="nc-label">STATUS</label>
                    <select 
                      className="nc-input"
                      value={newContract.status_select}
                      onChange={e => setNewContract(prev => ({ ...prev, status_select: e.target.value }))}
                    >
                      <option value="">Select status...</option>
                      {CONTRACT_OPTIONS.rescue.status.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="nc-label">ENVIRONMENT</label>
                    <select 
                      className="nc-input"
                      value={newContract.environment}
                      onChange={e => setNewContract(prev => ({ ...prev, environment: e.target.value }))}
                    >
                      <option value="">Select environment...</option>
                      {CONTRACT_OPTIONS.rescue.environment.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* TRANSPORT Options */}
              {newContract.type === 'transport' && (
                <>
                  <div className="form-group">
                    <label className="nc-label">LOAD TYPE</label>
                    <select 
                      className="nc-input"
                      value={newContract.load}
                      onChange={e => setNewContract(prev => ({ ...prev, load: e.target.value }))}
                    >
                      <option value="">Select load...</option>
                      {CONTRACT_OPTIONS.transport.load.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="nc-label">DESTINATION TYPE</label>
                    <select 
                      className="nc-input"
                      value={newContract.destination}
                      onChange={e => setNewContract(prev => ({ ...prev, destination: e.target.value }))}
                    >
                      <option value="">Select destination type...</option>
                      {CONTRACT_OPTIONS.transport.destination.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* OPERATIONS Options */}
              {newContract.type === 'operations' && (
                <>
                  <div className="form-group">
                    <label className="nc-label">JOB TYPE</label>
                    <select 
                      className="nc-input"
                      value={newContract.job}
                      onChange={e => setNewContract(prev => ({ ...prev, job: e.target.value }))}
                    >
                      <option value="">Select job...</option>
                      {CONTRACT_OPTIONS.operations.job.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="nc-label">ROLE NEEDED</label>
                    <select 
                      className="nc-input"
                      value={newContract.role}
                      onChange={e => setNewContract(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="">Select role...</option>
                      {CONTRACT_OPTIONS.operations.role.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Location Selectors */}
              <div className="form-group">
                <label className="nc-label">LOCATION</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <select 
                    className="nc-input"
                    value={newContract.planet}
                    onChange={e => setNewContract(prev => ({ ...prev, planet: e.target.value, location: '' }))}
                  >
                    <option value="">Planet/Area...</option>
                    {Object.keys(LOCATIONS['Stanton']).map(planet => (
                      <option key={planet} value={planet}>{planet}</option>
                    ))}
                  </select>
                  <select 
                    className="nc-input"
                    value={newContract.location}
                    onChange={e => setNewContract(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!newContract.planet}
                  >
                    <option value="">Specific location...</option>
                    {newContract.planet && LOCATIONS['Stanton'][newContract.planet]?.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Generated Title */}
              {generateTitle(newContract) && (
                <div className="form-group" style={{ background: 'var(--nc-bg-secondary)', padding: 16, border: '1px solid var(--nc-border)' }}>
                  <label className="nc-label" style={{ marginBottom: 8 }}>GENERATED TITLE</label>
                  <div style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16, color: 'var(--nc-cyan)' }}>
                    {generateTitle(newContract)}
                  </div>
                </div>
              )}

              <button 
                className="nc-btn nc-btn-primary" 
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleCreateContract}
                disabled={!isContractValid()}
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
          
          // Generate display info based on contract type
          const getContractDetails = () => {
            switch (contract.type) {
              case 'security':
                return { 
                  subtitle: contract.threat || 'Standard',
                  detail: contract.activity || contract.title
                };
              case 'rescue':
                return { 
                  subtitle: contract.environment || 'Unknown',
                  detail: contract.status_select || contract.title
                };
              case 'transport':
                return { 
                  subtitle: contract.destination || 'Destination',
                  detail: contract.load || contract.title
                };
              case 'operations':
                return { 
                  subtitle: `Need ${contract.role || 'Crew'}`,
                  detail: contract.job || contract.title
                };
              default:
                return { subtitle: '', detail: contract.title };
            }
          };
          
          const details = getContractDetails();
          const displayTitle = contract.activity 
            ? generateTitle(contract) 
            : contract.title;
          
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
                  {details.subtitle && (
                    <span className="contract-threat-badge" style={{ 
                      background: contract.threat?.includes('Critical') ? 'rgba(255,51,102,0.2)' : 
                                  contract.threat?.includes('PVP') ? 'rgba(255,153,0,0.2)' : 
                                  'rgba(0,240,255,0.15)',
                      color: contract.threat?.includes('Critical') ? '#ff3366' : 
                             contract.threat?.includes('PVP') ? '#ff9900' : 
                             'var(--nc-cyan)',
                      padding: '2px 8px',
                      fontSize: 10,
                      fontFamily: 'var(--nc-font-mono)'
                    }}>
                      {details.subtitle}
                    </span>
                  )}
                </div>
                <span className="contract-time">{getTimeAgo(contract.created_at)}</span>
              </div>

              <h3 className="contract-title">{displayTitle || details.detail}</h3>

              <div className="contract-meta">
                <div className="contract-meta-item">
                  <MapPin size={12} />
                  {contract.location || `${contract.planet} - ${contract.location}`}
                </div>
                <div className="contract-meta-item">
                  <Users size={12} />
                  Shard {contract.shard || 'Any'}
                </div>
                <div className="contract-meta-item">
                  <Star size={12} className="text-gold" />
                  {contract.poster?.reputation?.toFixed(1) || '5.0'}
                </div>
                {contract.poster?.is_supporter && (
                  <span className="supporter-badge" style={{ marginLeft: 'auto' }}>SYNDICATE</span>
                )}
              </div>

              <div className="contract-actions">
                <button
                  className="nc-btn nc-btn-secondary"
                  onClick={() => handleCopyHandle(contract.poster?.handle || 'Unknown')}
                  data-testid={`copy-handle-${contract.id}`}
                >
                  {copiedHandle === contract.poster?.handle ? (
                    <><Check size={14} className="text-green" /> Copied!</>
                  ) : (
                    <><Copy size={14} /> Copy Handle</>
                  )}
                </button>
                {canAccept(contract) && (
                  <button className="nc-btn nc-btn-primary" onClick={() => handleAcceptContract(contract.id)}>
                    <ThumbsUp size={14} /> Accept
                  </button>
                )}
                {canComplete(contract) && (
                  <button className="nc-btn nc-btn-primary" onClick={() => handleCompleteContract(contract.id)}>
                    <Check size={14} /> Complete
                  </button>
                )}
                {canReview(contract) && (
                  <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, ...canReview(contract) })}>
                    <Star size={14} /> Rate
                  </button>
                )}
              </div>
              {(contract.client_review || contract.merc_review) && (
                <div className="contract-reviews">
                  {contract.client_review && (
                    <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Client: {contract.client_review.rating}/5
                    </div>
                  )}
                  {contract.merc_review && (
                    <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Merc: {contract.merc_review.rating}/5
                    </div>
                  )}
                </div>
              )}
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
