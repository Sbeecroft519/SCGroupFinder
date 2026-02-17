import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Heart, Package, Users, Copy, Star, MapPin, Clock, Check, Plus, X, ThumbsUp, ArrowRight, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';
import { CONTRACT_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS } from '../constants/badges';

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
    // Location fields
    system: 'Stanton',
    planet: '',
    location: ''
  });

  const showPaymentField = !isMultiCrew && newContract.compensation_type === 'Flat Fee' && !newContract.split_profits;

  // Generate title based on category
  const generateTitle = (contract) => {
    const cat = CATEGORY_LABELS[contract.category] || 'Contract';
    return contract.title || `${cat} Contract`;
  };

  // Check if contract form is valid
  const isContractValid = () => {
    // Multi-crew validation
    if (isMultiCrew) {
      return manifest.length > 0;
    }
    
    // Payment validation (skip if split_profits is true)
    if (showPaymentField && (!newContract.payment_amount || isNaN(parseInt(newContract.payment_amount)))) {
      return false;
    }
    
    // Simplified: just need title/description and location
    return newContract.title && newContract.planet && newContract.location;
  };

  useEffect(() => {
    fetchContracts();
    fetchUserStatus();
    fetchMyContracts();
  }, [filter]);

  const fetchContracts = async () => {
    try {
      const params = filter !== 'all' ? { category: filter } : {};
      const response = await axios.get(`${API}/contracts`, { params });
      if (response.data && response.data.length > 0) {
        setContracts(response.data);
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

  const handleMarkComplete = async (contractId) => {
    try {
      const response = await axios.post(`${API}/contracts/${contractId}/mark-complete`);
      if (response.data.show_rating) {
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

    const title = generateTitle(newContract);
    const locationStr = `${newContract.planet} - ${newContract.location}`;
    
    const paymentAmount = showPaymentField ? parseInt(newContract.payment_amount) || 0 : 0;
    const cat = CATEGORY_LABELS[newContract.category] || 'Contract';

    const contractData = {
      title: isMultiCrew ? `Multi-Crew: ${cat} Operation` : (newContract.title || title),
      description: isMultiCrew ? `Multi-crew ${cat.toLowerCase()} operation requiring ${manifest.length} crew members.` : (newContract.description || null),
      category: newContract.category,
      compensation_type: newContract.compensation_type,
      // Payment
      payment_amount: paymentAmount,
      split_profits: newContract.split_profits,
      // Location
      system: newContract.system,
      planet: newContract.planet,
      location: locationStr,
      shard: myShard,
      // Multi-crew
      is_multi_crew: isMultiCrew,
      manifest: isMultiCrew ? manifest : null,
      // Duration
      duration_minutes: duration
    };

    try {
      const response = await axios.post(`${API}/contracts`, contractData);
      setContracts(prev => [response.data, ...prev]);
      setShowCreate(false);
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };
  
  const resetForm = () => {
    setNewContract({
      category: 'COMBAT', title: '', description: '', compensation_type: 'Flat Fee', 
      split_profits: false, payment_amount: '', system: 'Stanton', planet: '', location: ''
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
      fetchMyContracts();
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
    // Don't show timer for active/in_progress/completed/cancelled contracts
    if (['active', 'in_progress', 'pending_completion', 'completed', 'cancelled'].includes(contract.status)) {
      return null;
    }
    
    if (!contract.expires_at) return null;
    const now = new Date();
    const expires = new Date(contract.expires_at);
    const diffMs = expires - now;
    if (diffMs <= 0) return { text: 'Expired', color: '#ff4d4d', isDistress: false };
    
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    const isDistress = contract.duration_minutes === 30;
    let color = 'rgba(255,255,255,0.5)'; // default muted
    if (isDistress) color = '#ff4d4d'; // red for distress
    else if (mins < 10) color = '#ff9900'; // amber for < 10 min
    
    const text = hours > 0 ? `${hours}h ${remainingMins}m` : `${mins}m`;
    return { text, color, isDistress };
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
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
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
              {/* Contract Category - SINGLE UNIFIED FIELD */}
              <div className="form-group">
                <label className="nc-label">CONTRACT CATEGORY</label>
                <select
                  className="nc-input"
                  value={newContract.category}
                  onChange={e => setNewContract(prev => ({ ...prev, category: e.target.value }))}
                  data-testid="category-select"
                  style={{ fontSize: 14 }}
                >
                  {CONTRACT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Contract Title */}
              <div className="form-group">
                <label className="nc-label">CONTRACT TITLE</label>
                <input
                  className="nc-input"
                  type="text"
                  placeholder="e.g., Escort from Lorville to Orison"
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

              {/* Multi-Crew Toggle */}
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
                  {/* Location Selectors */}
                  <div className="form-group">
                    <label className="nc-label">LOCATION</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <select 
                        className="nc-input"
                        value={newContract.system}
                        onChange={e => setNewContract(prev => ({ ...prev, system: e.target.value, planet: '', location: '' }))}
                      >
                        {SYSTEMS.map(sys => (
                          <option key={sys} value={sys}>{sys}</option>
                        ))}
                      </select>
                      <select 
                        className="nc-input"
                        value={newContract.planet}
                        onChange={e => setNewContract(prev => ({ ...prev, planet: e.target.value, location: '' }))}
                      >
                        <option value="">Planet/Area...</option>
                        {newContract.system && Object.keys(LOCATIONS[newContract.system] || {}).map(planet => (
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
                        {newContract.planet && newContract.system && LOCATIONS[newContract.system]?.[newContract.planet]?.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Split Profits Checkbox */}
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

                  {/* Payment Amount - only show if not split profits */}
                  {showPaymentField && (
                    <div className="form-group">
                      <label className="nc-label">CONTRACT PAYOUT (aUEC)</label>
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

              {/* Listing Duration */}
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

              <button 
                className="nc-btn nc-btn-primary" 
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleCreateContract}
                disabled={!isContractValid()}
                data-testid="post-contract-btn"
              >
                POST {isMultiCrew ? 'MULTI-CREW ' : ''}BEACON
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
          >
            All
          </button>
          {CONTRACT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`nc-toggle ${filter === cat.id ? 'active' : ''}`}
              onClick={() => setFilter(cat.id)}
            >
              {cat.icon} {cat.shortLabel}
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
          <span className="font-mono text-muted" style={{ fontSize: 11 }}>MY SHARD</span>
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
                  {isSplitProfits ? (
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
                {/* Status Badge */}
                {contract.status && contract.status !== 'open' && (
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
                
                {/* Single-crew: Poster Actions */}
                {!contract.is_multi_crew && contract.poster_id === user?.id && contract.status === 'open' && (
                  <button className="nc-btn nc-btn-secondary" onClick={() => fetchBids(contract.id)}>
                    <Users size={14} /> Manage Bids
                  </button>
                )}
                
                {/* Single-crew: Merc Actions - Apply */}
                {!contract.is_multi_crew && contract.poster_id !== user?.id && contract.status === 'open' && (
                  myBids.some(b => b.contract_id === contract.id) ? (
                    <button className="nc-btn nc-btn-secondary" disabled>
                      <Check size={14} /> Bid Sent
                    </button>
                  ) : (
                    <button 
                      className="nc-btn nc-btn-primary" 
                      onClick={() => handleBid(contract.id)}
                      disabled={hasActiveContract}
                      title={hasActiveContract ? 'You already have an active contract' : ''}
                    >
                      <ThumbsUp size={14} /> Apply for Contract
                    </button>
                  )
                )}
                
                {/* In Progress - Show Handle & Mark Complete */}
                {(contract.status === 'in_progress' || contract.status === 'pending_completion' || contract.status === 'active') && (
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
                      onClick={() => handleMarkComplete(contract.id)}
                    >
                      <Check size={14} /> 
                      {contract.status === 'pending_completion' ? 'Confirm Complete' : 'Mark Complete'}
                    </button>
                    {/* Cancel button for contract owner on active contracts */}
                    {contract.poster_id === user?.id && (
                      <button 
                        onClick={() => handleCancelContract(contract.id)}
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
                  </>
                )}
                
                {/* Cancel button for contract owner - OPEN/MUSTERING status */}
                {contract.poster_id === user?.id && ['open', 'mustering'].includes(contract.status) && (
                  <button 
                    onClick={() => handleCancelContract(contract.id)}
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
                    {/* Client can rate merc if they haven't yet */}
                    {contract.poster_id === user?.id && !contract.client_review && (
                      <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, isClient: true })}>
                        <Star size={14} /> Rate Mercenary
                      </button>
                    )}
                    {/* Merc can rate client if they haven't yet */}
                    {contract.accepted_by?.id === user?.id && !contract.merc_review && (
                      <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, isClient: false })}>
                        <Star size={14} /> Rate Client
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
      )}

      {/* My Contracts View */}
      {viewMode === 'my' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Pending Ratings Section */}
        {myContracts.filter(c => 
          (c.status === 'completed' && c.poster_id === user?.id && !c.client_review) ||
          (c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review)
        ).length > 0 && (
          <div className="pending-ratings-section">
            <h3 style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 12, color: 'var(--nc-gold)', marginBottom: 12, letterSpacing: 2 }}>
              // PENDING_RATINGS
            </h3>
            {myContracts.filter(c => 
              (c.status === 'completed' && c.poster_id === user?.id && !c.client_review) ||
              (c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review)
            ).map(contract => {
              const categoryDisplay = getCategoryDisplay(contract.category);
              const isClient = contract.poster_id === user?.id;
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
                      {isClient ? `Merc: ${contract.accepted_by?.handle}` : `Client: ${contract.poster?.handle}`}
                    </span>
                  </div>
                  <div className="contract-actions">
                    <button 
                      className="nc-btn nc-btn-gold" 
                      onClick={() => setShowReview({ id: contract.id, isClient })}
                    >
                      <Star size={14} /> Rate {isClient ? 'Mercenary' : 'Client'}
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
                    ? (contract.accepted_by ? `Merc: ${contract.accepted_by.handle}` : 'Awaiting merc...') 
                    : `Client: ${contract.poster?.handle}`
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
                
                {/* Poster can manage bids on open contracts */}
                {!contract.is_multi_crew && isClient && contract.status === 'open' && (
                  <button className="nc-btn nc-btn-secondary" onClick={() => fetchBids(contract.id)}>
                    <Users size={14} /> Manage Bids
                  </button>
                )}
                
                {/* In Progress - Mark Complete */}
                {(contract.status === 'in_progress' || contract.status === 'pending_completion' || contract.status === 'active') && (
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
                      onClick={() => handleMarkComplete(contract.id)}
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
                        <Star size={14} /> Rate Mercenary
                      </button>
                    )}
                    {!isClient && !contract.merc_review && (
                      <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({ id: contract.id, isClient: false })}>
                        <Star size={14} /> Rate Client
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
                      <Star size={12} fill="#FFD700" /> Client rated: {contract.client_review.rating}/5
                    </div>
                  )}
                  {contract.merc_review && (
                    <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Merc rated: {contract.merc_review.rating}/5
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
              No Contracts Yet
            </h3>
            <p className="text-muted" style={{ fontSize: 14 }}>
              Post a contract or apply for one to get started!
            </p>
          </div>
        )}
      </div>
      )}

      {/* Manage Bids Modal */}
      {showBidsModal && (
        <div className="mission-modal-overlay" onClick={() => setShowBidsModal(null)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// APPLICANTS</div>
                <h2 className="mission-title">Manage Bids</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowBidsModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              {contractBids.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--nc-text-muted)', padding: 32 }}>
                  No bids yet. Check back soon!
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
                  <>Your selected mercenary is ready. Add them to your party in Star Citizen.</>
                ) : (
                  <>Your bid was accepted! Add the client to your party immediately.</>
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

      {/* Merc Accepted Notification Modal */}
      {acceptedBidNotification && (
        <div className="mission-modal-overlay">
          <div className="mission-modal" style={{ maxWidth: 480, textAlign: 'center' }}>
            <div className="mission-modal-header" style={{ justifyContent: 'center', background: 'rgba(0, 255, 136, 0.1)' }}>
              <div>
                <div className="mission-type-badge" style={{ color: 'var(--nc-green)' }}>// BID_ACCEPTED</div>
                <h2 className="mission-title" style={{ color: 'var(--nc-green)' }}>You've Been Hired!</h2>
              </div>
            </div>
            <div className="mission-modal-content">
              <div className="accepted-notification-icon">✓</div>
              <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 16, fontSize: 15 }}>
                Your bid for <strong style={{ color: 'var(--nc-cyan)' }}>{acceptedBidNotification.contract?.title}</strong> has been accepted.
              </p>
              <p style={{ color: 'var(--nc-text-muted)', marginBottom: 24, fontSize: 13 }}>
                Add the client to your party in Star Citizen immediately. For rescue missions, the client may be incapacitated and unable to invite you.
              </p>
              <div className="client-handle-box">
                <span className="label">CLIENT RSI HANDLE</span>
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
                  ⚠️ IMPORTANT: Write down this handle before closing! The client may be unable to look you up if incapacitated.
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

      {/* Merc Profile Modal */}
      {showMercProfile && (
        <div className="mission-modal-overlay" onClick={() => setShowMercProfile(null)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// PILOT_DOSSIER</div>
                <h2 className="mission-title">Mercenary Profile</h2>
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
