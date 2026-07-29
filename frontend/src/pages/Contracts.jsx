import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Heart, Package, Users, Copy, Star, MapPin, Clock, Check, Plus, X, ThumbsUp, ArrowRight, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';
import { CONTRACT_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS } from '../constants/badges';
import { useBleedoutCountdown, HeartMonitor } from '../utils/bleedout';
import DiscordBadge from '../components/DiscordBadge';

const RescueCardSummary = ({ contract }) => {
  const { label, expired } = useBleedoutCountdown(contract.rescue_bleedout_expires_at);
  const pills = [
    contract.rescue_injury_tier && `Injury: ${contract.rescue_injury_tier}`,
    contract.rescue_pvp_area && `PvP: ${contract.rescue_pvp_area}`,
    contract.rescue_hostile_npcs && `NPCs: ${contract.rescue_hostile_npcs}`,
    contract.rescue_aa_turrets && `AA: ${contract.rescue_aa_turrets}`,
    contract.rescue_needs_food_hydration && `Food/Water: ${contract.rescue_needs_food_hydration}`,
  ].filter(Boolean);
  return (
    <div data-testid="rescue-card-summary" style={{
      marginTop: 8,
      padding: '8px 12px',
      background: 'rgba(255, 0, 68, 0.06)',
      border: '1px solid rgba(255, 0, 68, 0.25)',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
    }}>
      {contract.rescue_bleedout_expires_at && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: expired ? '#888' : '#ff4466', fontFamily: 'var(--nc-font-mono)', fontSize: 13 }}>
          <HeartMonitor flatline={expired} />
          <span data-testid="bleedout-countdown">{expired ? 'Deceased' : label}</span>
        </div>
      )}
      {pills.map((p, i) => (
        <span key={i} style={{ fontSize: 11, fontFamily: 'var(--nc-font-mono)', color: 'var(--nc-text-secondary)', padding: '2px 8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {p}
        </span>
      ))}
      <span style={{ fontSize: 11, fontFamily: 'var(--nc-font-mono)', color: 'var(--nc-text-muted)', marginLeft: 'auto' }}>
        Exact location hidden until accepted
      </span>
    </div>
  );
};

// Preset roles for multi-crew contracts
const PRESET_ROLES = [
  'Pilot',
  'Co-Pilot',
  'Turret Gunner',
  'Marine / FPS',
  'Medic',
  'Engineer / Repair',
  'Cargo Handler',
  'Mining Operator',
  'Salvage Operator',
  'Scout',
  'Security',
  'Navigator'
];

// Location dropdowns - All Systems
const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];
const LOCATIONS = {
  'Stanton': {
    'Crusader': ['Port Olisar', 'Grim HEX', 'Yela', 'Cellin', 'Daymar', 'Orison', 'CRU-L1'],
    'Hurston': ['Lorville', 'Everus Harbor', 'HDMS Oparei', 'HDMS Thedus', 'Aberdeen', 'Arial', 'Magda', 'Ita'],
    'ArcCorp': ['Area 18', 'Baijini Point', 'Lyria', 'Wala', 'ARC-L1'],
    'microTech': ['New Babbage', 'Port Tressler', 'Calliope', 'Clio', 'Euterpe', 'MIC-L1']
  },
  'Pyro': {
    'Pyro I': ['Pyro I Surface'],
    'Pyro II': ['Pyro II Surface'],
    'Pyro III': ['Pyro III Surface'],
    'Pyro IV': ['Checkmate Station'],
    'Pyro V': ['Pyro V Surface'],
    'Pyro VI': ['Pyro VI Surface'],
    'Ruin Station': ['Ruin Station']
  },
  'Nyx': {
    'Delamar': ['Levski'],
    'Nyx I': ['Nyx I Surface'],
    'Nyx II': ['Nyx II Surface']
  }
};

// Manifest Builder Component for Multi-Crew Contracts
const ManifestBuilder = ({ manifest, onChange, basePayout, onBasePayoutChange }) => {
  const [selectedRole, setSelectedRole] = useState(PRESET_ROLES[0]);
  const [quickFillCount, setQuickFillCount] = useState(1);

  const addRoles = () => {
    const newSlots = Array.from({ length: quickFillCount }, () => ({
      role: selectedRole,
      payout: basePayout,
      status: 'OPEN',
      applicant_id: null,
      bids: []
    }));
    onChange([...manifest, ...newSlots]);
    setQuickFillCount(1);
  };

  const removeSlot = (index) => {
    onChange(manifest.filter((_, i) => i !== index));
  };

  const updateSlotPayout = (index, newPayout) => {
    const updated = manifest.map((slot, i) =>
      i === index ? { ...slot, payout: parseInt(newPayout) || 0 } : slot
    );
    onChange(updated);
  };

  const totalPayout = manifest.reduce((sum, slot) => sum + slot.payout, 0);

  return (
    <div style={{
      background: 'rgba(0, 240, 255, 0.03)',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      padding: '20px',
      marginTop: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <Users size={18} color="var(--nc-cyan)" />
        <span style={{ color: 'var(--nc-cyan)', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>
          CREW MANIFEST BUILDER
        </span>
      </div>

      <div className="form-group">
        <label className="nc-label">BASE PAYOUT PER MEMBER (aUEC)</label>
        <input
          type="number"
          value={basePayout}
          onChange={(e) => onBasePayoutChange(parseInt(e.target.value) || 0)}
          className="nc-input"
          style={{ width: '200px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="nc-input"
          style={{ width: '180px' }}
        >
          {PRESET_ROLES.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>×</span>
          <input
            type="number"
            min="1"
            max="20"
            value={quickFillCount}
            onChange={(e) => setQuickFillCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="nc-input"
            style={{ width: '60px', textAlign: 'center' }}
          />
        </div>

        <button
          type="button"
          onClick={addRoles}
          className="nc-btn nc-btn-primary"
          style={{ padding: '10px 16px', fontSize: '12px' }}
        >
          <Plus size={14} />
          ADD ROLE{quickFillCount > 1 ? 'S' : ''}
        </button>
      </div>

      {manifest.length > 0 && (
        <>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '1px', marginBottom: '10px' }}>
            CREW ROSTER ({manifest.length} SLOTS)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {manifest.map((slot, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 15px',
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.15)'
                }}
              >
                <span style={{ color: 'var(--nc-cyan)', fontWeight: 'bold' }}>{slot.role}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    value={slot.payout}
                    onChange={(e) => updateSlotPayout(index, e.target.value)}
                    className="nc-input"
                    style={{ width: '100px', textAlign: 'right', padding: '6px 10px' }}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>aUEC</span>
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    style={{
                      background: 'rgba(255, 77, 77, 0.2)',
                      border: '1px solid rgba(255, 77, 77, 0.5)',
                      color: '#ff4d4d',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '15px',
            padding: '10px 15px',
            background: 'rgba(0, 240, 255, 0.05)',
            borderTop: '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '13px'
          }}>
            <span>TOTAL CREW: {manifest.length}</span>
            <span style={{ color: 'var(--nc-gold)' }}>TOTAL PAYOUT: {totalPayout.toLocaleString()} aUEC</span>
          </div>
        </>
      )}

      {manifest.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '30px', fontSize: '13px' }}>
          No crew slots defined. Select a role and click ADD to build your manifest.
        </div>
      )}
    </div>
  );
};

export default function Contracts() {
  const { user, userShard } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState([]);
  const [myContracts, setMyContracts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('feed'); // 'feed' or 'my'
  const [showCreate, setShowCreate] = useState(false);
  const [showReview, setShowReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [multiRating, setMultiRating] = useState(null); // { contractId, participants:[{id,handle,rating,comment,submitted}] }
  const [copiedHandle, setCopiedHandle] = useState(null);
  const [myShard, setMyShard] = useState('');
  
  // Bidding system state
  const [myBids, setMyBids] = useState([]);
  const [activeContract, setActiveContract] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(null);
  const [contractBids, setContractBids] = useState([]);
  const [showHandshakeModal, setShowHandshakeModal] = useState(null);
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [showMercProfile, setShowMercProfile] = useState(null);
  const [acceptedBidNotification, setAcceptedBidNotification] = useState(null);
  
  // Multi-crew state
  const [isMultiCrew, setIsMultiCrew] = useState(false);
  const [manifest, setManifest] = useState([]);
  const [basePayout, setBasePayout] = useState(50000);
  
  // Duration state
  const [duration, setDuration] = useState(60);

  // Handle ?action=create from QuickActions FAB
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreate(true);
      // Clear the param so it doesn't persist
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Check for accepted bids (merc notification)
  useEffect(() => {
    const checkAcceptedBids = async () => {
      try {
        const response = await axios.get(`${API}/user/accepted-bids`);
        if (response.data && response.data.length > 0) {
          // Show notification for the first unacknowledged accepted bid
          setAcceptedBidNotification(response.data[0]);
        }
      } catch (e) {
        console.debug('Failed to check accepted bids:', e);
      }
    };
    
    if (user) {
      checkAcceptedBids();
      // Poll every 10 seconds for accepted bids
      const interval = setInterval(checkAcceptedBids, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const acknowledgeAcceptedBid = async (bidId) => {
    try {
      await axios.post(`${API}/user/accepted-bids/${bidId}/acknowledge`);
      setAcceptedBidNotification(null);
    } catch (e) {
      console.error('Failed to acknowledge bid:', e);
    }
  };

  // New contract form state
  const [newContract, setNewContract] = useState({
    category: 'COMBAT',
    title: '',
    description: '',
    // Payment (global)
    payment_amount: '',
    compensation_type: 'Flat Fee',
    split_profits: false,
    // Legacy location fields (kept for backward compatibility)
    system: 'Stanton',
    planet: '',
    location: '',
    // Timing
    timing_type: 'now',
    scheduled_date: '',
    scheduled_time: '',
    scheduled_timezone: 'UTC',
    // Simplified meeting location
    meeting_visibility: 'public',
    meeting_system: '',
    meeting_major_location: '',
    // Medical / Rescue PUBLIC fields
    rescue_bleedout_minutes: 30,
    rescue_injury_tier: 'Unknown',
    rescue_pvp_area: 'Unknown',
    rescue_hostile_npcs: 'Unknown',
    rescue_aa_turrets: 'Unknown',
    rescue_needs_food_hydration: 'Unknown',
    // Medical / Rescue PRIVATE fields
    rescue_exact_location: '',
    rescue_body_location: '',
    rescue_private_notes: '',
    // Group join mode (multi-join events)
    join_mode: '',  // '' = use server default, otherwise 'single' | 'multi'
    max_participants: 8,
  });

  const isLfg = newContract.category === 'LFG';
  const isMedical = newContract.category === 'MEDICAL';
  const isFuture = newContract.timing_type === 'future';
  const showPaymentField = !isLfg && !isMultiCrew && newContract.compensation_type === 'Flat Fee' && !newContract.split_profits;

  // Effective join_mode for this draft post — resolved client-side just for the form;
  // server resolves the canonical value too.
  const effectiveJoinMode = newContract.join_mode || (isLfg || isFuture ? 'multi' : 'single');
  const isMultiJoin = effectiveJoinMode === 'multi';

  // Major locations per system (curated — major hubs only)
  const MAJOR_LOCATIONS = {
    Stanton: ['Area18', 'Baijini Point', 'Orison', 'Seraphim Station', 'Grim HEX', 'Lorville', 'Everus Harbor', 'New Babbage', 'Port Tressler'],
    Pyro: ['Checkmate Station', 'Ruin Station', 'Pyro Gateway'],
    Nyx: ['Levski', 'Delamar', 'Nyx Gateway'],
  };

  const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'];

  // Generate title based on category
  const generateTitle = (contract) => {
    const cat = CATEGORY_LABELS[contract.category] || 'Contract';
    return contract.title || `${cat} Contract`;
  };

  // Check if contract form is valid
  const isContractValid = () => {
    const c = newContract;
    // Title always required
    if (!c.title) return false;
    // Future scheduling requires date+time
    if (c.timing_type === 'future' && (!c.scheduled_date || !c.scheduled_time)) return false;
    // Public meeting location requires system — but multi-crew hides the meeting-location UI
    // and coordinates via manifest slots, so don't gate the submit on it.
    if (!isMultiCrew && c.meeting_visibility === 'public' && !c.meeting_system) return false;

    // Medical / Rescue
    if (isMedical) {
      if (!c.meeting_system) return false;
      if (!c.rescue_exact_location) return false;
      if (!c.payment_amount || isNaN(parseInt(c.payment_amount))) return false;
      return true;
    }

    if (isLfg) return true;
    if (isMultiCrew) return manifest.length > 0;
    if (showPaymentField && (!c.payment_amount || isNaN(parseInt(c.payment_amount)))) return false;
    return true;
  };

  useEffect(() => {
    fetchContracts();
    fetchUserStatus();
    fetchMyContracts();
  }, [filter]);

  const fetchContracts = async () => {
    try {
      // 'all' = no filter; 'paid' = exclude LFG; specific category filter passes through
      const params = (filter !== 'all' && filter !== 'paid') ? { category: filter } : {};
      const response = await axios.get(`${API}/contracts`, { params });
      let data = response.data || [];
      if (filter === 'paid') {
        data = data.filter(c => c.category !== 'LFG');
      }
      if (data.length > 0) {
        setContracts(data);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
  };

  const fetchMyContracts = async () => {
    try {
      const response = await axios.get(`${API}/user/my-contracts`);
      setMyContracts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch my contracts:', error);
    }
  };

  const fetchUserStatus = async () => {
    try {
      const [activeRes, bidsRes] = await Promise.all([
        axios.get(`${API}/user/active-contract`),
        axios.get(`${API}/user/my-bids`)
      ]);
      setHasActiveContract(activeRes.data?.has_active || false);
      setActiveContract(activeRes.data?.contract || null);
      setMyBids(bidsRes.data || []);
    } catch (e) {
      console.error('Failed to fetch user status:', e);
    }
  };

  const handleBid = async (contractId) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/bid`);
      setMyBids(prev => [...prev, { contract_id: contractId, status: 'pending' }]);
      fetchUserStatus();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit bid');
    }
  };

  const fetchBids = async (contractId) => {
    try {
      const response = await axios.get(`${API}/contracts/${contractId}/bids`);
      setContractBids(response.data || []);
      setShowBidsModal(contractId);
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    }
  };

  const handleAcceptBid = async (contractId, bidId, mercHandle) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/bids/${bidId}/accept`);
      setShowBidsModal(null);
      setShowHandshakeModal({ type: 'poster', handle: mercHandle });
      fetchContracts();
      fetchUserStatus();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to accept bid');
    }
  };

  const handleDeclineBid = async (contractId, bidId) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/bids/${bidId}/decline`);
      setContractBids(prev => prev.filter(b => b.id !== bidId));
    } catch (error) {
      alert('Failed to decline bid');
    }
  };

  const _collectParticipants = (contract) => {
    if (!contract) return [];
    const seen = new Set();
    const out = [];
    (contract.accepted_participants || []).forEach(p => {
      if (p?.id && !seen.has(p.id) && p.id !== contract.poster_id) {
        seen.add(p.id);
        out.push({ id: p.id, handle: p.rsi_handle || p.handle, slot: null });
      }
    });
    (contract.manifest || []).forEach(slot => {
      const ab = slot.accepted_by;
      if (ab?.id && !seen.has(ab.id) && ab.id !== contract.poster_id) {
        seen.add(ab.id);
        out.push({ id: ab.id, handle: ab.rsi_handle || ab.handle, slot: slot.role || slot.slot_name || null });
      }
    });
    return out;
  };

  const _openMultiRatingIfNeeded = (contract) => {
    if (!contract || contract.poster_id !== user?.id) return false;
    const isMulti = contract.join_mode === 'multi' || contract.is_multi_crew;
    if (!isMulti) return false;
    const participants = _collectParticipants(contract);
    if (participants.length === 0) return false;
    setMultiRating({
      contractId: contract.id,
      contractTitle: contract.title,
      participants: participants.map(p => ({ ...p, rating: 0, comment: '', submitted: false })),
    });
    return true;
  };

  const handleMarkComplete = async (contract) => {
    const contractId = typeof contract === 'string' ? contract : contract?.id;
    const isMulti = typeof contract === 'object' && (contract.join_mode === 'multi' || contract.is_multi_crew);
    try {
      const endpoint = isMulti ? 'mark-complete-multi' : 'mark-complete';
      const response = await axios.post(`${API}/contracts/${contractId}/${endpoint}`);
      // Multi-role poster gets the per-participant rating prompt.
      const opened = typeof contract === 'object' ? _openMultiRatingIfNeeded(contract) : false;
      if (!opened && response.data.show_rating) {
        setShowReview({ id: contractId, role: 'both' });
      }
      fetchContracts();
      fetchUserStatus();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to mark complete');
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

  const handleCancelContract = async (contractId) => {
    if (!window.confirm('Are you sure you want to cancel this contract?')) return;
    try {
      await axios.post(`${API}/contracts/${contractId}/cancel`);
      // Update local state
      setContracts(prev => prev.map(c => 
        c.id === contractId ? { ...c, status: 'cancelled' } : c
      ));
      setMyContracts(prev => prev.map(c => 
        c.id === contractId ? { ...c, status: 'cancelled' } : c
      ));
    } catch (error) {
      console.error('Failed to cancel contract:', error);
      alert(error.response?.data?.detail || 'Failed to cancel contract');
    }
  };

  const handleCreateContract = async () => {
    if (!isContractValid()) return;

    const c = newContract;
    const title = generateTitle(c);
    const cat = CATEGORY_LABELS[c.category] || 'Contract';
    const paymentAmount = (isMedical || showPaymentField) ? (parseInt(c.payment_amount) || 0) : 0;

    // Build display location string (legacy compatibility + cards)
    let locationStr;
    if (c.meeting_visibility === 'disclosed_on_acceptance') {
      locationStr = 'Disclosed on Acceptance';
    } else if (c.meeting_system && c.meeting_major_location) {
      locationStr = `${c.meeting_system} - ${c.meeting_major_location}`;
    } else if (c.meeting_system) {
      locationStr = c.meeting_system;
    } else {
      locationStr = '';
    }

    // Convert scheduled date+time to ISO UTC if future timing
    let scheduledIso = null;
    if (c.timing_type === 'future' && c.scheduled_date && c.scheduled_time) {
      // Build ISO assuming user's local browser timezone if no tz selected, else UTC
      try {
        scheduledIso = new Date(`${c.scheduled_date}T${c.scheduled_time}:00`).toISOString();
      } catch (e) {
        scheduledIso = null;
      }
    }

    const contractData = {
      title: isMultiCrew ? `Multi-Crew: ${cat} Operation` : (c.title || title),
      description: isMultiCrew ? `Multi-crew ${cat.toLowerCase()} operation requiring ${manifest.length} crew members.` : (c.description || null),
      category: c.category,
      compensation_type: isLfg ? 'LFG' : (isMedical ? 'Flat Fee' : c.compensation_type),
      payment_amount: isLfg ? 0 : paymentAmount,
      split_profits: (isLfg || isMedical) ? false : c.split_profits,
      // Legacy location fields kept for backward compatibility
      system: c.meeting_system || c.system,
      planet: c.meeting_major_location || null,
      location: locationStr,
      shard: myShard,
      // Multi-crew (disabled for LFG and Medical)
      is_multi_crew: (isLfg || isMedical) ? false : isMultiCrew,
      manifest: (!isLfg && !isMedical && isMultiCrew) ? manifest : null,
      // Listing duration: medical uses bleed-out as duration; "now" non-medical uses chosen duration; future uses 60 (placeholder, expiry handled by scheduled_start_at)
      duration_minutes: isMedical
        ? (parseInt(c.rescue_bleedout_minutes) || 30)
        : (c.timing_type === 'now' ? duration : 60),
      // New: timing
      timing_type: c.timing_type,
      scheduled_start_at: scheduledIso,
      scheduled_timezone: c.scheduled_timezone || null,
      // New: meeting location
      meeting_visibility: c.meeting_visibility,
      meeting_system: c.meeting_system || null,
      meeting_major_location: c.meeting_major_location || null,
      // Group join mode (multi-join events)
      join_mode: c.join_mode || null,  // null lets server pick the smart default
      max_participants: c.join_mode === 'multi'
        ? Math.max(2, Math.min(50, parseInt(c.max_participants) || 8))
        : null,
    };

    if (isMedical) {
      Object.assign(contractData, {
        rescue_bleedout_minutes: parseInt(c.rescue_bleedout_minutes) || 30,
        rescue_injury_tier: c.rescue_injury_tier,
        rescue_pvp_area: c.rescue_pvp_area,
        rescue_hostile_npcs: c.rescue_hostile_npcs,
        rescue_aa_turrets: c.rescue_aa_turrets,
        rescue_needs_food_hydration: c.rescue_needs_food_hydration,
        rescue_exact_location: c.rescue_exact_location,
        rescue_body_location: c.rescue_body_location,
        rescue_private_notes: c.rescue_private_notes,
      });
    }

    try {
      const response = await axios.post(`${API}/contracts`, contractData);
      setContracts(prev => [response.data, ...prev]);
      setShowCreate(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };
  
  const resetForm = () => {
    setNewContract({
      category: 'COMBAT', title: '', description: '', compensation_type: 'Flat Fee',
      split_profits: false, payment_amount: '', system: 'Stanton', planet: '', location: '',
      timing_type: 'now', scheduled_date: '', scheduled_time: '', scheduled_timezone: 'UTC',
      meeting_visibility: 'public', meeting_system: '', meeting_major_location: '',
      rescue_bleedout_minutes: 30, rescue_injury_tier: 'Unknown', rescue_pvp_area: 'Unknown',
      rescue_hostile_npcs: 'Unknown', rescue_aa_turrets: 'Unknown', rescue_needs_food_hydration: 'Unknown',
      rescue_exact_location: '', rescue_body_location: '', rescue_private_notes: '',
      join_mode: '', max_participants: 8,
    });
    setManifest([]);
    setIsMultiCrew(false);
    setBasePayout(50000);
    setDuration(60);
  };

  const handleAcceptContract = async (contractId) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/accept`);
      fetchContracts();
    } catch (error) {
      console.error('Failed to accept contract:', error);
    }
  };

  const handleCompleteContract = async (contract) => {
    const contractId = typeof contract === 'string' ? contract : contract?.id;
    try {
      await axios.post(`${API}/contracts/${contractId}/complete`);
      if (typeof contract === 'object') _openMultiRatingIfNeeded(contract);
      fetchContracts();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to complete contract');
    }
  };

  const submitParticipantRating = async (participantId) => {
    if (!multiRating) return;
    const p = multiRating.participants.find(x => x.id === participantId);
    if (!p || p.submitted || !p.rating) return;
    try {
      await axios.post(`${API}/contracts/${multiRating.contractId}/rate-participant`, {
        participant_user_id: participantId,
        rating: p.rating,
        comment: p.comment || null,
      });
      setMultiRating(prev => prev && ({
        ...prev,
        participants: prev.participants.map(x => x.id === participantId ? { ...x, submitted: true } : x),
      }));
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit rating');
    }
  };

  const handleSubmitReview = async () => {
    if (!showReview) return;
    try {
      if (showReview.isMultiRolePoster) {
        await axios.post(`${API}/contracts/${showReview.id}/rate-poster`, {
          rating: reviewRating,
          comment: reviewComment || null,
        });
      } else {
        await axios.post(`${API}/contracts/${showReview.id}/review`, {
          contract_id: showReview.id,
          rating: reviewRating,
          comment: reviewComment,
          review_type: showReview.isClient ? 'client_to_merc' : 'merc_to_client'
        });
      }
      setShowReview(null);
      setReviewRating(5);
      setReviewComment('');
      fetchContracts();
      fetchMyContracts();
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert(error.response?.data?.detail || 'Failed to submit review');
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

  // Helper to get category display info
  const getCategoryDisplay = (categoryId) => {
    const icon = CATEGORY_ICONS[categoryId] || '📋';
    const label = CATEGORY_LABELS[categoryId] || 'Other';
    return { icon, label };
  };

  const filteredContracts = contracts.filter(c => {
    if (filter !== 'all' && c.category !== filter) return false;
    return true;
  });

  const isMyShardContract = (contract) => myShard && contract.shard === myShard;
  
  const getContractPayout = (contract) => {
    if (contract.is_multi_crew && contract.manifest) {
      return contract.manifest.reduce((sum, slot) => sum + slot.payout, 0);
    }
    return contract.payment_amount || contract.payout || 0;
  };

  const getCrewStatus = (contract) => {
    if (!contract.is_multi_crew || !contract.manifest) return null;
    const filled = contract.manifest.filter(s => s.status === 'FILLED').length;
    return `${filled}/${contract.manifest.length}`;
  };

  const getTimeRemaining = (contract) => {
    // Don't show timer for active/in_progress/completed/cancelled contracts.
    if (['active', 'in_progress', 'pending_completion', 'completed', 'cancelled'].includes(contract.status)) {
      return null;
    }
    if (!contract.expires_at) return null;
    const now = new Date();
    const expires = new Date(contract.expires_at);
    const diffMs = expires - now;
    if (diffMs <= 0) return { text: 'Expired', color: '#ff4d4d', isDistress: false };

    const fmt = (ms, prefix = '') => {
      const totalMins = Math.floor(ms / 60000);
      const days = Math.floor(totalMins / 1440);
      const hours = Math.floor((totalMins % 1440) / 60);
      const mins = totalMins % 60;
      let body;
      if (days > 0) body = `${days}d ${hours}h`;
      else if (hours > 0) body = `${hours}h ${mins}m`;
      else body = `${mins}m`;
      return `${prefix}${body}`;
    };

    // Future Time posts: anchor the timer to the scheduled start, not the listing-window expiry.
    if (contract.timing_type === 'future' && contract.scheduled_start_at) {
      const start = new Date(contract.scheduled_start_at);
      const untilStart = start - now;
      if (untilStart > 0) {
        const startsSoon = untilStart <= 60 * 60 * 1000; // ≤ 1h
        return {
          text: fmt(untilStart, 'Starts in '),
          color: startsSoon ? '#ff9900' : 'rgba(255,255,255,0.55)',
          isDistress: false,
        };
      }
      // Event has started — show time left in the active window.
      return {
        text: fmt(diffMs, 'Live · ') + ' left',
        color: 'var(--nc-cyan)',
        isDistress: false,
      };
    }

    // Looking-Now posts: existing behaviour, with day rollover so we never print 5000+ hours.
    const totalMins = Math.floor(diffMs / 60000);
    const isDistress = contract.duration_minutes === 30;
    let color = 'rgba(255,255,255,0.5)';
    if (isDistress) color = '#ff4d4d';
    else if (totalMins < 10) color = '#ff9900';
    return { text: fmt(diffMs), color, isDistress };
  };

  const navigateToContract = (contractId) => {
    navigate(`/contracts/${contractId}`);
  };

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

  // Multi-role participant → poster rating pending?
  const isMultiParticipantPending = (c) => {
    if (!user || c?.status !== 'completed') return false;
    if (c.poster_id === user.id) return false;
    const isMulti = c.join_mode === 'multi' || c.is_multi_crew;
    if (!isMulti) return false;
    const inParticipants = (c.accepted_participants || []).some(p => p?.id === user.id);
    const inManifest = (c.manifest || []).some(s => s?.accepted_by?.id === user.id);
    if (!inParticipants && !inManifest) return false;
    const alreadyRated = (c.poster_ratings || []).some(r => r?.reviewer_id === user.id);
    return !alreadyRated;
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
                <h2 className="mission-title">Rate {showReview.isClient ? 'Player' : 'Poster'}</h2>
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

      {/* Multi-role Rating Prompt */}
      {multiRating && (
        <div className="mission-modal-overlay" onClick={() => setMultiRating(null)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '85vh', overflow: 'auto' }} data-testid="multi-rating-modal">
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// RATE_CREW</div>
                <h2 className="mission-title">Rate Your Crew</h2>
                <div style={{ fontSize: 12, color: 'var(--nc-text-muted)', marginTop: 4 }}>{multiRating.contractTitle}</div>
              </div>
              <button className="mission-modal-close" onClick={() => setMultiRating(null)} data-testid="multi-rating-close">
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {multiRating.participants.length === 0 && (
                <div style={{ color: 'var(--nc-text-muted)', fontSize: 13 }}>No crew members to rate.</div>
              )}
              {multiRating.participants.map((p, idx) => (
                <div key={p.id} data-testid={`multi-rating-row-${p.id}`} style={{
                  padding: 12,
                  border: '1px solid rgba(0,240,255,0.2)',
                  background: p.submitted ? 'rgba(0,240,255,0.06)' : 'transparent',
                  opacity: p.submitted ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <strong style={{ color: 'var(--nc-cyan)', fontFamily: 'var(--nc-font-mono)' }}>{p.handle || 'Unknown'}</strong>
                      {p.slot && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--nc-text-muted)' }}>· {p.slot}</span>}
                    </div>
                    {p.submitted && <span style={{ color: 'var(--nc-success, #6bff9e)', fontSize: 11 }}>✓ Rated</span>}
                  </div>
                  {!p.submitted && (
                    <>
                      <div className="rating-stars" style={{ marginBottom: 8 }}>
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={() => setMultiRating(prev => ({
                              ...prev,
                              participants: prev.participants.map((x, i) => i === idx ? { ...x, rating: star } : x),
                            }))}
                            className={`star-btn ${star <= p.rating ? 'active' : ''}`}
                            data-testid={`multi-rating-star-${p.id}-${star}`}
                          >
                            <Star size={22} fill={star <= p.rating ? '#FFD700' : 'none'} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="nc-input"
                        rows={2}
                        placeholder="Optional comment..."
                        value={p.comment}
                        onChange={e => setMultiRating(prev => ({
                          ...prev,
                          participants: prev.participants.map((x, i) => i === idx ? { ...x, comment: e.target.value } : x),
                        }))}
                        data-testid={`multi-rating-comment-${p.id}`}
                      />
                      <button
                        className="nc-btn nc-btn-primary"
                        style={{ width: '100%', marginTop: 8 }}
                        disabled={!p.rating}
                        onClick={() => submitParticipantRating(p.id)}
                        data-testid={`multi-rating-submit-${p.id}`}
                      >
                        SUBMIT RATING
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button
                className="nc-btn"
                style={{ width: '100%', marginTop: 4 }}
                onClick={() => setMultiRating(null)}
                data-testid="multi-rating-done"
              >
                {multiRating.participants.every(p => p.submitted) ? 'DONE' : 'FINISH LATER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreate && (
        <div className="mission-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// POST_JOB</div>
                <h2 className="mission-title">Post Job / Group</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              {/* Post Mode: Paid vs LFG */}
              <div className="form-group">
                <label className="nc-label">POST MODE</label>
                <div style={{ display: 'flex', gap: 8 }} data-testid="post-mode-toggle">
                  <button
                    type="button"
                    className={`nc-toggle ${!isLfg ? 'active' : ''}`}
                    onClick={() => setNewContract(prev => ({
                      ...prev,
                      category: prev.category === 'LFG' ? 'COMBAT' : prev.category,
                    }))}
                    style={{ flex: 1, padding: '10px 12px' }}
                    data-testid="mode-paid-btn"
                  >
                    💰 Paid Job / Contract
                  </button>
                  <button
                    type="button"
                    className={`nc-toggle ${isLfg ? 'active' : ''}`}
                    onClick={() => {
                      setIsMultiCrew(false);
                      setNewContract(prev => ({
                        ...prev,
                        category: 'LFG',
                        compensation_type: 'LFG',
                        split_profits: false,
                        payment_amount: '0',
                      }));
                    }}
                    style={{ flex: 1, padding: '10px 12px' }}
                    data-testid="mode-lfg-btn"
                  >
                    👥 LFG / Group Up
                  </button>
                </div>
                {isLfg && (
                  <p style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginTop: 6, fontFamily: 'var(--nc-font-mono)' }}>
                    No payout, coordination only. Find players for a session, crew, party, or casual activity.
                  </p>
                )}
              </div>

              {/* Activity Type — only for paid jobs */}
              {!isLfg && (
                <div className="form-group">
                  <label className="nc-label">ACTIVITY TYPE</label>
                  <select
                    className="nc-input"
                    value={newContract.category}
                    onChange={e => setNewContract(prev => ({ ...prev, category: e.target.value }))}
                    data-testid="category-select"
                    style={{ fontSize: 14 }}
                  >
                    {CONTRACT_CATEGORIES.filter(c => c.id !== 'LFG').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Job Title */}
              <div className="form-group">
                <label className="nc-label">POST TITLE</label>
                <input
                  className="nc-input"
                  type="text"
                  placeholder={isLfg ? 'e.g., Looking for bunker team, Need Reclaimer crew' : 'e.g., Escort from Lorville to Orison'}
                  value={newContract.title}
                  onChange={e => setNewContract(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="contract-title-input"
                />
              </div>

              {/* Contract Description (Optional) */}
              <div className="form-group">
                <label className="nc-label">DESCRIPTION (OPTIONAL)</label>
                <textarea
                  className="nc-input"
                  placeholder="Add any additional details..."
                  value={newContract.description}
                  onChange={e => setNewContract(prev => ({ ...prev, description: e.target.value }))}
                  style={{ minHeight: 60, resize: 'vertical' }}
                  data-testid="contract-description-input"
                />
              </div>

              {/* Timing — Looking Now vs Scheduled Future */}
              <div className="form-group">
                <label className="nc-label">TIMING</label>
                <div style={{ display: 'flex', gap: 8 }} data-testid="timing-toggle">
                  <button
                    type="button"
                    className={`nc-toggle ${!isFuture ? 'active' : ''}`}
                    onClick={() => setNewContract(prev => ({ ...prev, timing_type: 'now' }))}
                    style={{ flex: 1, padding: '10px 12px' }}
                    data-testid="timing-now-btn"
                  >
                    🚨 Looking Now
                  </button>
                  <button
                    type="button"
                    className={`nc-toggle ${isFuture ? 'active' : ''}`}
                    onClick={() => setNewContract(prev => ({ ...prev, timing_type: 'future' }))}
                    style={{ flex: 1, padding: '10px 12px' }}
                    data-testid="timing-future-btn"
                  >
                    📅 Future Time
                  </button>
                </div>
                {isFuture && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                    <input
                      type="date"
                      className="nc-input"
                      value={newContract.scheduled_date}
                      onChange={e => setNewContract(prev => ({ ...prev, scheduled_date: e.target.value }))}
                      data-testid="scheduled-date-input"
                    />
                    <input
                      type="time"
                      className="nc-input"
                      value={newContract.scheduled_time}
                      onChange={e => setNewContract(prev => ({ ...prev, scheduled_time: e.target.value }))}
                      data-testid="scheduled-time-input"
                    />
                    <select
                      className="nc-input"
                      value={newContract.scheduled_timezone}
                      onChange={e => setNewContract(prev => ({ ...prev, scheduled_timezone: e.target.value }))}
                      data-testid="scheduled-timezone-select"
                    >
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Medical / Rescue specifics */}
              {isMedical && (
                <div style={{ background: 'rgba(255, 0, 68, 0.05)', border: '1px solid rgba(255,0,68,0.3)', padding: 16, marginBottom: 16 }}>
                  <div style={{ color: '#ff4466', fontSize: 12, fontFamily: 'var(--nc-font-mono)', letterSpacing: 1, marginBottom: 12 }}>
                    🏥 // MEDICAL_RESCUE_DETAILS (PUBLIC)
                  </div>
                  <div className="form-group">
                    <label className="nc-label">BLEED-OUT / FULL DEATH MINUTES REMAINING</label>
                    <input
                      type="number"
                      className="nc-input"
                      min="1"
                      max="600"
                      value={newContract.rescue_bleedout_minutes}
                      onChange={e => setNewContract(prev => ({ ...prev, rescue_bleedout_minutes: e.target.value.replace(/\D/g, '') }))}
                      data-testid="rescue-bleedout-input"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="nc-label">INJURY TIER</label>
                      <select className="nc-input" value={newContract.rescue_injury_tier} onChange={e => setNewContract(prev => ({ ...prev, rescue_injury_tier: e.target.value }))} data-testid="rescue-tier-select">
                        <option>Unknown</option><option>T1</option><option>T2</option><option>T3</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="nc-label">PVP AREA?</label>
                      <select className="nc-input" value={newContract.rescue_pvp_area} onChange={e => setNewContract(prev => ({ ...prev, rescue_pvp_area: e.target.value }))} data-testid="rescue-pvp-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="nc-label">HOSTILE NPCs ACTIVE?</label>
                      <select className="nc-input" value={newContract.rescue_hostile_npcs} onChange={e => setNewContract(prev => ({ ...prev, rescue_hostile_npcs: e.target.value }))} data-testid="rescue-npcs-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="nc-label">AA TURRETS NEAR LZ?</label>
                      <select className="nc-input" value={newContract.rescue_aa_turrets} onChange={e => setNewContract(prev => ({ ...prev, rescue_aa_turrets: e.target.value }))} data-testid="rescue-aa-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="nc-label">NEEDS HYDRATION/FOOD?</label>
                      <select className="nc-input" value={newContract.rescue_needs_food_hydration} onChange={e => setNewContract(prev => ({ ...prev, rescue_needs_food_hydration: e.target.value }))} data-testid="rescue-food-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed rgba(255,0,68,0.4)' }}>
                    <div style={{ color: '#ff4466', fontSize: 12, fontFamily: 'var(--nc-font-mono)', letterSpacing: 1, marginBottom: 8 }}>
                      🔒 // PRIVATE_RESCUE_DETAILS
                    </div>
                    <p style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginBottom: 12 }}>
                      Exact rescue details are private and will only be shown to the accepted rescuer after you approve them.
                    </p>
                    <div className="form-group">
                      <label className="nc-label">EXACT LANDMARK / POI / AREA</label>
                      <input className="nc-input" placeholder="e.g., Shubin SM0-10, Daymar bunker entrance" value={newContract.rescue_exact_location} onChange={e => setNewContract(prev => ({ ...prev, rescue_exact_location: e.target.value }))} data-testid="rescue-exact-input" />
                    </div>
                    <div className="form-group">
                      <label className="nc-label">APPROXIMATE BODY LOCATION (OPTIONAL)</label>
                      <input className="nc-input" placeholder="e.g., Inside main building, top floor" value={newContract.rescue_body_location} onChange={e => setNewContract(prev => ({ ...prev, rescue_body_location: e.target.value }))} data-testid="rescue-body-input" />
                    </div>
                    <div className="form-group">
                      <label className="nc-label">ADDITIONAL PRIVATE NOTES (OPTIONAL)</label>
                      <textarea className="nc-input" style={{ minHeight: 50 }} placeholder="Codes, hazards, anything else for the rescuer" value={newContract.rescue_private_notes} onChange={e => setNewContract(prev => ({ ...prev, rescue_private_notes: e.target.value }))} data-testid="rescue-notes-input" />
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Crew Toggle - hidden for LFG and Medical posts */}
              {!isLfg && !isMedical && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '14px' }}>
                  <Users size={18} color="var(--nc-cyan)" />
                  <span>MULTI-CREW CONTRACT</span>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setIsMultiCrew(!isMultiCrew)}
                  data-testid="multi-crew-toggle"
                >
                  {isMultiCrew ? (
                    <ToggleRight size={32} color="var(--nc-cyan)" />
                  ) : (
                    <ToggleLeft size={32} color="rgba(255,255,255,0.4)" />
                  )}
                </button>
              </div>
              )}

              {/* Multi-Crew Manifest Builder */}
              {isMultiCrew && (
                <ManifestBuilder
                  manifest={manifest}
                  onChange={setManifest}
                  basePayout={basePayout}
                  onBasePayoutChange={setBasePayout}
                />
              )}

              {/* Single-crew fields only show when not multi-crew */}
              {!isMultiCrew && (
                <>
                  {/* Simplified Meeting Location */}
                  <div className="form-group">
                    <label className="nc-label">MEETING LOCATION</label>
                    <div style={{ display: 'grid', gridTemplateColumns: isMedical ? '1fr' : '1fr 1fr', gap: 12 }}>
                      {!isMedical && (
                        <select
                          className="nc-input"
                          value={newContract.meeting_visibility}
                          onChange={e => setNewContract(prev => ({ ...prev, meeting_visibility: e.target.value, meeting_system: e.target.value === 'disclosed_on_acceptance' ? '' : prev.meeting_system, meeting_major_location: e.target.value === 'disclosed_on_acceptance' ? '' : prev.meeting_major_location }))}
                          data-testid="meeting-visibility-select"
                        >
                          <option value="public">Show System Publicly</option>
                          <option value="disclosed_on_acceptance">Disclosed on Acceptance</option>
                        </select>
                      )}
                      {(isMedical || newContract.meeting_visibility === 'public') && (
                        <select
                          className="nc-input"
                          value={newContract.meeting_system}
                          onChange={e => setNewContract(prev => ({ ...prev, meeting_system: e.target.value, meeting_major_location: '' }))}
                          data-testid="meeting-system-select"
                        >
                          <option value="">{isMedical ? 'Patient is in...' : 'System...'}</option>
                          <option value="Stanton">Stanton</option>
                          <option value="Pyro">Pyro</option>
                          <option value="Nyx">Nyx</option>
                        </select>
                      )}
                    </div>
                    {!isMedical && newContract.meeting_visibility === 'public' && newContract.meeting_system && (
                      <select
                        className="nc-input"
                        style={{ marginTop: 8 }}
                        value={newContract.meeting_major_location}
                        onChange={e => setNewContract(prev => ({ ...prev, meeting_major_location: e.target.value }))}
                        data-testid="meeting-major-location-select"
                      >
                        <option value="">Major port / city / station...</option>
                        {(MAJOR_LOCATIONS[newContract.meeting_system] || []).map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    )}
                    {isMedical && (
                      <p style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginTop: 6, fontFamily: 'var(--nc-font-mono)' }}>
                        Only the system is visible publicly. Exact rescue location is private.
                      </p>
                    )}
                  </div>

                  {/* Split Profits Checkbox - hidden for LFG and Medical */}
                  {!isLfg && !isMedical && (
                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        id="splitProfits"
                        checked={newContract.split_profits}
                        onChange={(e) => setNewContract(prev => ({ 
                          ...prev, 
                          split_profits: e.target.checked, 
                          payment_amount: e.target.checked ? '0' : prev.payment_amount 
                        }))}
                        style={{ width: 18, height: 18, accentColor: 'var(--nc-cyan)' }}
                        data-testid="split-profits-checkbox"
                      />
                      <label htmlFor="splitProfits" style={{ color: 'var(--nc-text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
                        💰 Split Profits (no fixed payout)
                      </label>
                    </div>
                  </div>
                  )}

                  {/* Payment Amount - shown for normal flat-fee or for medical (always required) */}
                  {(showPaymentField || isMedical) && (
                    <div className="form-group">
                      <label className="nc-label">{isMedical ? 'RESCUE PAYOUT (aUEC)' : 'CONTRACT PAYOUT (aUEC)'}</label>
                      <input
                        type="number"
                        className="nc-input"
                        placeholder="e.g., 50000"
                        value={newContract.payment_amount}
                        onChange={e => setNewContract(prev => ({ ...prev, payment_amount: e.target.value.replace(/\D/g, '') }))}
                        min="0"
                        style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 18, color: 'var(--nc-green)' }}
                        data-testid="payment-amount-input"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Multi-crew summary */}
              {isMultiCrew && manifest.length > 0 && (
                <div className="form-group" style={{ background: 'var(--nc-bg-secondary)', padding: 16, border: '1px solid var(--nc-border)', marginTop: 16 }}>
                  <label className="nc-label" style={{ marginBottom: 8 }}>MULTI-CREW CONTRACT SUMMARY</label>
                  <div style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16, color: 'var(--nc-cyan)' }}>
                    {manifest.length} crew slots • {manifest.reduce((sum, s) => sum + s.payout, 0).toLocaleString()} aUEC total
                  </div>
                </div>
              )}

              {/* Listing Duration — only for "Looking Now" non-medical posts (rescues use bleed-out as duration) */}
              {!isFuture && !isMedical && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="nc-label">LISTING DURATION</label>
                <select
                  className="nc-input"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  data-testid="duration-select"
                >
                  <option value={30}>🚨 Distress (30 Minutes)</option>
                  <option value={60}>⚡ Standard (1 Hour)</option>
                  <option value={240}>📋 Operation (4 Hours)</option>
                  <option value={1440}>📅 Scheduled (24 Hours)</option>
                </select>
              </div>
              )}

              {/* Crew / Group Size — multi-join events vs single-slot jobs */}
              {!isMultiCrew && !isMedical && (
              <div className="form-group" style={{ marginTop: 16 }} data-testid="join-mode-section">
                <label className="nc-label">CREW / GROUP SIZE</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNewContract(prev => ({ ...prev, join_mode: 'single' }))}
                    className="nc-btn"
                    style={{
                      background: !isMultiJoin ? 'var(--nc-cyan)' : 'transparent',
                      color: !isMultiJoin ? 'var(--nc-bg-primary)' : 'var(--nc-text-primary)',
                      border: `1px solid ${!isMultiJoin ? 'var(--nc-cyan)' : 'var(--nc-border)'}`,
                      padding: '10px 14px',
                    }}
                    data-testid="join-mode-single"
                  >
                    👤 Single Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewContract(prev => ({ ...prev, join_mode: 'multi' }))}
                    className="nc-btn"
                    style={{
                      background: isMultiJoin ? 'var(--nc-cyan)' : 'transparent',
                      color: isMultiJoin ? 'var(--nc-bg-primary)' : 'var(--nc-text-primary)',
                      border: `1px solid ${isMultiJoin ? 'var(--nc-cyan)' : 'var(--nc-border)'}`,
                      padding: '10px 14px',
                    }}
                    data-testid="join-mode-multi"
                  >
                    👥 Multiple People
                  </button>
                </div>
                {isMultiJoin && (
                  <div style={{ marginTop: 12 }}>
                    <label className="nc-label" style={{ fontSize: 11 }}>MAX PARTICIPANTS</label>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      className="nc-input"
                      value={newContract.max_participants}
                      onChange={e => setNewContract(prev => ({
                        ...prev,
                        max_participants: Math.max(2, Math.min(50, parseInt(e.target.value) || 2)),
                      }))}
                      data-testid="max-participants-input"
                    />
                    <div style={{ fontSize: 11, color: 'var(--nc-text-muted)', marginTop: 6, fontFamily: 'var(--nc-font-mono)' }}>
                      People can keep joining until the group is full or the listing expires.
                    </div>
                  </div>
                )}
                {(isLfg || isFuture) && !newContract.join_mode && (
                  <div style={{ fontSize: 11, color: 'var(--nc-cyan)', marginTop: 6, fontFamily: 'var(--nc-font-mono)' }}>
                    Defaulted to Multiple People for {isLfg ? 'LFG' : 'Future Time'} posts.
                  </div>
                )}
              </div>
              )}

              <button 
                className="nc-btn nc-btn-primary" 
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleCreateContract}
                disabled={!isContractValid()}
                data-testid="post-contract-btn"
              >
                POST {isLfg ? 'LFG / GROUP UP' : (isMultiCrew ? 'MULTI-CREW JOB' : 'JOB')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-label">// GROUP_FINDER</div>
          <h1 className="page-title">Job Board</h1>
          <p className="page-subtitle">Post jobs, apply to missions, crew up — choose teammates by reputation.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="font-mono text-muted" style={{ fontSize: 11 }}>MY REGION:</span>
            <select
              className="nc-input"
              value={myShard}
              onChange={e => setMyShard(e.target.value)}
              style={{ width: 140, padding: '8px 12px' }}
              data-testid="region-input"
            >
              <option value="">All</option>
              <option value="USA">USA</option>
              <option value="Europe">Europe</option>
              <option value="Australia">Australia</option>
              <option value="Asia">Asia</option>
            </select>
          </div>
          <button 
            className="nc-btn nc-btn-primary"
            onClick={() => setShowCreate(true)}
            data-testid="create-contract-btn"
          >
            <Plus size={16} />
            POST JOB / GROUP
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ marginBottom: 16 }}>
        <div className="nc-toggle-group" data-testid="view-mode-toggle">
          <button
            className={`nc-toggle ${viewMode === 'feed' ? 'active' : ''}`}
            onClick={() => setViewMode('feed')}
          >
            Contract Feed
          </button>
          <button
            className={`nc-toggle ${viewMode === 'my' ? 'active' : ''}`}
            onClick={() => setViewMode('my')}
          >
            My Contracts {myContracts.filter(c => 
              (c.status === 'completed' && c.poster_id === user?.id && !c.client_review) ||
              (c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review)
            ).length > 0 && (
              <span className="pending-rating-badge">!</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs - Only show on Feed view */}
      {viewMode === 'feed' && (
      <div style={{ marginBottom: 24 }}>
        <div 
          className="nc-toggle-group" 
          data-testid="contract-filter"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <button
            className={`nc-toggle ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            data-testid="filter-all"
          >
            All
          </button>
          <button
            className={`nc-toggle ${filter === 'paid' ? 'active' : ''}`}
            onClick={() => setFilter('paid')}
            data-testid="filter-paid"
          >
            💰 Paid Jobs
          </button>
          {CONTRACT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`nc-toggle ${filter === cat.id ? 'active' : ''}`}
              onClick={() => setFilter(cat.id)}
              data-testid={`filter-${cat.id.toLowerCase()}`}
            >
              {cat.icon} {cat.id === 'LFG' ? 'LFG / Group Up' : cat.shortLabel}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Legend - Only show on Feed view */}
      {viewMode === 'feed' && (
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, background: 'var(--nc-red)', borderRadius: 2 }} />
          <span className="font-mono text-muted" style={{ fontSize: 11 }}>MY REGION</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, background: 'var(--nc-orange)', borderRadius: 2 }} />
          <span className="font-mono text-muted" style={{ fontSize: 11 }}>GLOBAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={12} color="var(--nc-cyan)" />
          <span className="font-mono text-muted" style={{ fontSize: 11 }}>MULTI-CREW</span>
        </div>
      </div>
      )}

      {/* Contracts Feed - Only show on Feed view */}
      {viewMode === 'feed' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredContracts.map(contract => {
          const categoryDisplay = getCategoryDisplay(contract.category);
          const isMyShard = isMyShardContract(contract);
          const isLootSplit = contract.compensation_type && contract.compensation_type !== 'Flat Fee';
          const isSplitProfits = contract.split_profits;
          
          return (
            <div 
              key={contract.id} 
              className={`contract-card ${isMyShard ? 'my-shard' : 'global'}`}
              data-testid={`contract-${contract.id}`}
              onClick={() => contract.is_multi_crew ? navigateToContract(contract.id) : null}
              style={{ cursor: contract.is_multi_crew ? 'pointer' : 'default' }}
            >
              <div className="contract-header">
                <div className="contract-type">
                  <span className="contract-type-icon">{categoryDisplay.icon}</span>
                  <span className="contract-type-label">{categoryDisplay.label.toUpperCase()}</span>
                  {contract.is_multi_crew && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--nc-cyan)',
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)'
                    }}>
                      <Users size={12} />
                      {getCrewStatus(contract)}
                    </span>
                  )}
                </div>
                
                {/* Payment Display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {contract.category === 'LFG' ? (
                    <span style={{
                      background: 'rgba(255, 102, 0, 0.15)',
                      border: '1px solid #ff6600',
                      color: '#ff6600',
                      padding: '4px 10px',
                      fontSize: 11,
                      letterSpacing: 1,
                      fontFamily: 'var(--nc-font-mono)'
                    }}>
                      👥 LFG · NO PAYOUT
                    </span>
                  ) : contract.category === 'MEDICAL' ? (
                    /* Medical / rescue posts always display the flat-fee payout the poster entered */
                    <span className="payment-amount">{getContractPayout(contract).toLocaleString()} aUEC</span>
                  ) : isSplitProfits ? (
                    <span style={{ color: 'var(--nc-cyan)', fontSize: 13, fontFamily: 'var(--nc-font-mono)' }}>
                      💰 SPLIT PROFITS
                    </span>
                  ) : isLootSplit ? (
                    <span className="loot-split-badge">
                      {contract.compensation_type === 'Equal Split' ? 'LOOT SPLIT' : '% SHARE'}
                    </span>
                  ) : getContractPayout(contract) > 0 ? (
                    <span className="payment-amount">{getContractPayout(contract).toLocaleString()} aUEC</span>
                  ) : null}
                  {/* Show IN PROGRESS badge for active contracts */}
                  {['active', 'in_progress'].includes(contract.status) ? (
                    <span style={{
                      background: 'rgba(0, 255, 136, 0.2)',
                      border: '1px solid #00ff88',
                      color: '#00ff88',
                      padding: '4px 8px',
                      fontSize: '11px',
                      letterSpacing: '1px',
                      fontFamily: 'var(--nc-font-mono)'
                    }}>
                      IN PROGRESS
                    </span>
                  ) : contract.status === 'cancelled' ? (
                    <span style={{
                      background: 'rgba(255, 77, 77, 0.2)',
                      border: '1px solid #ff4d4d',
                      color: '#ff4d4d',
                      padding: '4px 8px',
                      fontSize: '11px',
                      letterSpacing: '1px',
                      fontFamily: 'var(--nc-font-mono)'
                    }}>
                      CANCELLED
                    </span>
                  ) : (() => {
                    const timeInfo = getTimeRemaining(contract);
                    if (!timeInfo) return <span className="contract-time">{getTimeAgo(contract.created_at)}</span>;
                    return (
                      <span style={{ 
                        fontSize: 11, 
                        fontFamily: 'var(--nc-font-mono)',
                        color: timeInfo.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {timeInfo.isDistress ? '🚨' : '⏱️'} {timeInfo.text}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <h3 className="contract-title">{contract.title}</h3>
              
              {/* Contract Description */}
              {contract.description && (
                <p style={{ 
                  color: 'var(--nc-text-secondary)', 
                  fontSize: 13, 
                  margin: '8px 0 12px',
                  lineHeight: 1.5,
                  maxHeight: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {contract.description}
                </p>
              )}

              <div className="contract-meta">
                <div className="contract-meta-item">
                  <MapPin size={12} />
                  {contract.meeting_visibility === 'disclosed_on_acceptance'
                    ? 'Disclosed on Acceptance'
                    : (contract.category === 'MEDICAL'
                        ? `${contract.meeting_system || contract.system || 'Unknown'} (exact location private)`
                        : (contract.location || (contract.meeting_system && contract.meeting_major_location ? `${contract.meeting_system} - ${contract.meeting_major_location}` : (contract.meeting_system || contract.planet || 'Location TBD'))))}
                </div>
                <div className="contract-meta-item">
                  <Users size={12} />
                  {contract.shard ? contract.shard : 'Any Region'}
                </div>
                <div className="contract-meta-item">
                  <Star size={12} className="text-gold" />
                  {contract.poster?.reputation?.toFixed(1) || '5.0'}
                  <DiscordBadge
                    discordLinked={contract.poster?.discord_linked}
                    discordUsername={contract.poster?.discord_username}
                  />
                </div>
                {/* Timing badge */}
                {contract.timing_type === 'future' && contract.scheduled_start_at ? (
                  <div className="contract-meta-item" style={{ color: '#aa00ff', borderLeft: '1px solid rgba(170,0,255,0.4)', paddingLeft: 8 }} data-testid="timing-badge-future">
                    📅 Scheduled: {new Date(contract.scheduled_start_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}{contract.scheduled_timezone ? ` ${contract.scheduled_timezone}` : ''}
                  </div>
                ) : (
                  <div className="contract-meta-item" style={{ color: 'var(--nc-cyan)' }} data-testid="timing-badge-now">
                    🚨 Looking Now
                  </div>
                )}
                {contract.poster?.is_supporter && (
                  <span className="supporter-badge" style={{ marginLeft: 'auto' }}>SYNDICATE</span>
                )}
              </div>

              {/* Medical / Rescue public detail strip */}
              {contract.category === 'MEDICAL' && (
                <RescueCardSummary contract={contract} />
              )}

              <div className="contract-actions">
                {(() => {
                  const isMulti = (contract.join_mode || 'single') === 'multi';
                  const accepted = contract.accepted_participants || [];
                  const acceptedIds = accepted.map(p => p.id);
                  const maxP = contract.max_participants || 8;
                  const isFull = isMulti && accepted.length >= maxP;
                  const isAccepted = isMulti && user && acceptedIds.includes(user.id);
                  const alreadyApplied = myBids.some(b => b.contract_id === contract.id);
                  const isPoster = contract.poster_id === user?.id;
                  const isOpen = contract.status === 'open';

                  return (
                    <>
                      {/* Capacity badge for multi-join events */}
                      {isMulti && (
                        <span
                          className="status-badge"
                          data-testid={`capacity-${contract.id}`}
                          style={{
                            background: isFull ? 'rgba(255,68,102,0.12)' : 'rgba(0,240,255,0.10)',
                            color: isFull ? '#ff4466' : 'var(--nc-cyan)',
                            border: `1px solid ${isFull ? '#ff4466' : 'var(--nc-cyan)'}`,
                          }}
                        >
                          👥 {accepted.length}/{maxP}{isFull ? ' · FULL' : ''}
                        </span>
                      )}

                      {/* Status badge — hide "in progress / active" noise on multi events.
                          For multi events the post is always considered open to joiners. */}
                      {contract.status && contract.status !== 'open' && !isMulti && (
                        <span className={`status-badge status-${contract.status}`}>
                          {contract.status.replace('_', ' ').toUpperCase()}
                        </span>
                      )}

                      {/* Multi-crew: View Details button */}
                      {contract.is_multi_crew && (
                        <button
                          className="nc-btn nc-btn-primary"
                          onClick={(e) => { e.stopPropagation(); navigateToContract(contract.id); }}
                          data-testid={`view-crew-${contract.id}`}
                        >
                          <Users size={14} /> View Crew Slots
                          <ChevronRight size={14} />
                        </button>
                      )}

                      {/* Poster actions */}
                      {!contract.is_multi_crew && isPoster && isOpen && (
                        <button className="nc-btn nc-btn-secondary" onClick={() => fetchBids(contract.id)}>
                          <Users size={14} /> Manage Applicants
                        </button>
                      )}

                      {/* Applicant actions */}
                      {!contract.is_multi_crew && !isPoster && isOpen && (
                        isAccepted ? (
                          <button className="nc-btn nc-btn-secondary" disabled data-testid={`joined-${contract.id}`}>
                            <Check size={14} /> Joined
                          </button>
                        ) : alreadyApplied ? (
                          <button className="nc-btn nc-btn-secondary" disabled>
                            <Check size={14} /> Application Sent
                          </button>
                        ) : isFull ? (
                          <button className="nc-btn nc-btn-secondary" disabled data-testid={`full-${contract.id}`}>
                            Group Full
                          </button>
                        ) : (
                          <button
                            className="nc-btn nc-btn-primary"
                            onClick={() => handleBid(contract.id)}
                            disabled={!isMulti && hasActiveContract}
                            title={!isMulti && hasActiveContract ? 'You already have an active contract' : ''}
                            data-testid={`apply-${contract.id}`}
                          >
                            <ThumbsUp size={14} /> {isMulti ? 'Join Group' : 'Apply to Join'}
                          </button>
                        )
                      )}
                    </>
                  );
                })()}
                
                {/* In Progress - Show Handle & Mark Complete */}
                {(contract.status === 'in_progress' || contract.status === 'pending_completion' || contract.status === 'active' || (contract.poster_id === user?.id && (contract.join_mode === 'multi' || contract.is_multi_crew) && (contract.accepted_participants?.length > 0 || (contract.manifest || []).some(s => s.accepted_by?.id)) && contract.status !== 'completed' && contract.status !== 'cancelled' && contract.status !== 'expired')) && (
                  <>
                    <button
                      className="nc-btn nc-btn-secondary"
                      onClick={() => handleCopyHandle(
                        contract.poster_id === user?.id 
                          ? contract.accepted_by?.handle 
                          : contract.poster?.handle
                      )}
                    >
                      <Copy size={14} /> Copy Handle
                    </button>
                    <button 
                      className="nc-btn nc-btn-primary" 
                      onClick={() => handleMarkComplete(contract)}
                    >
                      <Check size={14} /> 
                      {contract.status === 'pending_completion' ? 'Confirm Complete' : 'Mark Complete'}
                    </button>
                  </>
                )}
                
                {/* Cancel button for contract owner — one button, all live statuses */}
                {contract.poster_id === user?.id && ['open', 'mustering', 'in_progress', 'pending_completion', 'active'].includes(contract.status) && (
                  <button 
                    onClick={() => handleCancelContract(contract.id)}
                    data-testid={`cancel-btn-${contract.id}`}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ff4d4d',
                      color: '#ff4d4d',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'var(--nc-font-display)',
                      letterSpacing: '1px'
                    }}
                  >
                    <X size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    CANCEL
                  </button>
                )}
                
                {/* Completed - Show Rating for each party */}
                {contract.status === 'completed' && (
                  <>
                    {/* Poster can rate player if they haven't yet */}
                    {contract.poster_id === user?.id && !contract.client_review && (
                      <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, isClient: true })}>
                        <Star size={14} /> Rate Player
                      </button>
                    )}
                    {/* Player can rate poster if they haven't yet */}
                    {contract.accepted_by?.id === user?.id && !contract.merc_review && (
                      <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, isClient: false })}>
                        <Star size={14} /> Rate Poster
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Reviews Display */}
              {(contract.client_review || contract.merc_review) && (
                <div className="contract-reviews">
                  {contract.client_review && (
                    <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Poster: {contract.client_review.rating}/5
                    </div>
                  )}
                  {contract.merc_review && (
                    <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Player: {contract.merc_review.rating}/5
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
              No Active Jobs
            </h3>
            <p className="text-muted" style={{ fontSize: 14 }}>
              Be the first to post a job!
            </p>
          </div>
        )}
      </div>
      )}

      {/* My Contracts View */}
      {viewMode === 'my' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Pending Ratings Section */}
        {myContracts.filter(c => 
          (c.status === 'completed' && c.poster_id === user?.id && !c.client_review) ||
          (c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review) ||
          isMultiParticipantPending(c)
        ).length > 0 && (
          <div className="pending-ratings-section">
            <h3 style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 12, color: 'var(--nc-gold)', marginBottom: 12, letterSpacing: 2 }}>
              // PENDING_RATINGS
            </h3>
            {myContracts.filter(c => 
              (c.status === 'completed' && c.poster_id === user?.id && !c.client_review) ||
              (c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review) ||
              isMultiParticipantPending(c)
            ).map(contract => {
              const categoryDisplay = getCategoryDisplay(contract.category);
              const isClient = contract.poster_id === user?.id;
              const isMultiPoster = isMultiParticipantPending(contract);
              return (
                <div key={contract.id} className="contract-card pending-rating" data-testid={`my-contract-${contract.id}`}>
                  <div className="contract-header">
                    <div className="contract-type">
                      <span className="contract-type-icon">{categoryDisplay.icon}</span>
                      <span className="contract-type-label">{categoryDisplay.label.toUpperCase()}</span>
                      <span className="status-badge status-completed">COMPLETED</span>
                    </div>
                  </div>
                  <h3 className="contract-title">{contract.title}</h3>
                  <div className="contract-meta">
                    <span style={{ color: 'var(--nc-text-muted)', fontSize: 12 }}>
                      {isClient ? `Player: ${contract.accepted_by?.handle}` : `Poster: ${contract.poster?.handle}`}
                    </span>
                  </div>
                  <div className="contract-actions">
                    <button 
                      className="nc-btn nc-btn-gold" 
                      onClick={() => setShowReview({ id: contract.id, isClient, isMultiRolePoster: isMultiPoster })}
                      data-testid={`rate-btn-${contract.id}`}
                    >
                      <Star size={14} /> Rate {isClient ? 'Player' : 'Poster'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* All My Contracts */}
        <h3 style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 12, color: 'var(--nc-cyan)', marginBottom: 12, letterSpacing: 2 }}>
          // ALL_MY_CONTRACTS
        </h3>
        {myContracts.map(contract => {
          const categoryDisplay = getCategoryDisplay(contract.category);
          const isClient = contract.poster_id === user?.id;
          return (
            <div 
              key={contract.id} 
              className={`contract-card ${contract.status}`} 
              data-testid={`my-contract-${contract.id}`}
              onClick={() => contract.is_multi_crew ? navigateToContract(contract.id) : null}
              style={{ cursor: contract.is_multi_crew ? 'pointer' : 'default' }}
            >
              <div className="contract-header">
                <div className="contract-type">
                  <span className="contract-type-icon">{categoryDisplay.icon}</span>
                  <span className="contract-type-label">{categoryDisplay.label.toUpperCase()}</span>
                  {contract.is_multi_crew && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--nc-cyan)',
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)'
                    }}>
                      <Users size={12} />
                      {getCrewStatus(contract)}
                    </span>
                  )}
                  <span className={`status-badge status-${contract.status}`}>
                    {contract.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ 
                    marginLeft: 8, 
                    fontSize: 10, 
                    color: 'var(--nc-text-muted)',
                    fontFamily: 'var(--nc-font-mono)'
                  }}>
                    {isClient ? '(POSTED)' : '(ACCEPTED)'}
                  </span>
                </div>
              </div>
              <h3 className="contract-title">{contract.title}</h3>
              <div className="contract-meta">
                <span style={{ color: 'var(--nc-text-muted)', fontSize: 12 }}>
                  {isClient 
                    ? (contract.accepted_by ? `Player: ${contract.accepted_by.handle}` : 'Awaiting player...') 
                    : `Poster: ${contract.poster?.handle}`
                  }
                </span>
              </div>
              
              {/* Contract Actions based on status */}
              <div className="contract-actions">
                {/* Multi-crew view details */}
                {contract.is_multi_crew && (
                  <button 
                    className="nc-btn nc-btn-primary"
                    onClick={(e) => { e.stopPropagation(); navigateToContract(contract.id); }}
                  >
                    <Users size={14} /> Manage Crew
                    <ChevronRight size={14} />
                  </button>
                )}
                
                {/* Poster can manage applicants on open contracts */}
                {!contract.is_multi_crew && isClient && contract.status === 'open' && (
                  <button className="nc-btn nc-btn-secondary" onClick={() => fetchBids(contract.id)}>
                    <Users size={14} /> Manage Applicants
                  </button>
                )}
                
                {/* In Progress - Mark Complete */}
                {(contract.status === 'in_progress' || contract.status === 'pending_completion' || contract.status === 'active' || (contract.poster_id === user?.id && (contract.join_mode === 'multi' || contract.is_multi_crew) && (contract.accepted_participants?.length > 0 || (contract.manifest || []).some(s => s.accepted_by?.id)) && contract.status !== 'completed' && contract.status !== 'cancelled' && contract.status !== 'expired')) && (
                  <>
                    <button
                      className="nc-btn nc-btn-secondary"
                      onClick={() => handleCopyHandle(
                        isClient ? contract.accepted_by?.handle : contract.poster?.handle
                      )}
                    >
                      <Copy size={14} /> Copy Handle
                    </button>
                    <button 
                      className="nc-btn nc-btn-primary" 
                      onClick={() => handleMarkComplete(contract)}
                    >
                      <Check size={14} /> 
                      {contract.status === 'pending_completion' ? 'Confirm Complete' : 'Mark Complete'}
                    </button>
                  </>
                )}
                
                {/* Completed - Show Rating if not yet rated */}
                {contract.status === 'completed' && (
                  <>
                    {isClient && !contract.client_review && (
                      <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, isClient: true })}>
                        <Star size={14} /> Rate Player
                      </button>
                    )}
                    {!isClient && !contract.merc_review && contract.accepted_by?.id === user?.id && (
                      <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, isClient: false })}>
                        <Star size={14} /> Rate Poster
                      </button>
                    )}
                    {isMultiParticipantPending(contract) && (
                      <button
                        className="nc-btn nc-btn-gold"
                        onClick={() => setShowReview({ id: contract.id, isClient: false, isMultiRolePoster: true })}
                        data-testid={`rate-poster-multi-${contract.id}`}
                      >
                        <Star size={14} /> Rate Poster
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Reviews Display */}
              {(contract.client_review || contract.merc_review) && (
                <div className="contract-reviews">
                  {contract.client_review && (
                    <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Poster rated: {contract.client_review.rating}/5
                    </div>
                  )}
                  {contract.merc_review && (
                    <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Player rated: {contract.merc_review.rating}/5
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {myContracts.length === 0 && (
          <div className="nc-card" style={{ textAlign: 'center', padding: 48 }}>
            <Users size={48} className="text-muted" style={{ marginBottom: 16, opacity: 0.5 }} />
            <h3 className="font-display text-muted" style={{ fontSize: 16, marginBottom: 8 }}>
              No Jobs Yet
            </h3>
            <p className="text-muted" style={{ fontSize: 14 }}>
              Post a job or apply to one to get started!
            </p>
          </div>
        )}
      </div>
      )}

      {/* Manage Applicants Modal */}
      {showBidsModal && (
        <div className="mission-modal-overlay" onClick={() => setShowBidsModal(null)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// APPLICANTS</div>
                <h2 className="mission-title">Manage Applicants</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowBidsModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              {contractBids.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--nc-text-muted)', padding: 32 }}>
                  No applicants yet. Check back soon!
                </p>
              ) : (
                <div className="bids-list">
                  {contractBids.filter(b => b.status === 'pending').map(bid => (
                    <div key={bid.id} className="pilot-card">
                      <div 
                        className="pilot-avatar clickable"
                        onClick={() => setShowMercProfile(bid.bidder)}
                        title="View Profile"
                      >
                        {bid.bidder?.avatar_url ? (
                          <img src={bid.bidder.avatar_url} alt="" />
                        ) : (
                          <Users size={32} />
                        )}
                      </div>
                      <div 
                        className="pilot-info clickable"
                        onClick={() => setShowMercProfile(bid.bidder)}
                      >
                        <h4>{bid.bidder?.handle || 'Unknown'}</h4>
                        <div className="pilot-stats">
                          <span><Star size={12} fill="#FFD700" /> {bid.bidder?.reputation?.toFixed(1) || '5.0'}</span>
                          <span>{bid.bidder?.contracts_completed || 0} contracts</span>
                        </div>
                        <span className="view-profile-hint">Click to view profile</span>
                      </div>
                      <div className="pilot-actions">
                        <button 
                          className="nc-btn nc-btn-secondary"
                          onClick={() => navigate(`/profile/${bid.bidder_id}`)}
                          style={{ fontSize: 10, padding: '8px 12px' }}
                        >
                          View Profile
                        </button>
                        <button 
                          className="nc-btn nc-btn-primary"
                          onClick={() => handleAcceptBid(showBidsModal, bid.id, bid.bidder?.handle)}
                        >
                          Accept
                        </button>
                        <button 
                          className="nc-btn nc-btn-secondary"
                          onClick={() => handleDeclineBid(showBidsModal, bid.id)}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Handshake Modal */}
      {showHandshakeModal && (
        <div className="mission-modal-overlay">
          <div className="mission-modal" style={{ maxWidth: 450, textAlign: 'center' }}>
            <div className="mission-modal-header" style={{ justifyContent: 'center' }}>
              <div>
                <div className="mission-type-badge">// HANDSHAKE_COMPLETE</div>
                <h2 className="mission-title">Contract Accepted!</h2>
              </div>
            </div>
            <div className="mission-modal-content">
              <div className="handshake-icon">🤝</div>
              <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 24, fontSize: 15 }}>
                {showHandshakeModal.type === 'poster' ? (
                  <>Your selected player is ready. Add them to your party in Star Citizen.</>
                ) : (
                  <>Your application was accepted! Add the poster to your party immediately.</>
                )}
              </p>
              <div className="handshake-handle">
                <span className="label">RSI HANDLE</span>
                <span className="handle">{showHandshakeModal.handle}</span>
                <button 
                  className="nc-btn nc-btn-secondary"
                  onClick={() => handleCopyHandle(showHandshakeModal.handle)}
                  style={{ marginTop: 12 }}
                >
                  <Copy size={14} /> Copy Handle
                </button>
              </div>
              <button 
                className="nc-btn nc-btn-primary"
                onClick={() => setShowHandshakeModal(null)}
                style={{ width: '100%', marginTop: 24 }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applicant Accepted Notification Modal */}
      {acceptedBidNotification && (
        <div className="mission-modal-overlay">
          <div className="mission-modal" style={{ maxWidth: 480, textAlign: 'center' }}>
            <div className="mission-modal-header" style={{ justifyContent: 'center', background: 'rgba(0, 255, 136, 0.1)' }}>
              <div>
                <div className="mission-type-badge" style={{ color: 'var(--nc-green)' }}>// APPLICATION_ACCEPTED</div>
                <h2 className="mission-title" style={{ color: 'var(--nc-green)' }}>You've Been Hired!</h2>
              </div>
            </div>
            <div className="mission-modal-content">
              <div className="accepted-notification-icon">✓</div>
              <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 16, fontSize: 15 }}>
                Your application for <strong style={{ color: 'var(--nc-cyan)' }}>{acceptedBidNotification.contract?.title}</strong> has been accepted.
              </p>
              <p style={{ color: 'var(--nc-text-muted)', marginBottom: 24, fontSize: 13 }}>
                Add the poster to your party in Star Citizen immediately. For rescue missions, they may be incapacitated and unable to invite you.
              </p>
              <div className="client-handle-box">
                <span className="label">POSTER RSI HANDLE</span>
                <div className="client-info">
                  {acceptedBidNotification.client_avatar && (
                    <img src={acceptedBidNotification.client_avatar} alt="" className="client-avatar" />
                  )}
                  <span className="handle">{acceptedBidNotification.client_handle || 'Unknown'}</span>
                </div>
                <button 
                  className="nc-btn nc-btn-primary"
                  onClick={() => handleCopyHandle(acceptedBidNotification.client_handle)}
                  style={{ marginTop: 12 }}
                >
                  <Copy size={14} /> Copy Handle
                </button>
              </div>
              <div style={{ marginTop: 24, padding: 12, background: 'rgba(255, 153, 0, 0.1)', border: '1px solid rgba(255, 153, 0, 0.3)' }}>
                <p style={{ color: '#ff9900', fontSize: 12, fontFamily: 'var(--nc-font-mono)', margin: 0 }}>
                  ⚠️ IMPORTANT: Write down this handle before closing! The poster may be unable to look you up if incapacitated.
                </p>
              </div>
              <button 
                className="nc-btn nc-btn-secondary"
                onClick={() => acknowledgeAcceptedBid(acceptedBidNotification.bid_id)}
                style={{ width: '100%', marginTop: 24 }}
              >
                I've Copied the Handle - Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applicant Profile Modal */}
      {showMercProfile && (
        <div className="mission-modal-overlay" onClick={() => setShowMercProfile(null)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// PILOT_DOSSIER</div>
                <h2 className="mission-title">Applicant Profile</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowMercProfile(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              <div className="merc-profile-header">
                <div className="merc-avatar-large">
                  {showMercProfile.avatar_url ? (
                    <img src={showMercProfile.avatar_url} alt="" />
                  ) : (
                    <Users size={64} />
                  )}
                </div>
                <h3 className="merc-handle">{showMercProfile.handle}</h3>
              </div>
              <div className="merc-stats-grid">
                <div className="merc-stat">
                  <Star size={24} color="#FFD700" fill="#FFD700" />
                  <span className="stat-value">{showMercProfile.reputation?.toFixed(1) || '5.0'}</span>
                  <span className="stat-label">RATING</span>
                </div>
                <div className="merc-stat">
                  <Shield size={24} color="var(--nc-cyan)" />
                  <span className="stat-value">{showMercProfile.contracts_completed || 0}</span>
                  <span className="stat-label">COMPLETED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .merc-profile-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .merc-avatar-large {
          width: 100px;
          height: 100px;
          margin: 0 auto 16px;
          border-radius: 50%;
          border: 3px solid var(--nc-cyan);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--nc-bg-secondary);
        }
        .merc-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .merc-handle {
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 24px;
          margin: 0;
        }
        .merc-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .merc-stat {
          text-align: center;
          padding: 20px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
        }
        .merc-stat .stat-value {
          display: block;
          font-size: 28px;
          font-weight: bold;
          color: var(--nc-text);
          margin: 8px 0 4px;
        }
        .merc-stat .stat-label {
          font-size: 10px;
          letter-spacing: 2px;
          color: var(--nc-text-muted);
        }
        .accepted-notification-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 20px;
          border-radius: 50%;
          background: rgba(0, 255, 136, 0.2);
          border: 2px solid var(--nc-green);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: var(--nc-green);
        }
        .client-handle-box {
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          padding: 20px;
          margin-top: 16px;
        }
        .client-handle-box .label {
          display: block;
          font-size: 10px;
          letter-spacing: 2px;
          color: var(--nc-text-muted);
          margin-bottom: 12px;
        }
        .client-handle-box .client-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .client-handle-box .client-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid var(--nc-cyan);
        }
        .client-handle-box .handle {
          font-size: 24px;
          font-weight: bold;
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
        }
        .pilot-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          margin-bottom: 12px;
        }
        .pilot-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid var(--nc-cyan);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--nc-bg);
        }
        .pilot-avatar.clickable {
          cursor: pointer;
        }
        .pilot-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pilot-info {
          flex: 1;
        }
        .pilot-info.clickable {
          cursor: pointer;
        }
        .pilot-info h4 {
          margin: 0 0 4px;
          color: var(--nc-cyan);
          font-size: 16px;
        }
        .pilot-stats {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--nc-text-muted);
        }
        .pilot-stats span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .view-profile-hint {
          font-size: 10px;
          color: var(--nc-text-muted);
          opacity: 0.7;
        }
        .pilot-actions {
          display: flex;
          gap: 8px;
        }
        .handshake-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .handshake-handle {
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          padding: 20px;
        }
        .handshake-handle .label {
          display: block;
          font-size: 10px;
          letter-spacing: 2px;
          color: var(--nc-text-muted);
          margin-bottom: 8px;
        }
        .handshake-handle .handle {
          display: block;
          font-size: 28px;
          font-weight: bold;
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
        }
        .rating-stars {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .star-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: rgba(255, 255, 255, 0.3);
          transition: transform 0.2s;
        }
        .star-btn:hover {
          transform: scale(1.1);
        }
        .star-btn.active {
          color: #FFD700;
        }
        .pending-rating-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: var(--nc-gold);
          color: var(--nc-bg);
          border-radius: 50%;
          font-size: 12px;
          font-weight: bold;
          margin-left: 8px;
        }
        .pending-ratings-section {
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255, 215, 0, 0.05);
          border: 1px solid rgba(255, 215, 0, 0.2);
        }
        .contract-card.pending-rating {
          border-color: var(--nc-gold);
        }
      `}</style>
    </div>
  );
}
