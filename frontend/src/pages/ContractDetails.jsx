import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, User, Users, Check, X, AlertCircle, Star, Shield, Calendar, Lock, Copy } from 'lucide-react';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../constants/badges';
import { useBleedoutCountdown, HeartMonitor } from '../utils/bleedout';
import DiscordBadge from '../components/DiscordBadge';

const RescuePublicPanel = ({ contract }) => {
  const { label, expired } = useBleedoutCountdown(contract.rescue_bleedout_expires_at);
  const rows = [
    ['System', contract.meeting_system || contract.system || 'Unknown'],
    ['Injury Tier', contract.rescue_injury_tier || 'Unknown'],
    ['PvP Area', contract.rescue_pvp_area || 'Unknown'],
    ['Hostile NPCs', contract.rescue_hostile_npcs || 'Unknown'],
    ['AA Turrets', contract.rescue_aa_turrets || 'Unknown'],
    ['Hydration / Food', contract.rescue_needs_food_hydration || 'Unknown'],
  ];
  return (
    <div data-testid="rescue-public-panel" style={{ background: 'rgba(255,0,68,0.05)', border: '1px solid rgba(255,0,68,0.3)', padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <HeartMonitor flatline={expired} />
        <div style={{ fontFamily: 'var(--nc-font-display)', fontSize: 18, color: expired ? '#888' : '#ff4466' }} data-testid="details-bleedout-countdown">
          {expired ? 'Deceased' : `Bleed-out: ${label}`}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#ccc', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#888', fontFamily: 'var(--nc-font-mono)' }}>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#888', fontFamily: 'var(--nc-font-mono)' }}>
        Exact location hidden until accepted.
      </div>
    </div>
  );
};

const RescuePrivatePanel = ({ contract }) => (
  <div data-testid="rescue-private-panel" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.4)', padding: 16, marginBottom: 16 }}>
    <div style={{ color: '#00ff88', fontFamily: 'var(--nc-font-mono)', fontSize: 12, letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Lock size={14} /> ACCEPTED RESCUE DETAILS
    </div>
    {contract.rescue_exact_location && (
      <div style={{ marginBottom: 8, color: '#ccc' }}><strong style={{ color: '#00ff88', marginRight: 8 }}>Landmark / POI:</strong>{contract.rescue_exact_location}</div>
    )}
    {contract.rescue_body_location && (
      <div style={{ marginBottom: 8, color: '#ccc' }}><strong style={{ color: '#00ff88', marginRight: 8 }}>Approx. body location:</strong>{contract.rescue_body_location}</div>
    )}
    {contract.rescue_private_notes && (
      <div style={{ color: '#ccc', whiteSpace: 'pre-wrap' }}><strong style={{ color: '#00ff88', marginRight: 8 }}>Private notes:</strong>{contract.rescue_private_notes}</div>
    )}
  </div>
);

const MultiJoinRoster = ({ contract, currentUserId }) => {
  const [copied, setCopied] = useState(false);
  const participants = contract.accepted_participants || [];
  const max = contract.max_participants || 8;
  const remaining = Math.max(0, max - participants.length);
  const full = participants.length >= max;

  const copyAll = async () => {
    if (!participants.length) return;
    const text = participants.map(p => p.handle).filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // fall back: select-and-prompt is overkill — silent fail is fine
    }
  };

  return (
    <div data-testid="multi-join-roster" style={{
      background: 'rgba(2, 11, 20, 0.95)',
      border: '1px solid #00f0ff',
      clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))',
      boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
      marginTop: 20,
    }}>
      <div style={{
        padding: '20px 25px',
        borderBottom: '1px solid rgba(0, 240, 255, 0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#00f0ff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={20} />
          ROSTER
        </span>
        <span data-testid="roster-count" style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 'bold', borderRadius: 2,
          background: full ? 'rgba(255,68,102,0.18)' : 'rgba(0,240,255,0.12)',
          color: full ? '#ff4466' : '#00f0ff',
          border: `1px solid ${full ? '#ff4466' : '#00f0ff'}`,
        }}>
          {participants.length}/{max} {full ? '· FULL' : `· ${remaining} spot${remaining === 1 ? '' : 's'} left`}
        </span>
      </div>

      <div style={{ padding: 18 }}>
        {participants.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--nc-font-mono)', fontSize: 13 }}>
            No one has joined yet — be the first to hop in.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {participants.map((p, idx) => (
                <div key={p.id || idx} data-testid={`roster-${idx}`} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(0, 240, 255, 0.04)',
                  border: '1px solid rgba(0, 240, 255, 0.18)',
                  padding: '10px 14px',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <User size={16} color="#00f0ff" />
                    <strong style={{ color: '#fff' }}>{p.handle || 'Unknown pilot'}</strong>
                    {p.id && p.id === currentUserId && (
                      <span style={{
                        fontSize: 10, padding: '2px 6px', letterSpacing: 1,
                        background: '#00ff88', color: '#000', borderRadius: 2, fontWeight: 'bold',
                      }}>YOU</span>
                    )}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffd700', fontFamily: 'var(--nc-font-mono)', fontSize: 13 }}>
                    <Star size={12} fill="#ffd700" /> {Number(p.reputation ?? 5.0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={copyAll}
              data-testid="roster-copy-all"
              style={{
                background: 'transparent', border: '1px solid #00f0ff', color: '#00f0ff',
                padding: '8px 14px', fontSize: 12, letterSpacing: 1, fontFamily: 'var(--nc-font-mono)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <Copy size={14} /> {copied ? 'COPIED' : 'COPY ALL HANDLES'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const ContractDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedSlot, setExpandedSlot] = useState(null);

  useEffect(() => {
    fetchContract();
    fetchCurrentUser();
  }, [id]);

  const fetchContract = async () => {
    try {
      const token = localStorage.getItem('navcom_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API}/api/contracts/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContract(data);
      }
    } catch (error) {
      console.error('Failed to fetch contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('navcom_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const handleBid = async (slotIndex) => {
    try {
      const token = localStorage.getItem('navcom_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API}/api/contracts/${id}/manifest/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slot_index: slotIndex })
      });
      if (response.ok) {
        fetchContract();
      }
    } catch (error) {
      console.error('Failed to submit bid:', error);
    }
  };

  const handleWithdraw = async (slotIndex) => {
    try {
      const token = localStorage.getItem('navcom_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API}/api/contracts/${id}/manifest/bid/${slotIndex}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchContract();
      }
    } catch (error) {
      console.error('Failed to withdraw bid:', error);
    }
  };

  const handleAcceptBid = async (slotIndex, userId) => {
    try {
      const token = localStorage.getItem('navcom_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API}/api/contracts/${id}/manifest/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slot_index: slotIndex, user_id: userId })
      });
      if (response.ok) {
        fetchContract();
      }
    } catch (error) {
      console.error('Failed to accept bid:', error);
    }
  };

  const handleDeploy = async () => {
    try {
      const token = localStorage.getItem('navcom_token');
      const API = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API}/api/contracts/${id}/deploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchContract();
      }
    } catch (error) {
      console.error('Failed to deploy:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ color: '#00f0ff', textAlign: 'center', padding: '50px' }}>Loading...</div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={styles.page}>
        <div style={{ color: '#ff4d4d', textAlign: 'center', padding: '50px' }}>Contract not found</div>
      </div>
    );
  }

  const isOwner = currentUser && contract.poster_id === currentUser.id;
  const isAdmin = currentUser && currentUser.is_admin;
  const isAcceptedRescuer = currentUser && contract.accepted_by && contract.accepted_by.id === currentUser.id;
  const canSeePrivateRescue = isOwner || isAdmin || isAcceptedRescuer;
  const isMedical = contract.category === 'MEDICAL';
  const filledCount = contract.manifest?.filter(s => s.status === 'FILLED').length || 0;
  const totalSlots = contract.manifest?.length || 0;
  const totalPayout = contract.manifest?.reduce((sum, s) => sum + s.payout, 0) || contract.payout || contract.payment_amount || 0;

  // Compute display location string respecting privacy and meeting visibility
  const meetingDisplay = (() => {
    if (isMedical) {
      return `${contract.meeting_system || contract.system || 'Unknown'} (exact location private)`;
    }
    if (contract.meeting_visibility === 'disclosed_on_acceptance') {
      return 'Disclosed on Acceptance';
    }
    if (contract.meeting_system && contract.meeting_major_location) {
      return `${contract.meeting_system} - ${contract.meeting_major_location}`;
    }
    return contract.location || contract.meeting_system || contract.system || 'Location TBD';
  })();

  const userHasBidOnSlot = (slot) => {
    return slot.bids?.some(bid => bid.user_id === currentUser?.id);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#00f0ff';
      case 'PENDING': return '#ffd700';
      case 'FILLED': return '#00ff88';
      default: return '#888';
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => navigate('/contracts')} data-testid="back-to-contracts">
          <ArrowLeft size={18} />
          BACK TO CONTRACTS
        </button>

        <div style={styles.mainCard}>
          <div style={styles.header}>
            <span style={styles.typeBadge}>
              {CATEGORY_ICONS[contract.category] || '📋'} {CATEGORY_LABELS[contract.category] || contract.category || 'Contract'}
            </span>
            <h1 style={styles.title}>{contract.title}</h1>
            <div style={styles.meta}>
              <div style={styles.metaItem}>
                <MapPin size={16} color="#00f0ff" />
                {meetingDisplay}
              </div>
              <div style={styles.metaItem}>
                <User size={16} color="#00f0ff" />
                {contract.poster?.handle || contract.poster_handle}
                <DiscordBadge
                  discordLinked={contract.poster?.discord_linked}
                  discordUsername={contract.poster?.discord_username}
                  size={14}
                />
              </div>
              <div style={styles.metaItem}>
                <Clock size={16} color="#00f0ff" />
                {new Date(contract.created_at).toLocaleDateString()}
              </div>
              {contract.timing_type === 'future' && contract.scheduled_start_at ? (
                <div style={{ ...styles.metaItem, color: '#aa00ff' }} data-testid="details-timing-future">
                  <Calendar size={16} color="#aa00ff" />
                  Scheduled: {new Date(contract.scheduled_start_at).toLocaleString()}{contract.scheduled_timezone ? ` (${contract.scheduled_timezone})` : ''}
                </div>
              ) : (
                <div style={{ ...styles.metaItem, color: '#00f0ff' }} data-testid="details-timing-now">
                  🚨 Looking Now
                </div>
              )}
            </div>
          </div>
          <div style={styles.body}>
            {isMedical && (
              <RescuePublicPanel contract={contract} />
            )}
            {isMedical && canSeePrivateRescue && (
              <RescuePrivatePanel contract={contract} />
            )}
            {contract.description && <p style={styles.description}>{contract.description}</p>}
            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <div style={styles.statValue}>{totalPayout.toLocaleString()}</div>
                <div style={styles.statLabel}>TOTAL PAYOUT (aUEC)</div>
              </div>
              {contract.is_multi_crew && (
                <>
                  <div style={styles.stat}>
                    <div style={{ ...styles.statValue, color: '#00f0ff' }}>{totalSlots}</div>
                    <div style={styles.statLabel}>CREW SLOTS</div>
                  </div>
                  <div style={styles.stat}>
                    <div style={{ ...styles.statValue, color: '#00ff88' }}>{filledCount}</div>
                    <div style={styles.statLabel}>FILLED</div>
                  </div>
                </>
              )}
              <div style={styles.stat}>
                <div style={{ ...styles.statValue, color: getStatusColor(contract.status?.toUpperCase()) }}>
                  {contract.status?.toUpperCase()}
                </div>
                <div style={styles.statLabel}>STATUS</div>
              </div>
            </div>
          </div>
        </div>

        {contract.join_mode === 'multi' && (
          <MultiJoinRoster contract={contract} currentUserId={currentUser?.id} />
        )}

        {contract.is_multi_crew && contract.manifest ? (
          <div style={styles.rosterCard}>
            <div style={styles.rosterHeader}>
              <span style={styles.rosterTitle}>
                <Users size={20} />
                CREW ROSTER
              </span>
              <span style={{
                ...styles.progressBadge,
                background: filledCount === totalSlots ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 215, 0, 0.2)',
                color: filledCount === totalSlots ? '#00ff88' : '#ffd700',
                border: `1px solid ${filledCount === totalSlots ? '#00ff88' : '#ffd700'}`
              }}>
                {filledCount}/{totalSlots} FILLED
              </span>
            </div>

            <div style={styles.slotList}>
              {contract.manifest.map((slot, index) => (
                <div key={index} style={styles.slot} data-testid={`crew-slot-${index}`}>
                  <div
                    style={styles.slotHeader}
                    onClick={() => setExpandedSlot(expandedSlot === index ? null : index)}
                  >
                    <div style={styles.slotRole}>
                      <User size={18} color={getStatusColor(slot.status)} />
                      <span style={styles.roleName}>{slot.role}</span>
                      <span style={styles.slotPayout}>{slot.payout.toLocaleString()} aUEC</span>
                      {slot.applicant_id === currentUser?.id && (
                        <span style={styles.assignedBadge}>YOU</span>
                      )}
                    </div>
                    <div style={{ ...styles.slotStatus, color: getStatusColor(slot.status) }}>
                      {slot.status === 'FILLED' && <Check size={14} />}
                      {slot.status === 'PENDING' && <AlertCircle size={14} />}
                      {slot.status === 'OPEN' && <Clock size={14} />}
                      {slot.status}
                      {slot.status === 'PENDING' && ` (${slot.bids?.length || 0})`}
                    </div>
                  </div>

                  {expandedSlot === index && (
                    <div style={styles.expandedArea}>
                      {slot.status === 'FILLED' && slot.filled_by && (
                        <div style={styles.filledByInfo}>
                          <Shield size={18} />
                          <span>Assigned: <strong>{slot.filled_by.handle}</strong></span>
                        </div>
                      )}

                      {slot.status !== 'FILLED' && isOwner && (
                        <>
                          {slot.bids && slot.bids.length > 0 ? (
                            <>
                              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '1px', marginBottom: '10px' }}>
                                APPLICANTS ({slot.bids.length})
                              </div>
                              {slot.bids.map((bid, bidIdx) => (
                                <div key={bidIdx} style={styles.bidItem}>
                                  <div style={styles.bidderInfo}>
                                    <span style={styles.bidderHandle}>{bid.handle}</span>
                                  </div>
                                  <button
                                    style={{ ...styles.button, ...styles.acceptButton }}
                                    onClick={() => handleAcceptBid(index, bid.user_id)}
                                    data-testid={`accept-bid-${index}-${bidIdx}`}
                                  >
                                    ACCEPT
                                  </button>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                              No applicants yet.
                            </div>
                          )}
                        </>
                      )}

                      {slot.status !== 'FILLED' && !isOwner && (
                        userHasBidOnSlot(slot) ? (
                          <div>
                            <div style={{ color: '#ffd700', marginBottom: '10px', fontSize: '13px' }}>
                              ⏳ Your bid is pending
                            </div>
                            <button
                              style={{ ...styles.button, ...styles.withdrawButton }}
                              onClick={() => handleWithdraw(index)}
                              data-testid={`withdraw-bid-${index}`}
                            >
                              WITHDRAW BID
                            </button>
                          </div>
                        ) : (
                          <button
                            style={{ ...styles.button, ...styles.bidButton }}
                            onClick={() => handleBid(index)}
                            data-testid={`bid-slot-${index}`}
                          >
                            BID FOR THIS ROLE
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isOwner && contract.status === 'mustering' && filledCount > 0 && (
              <button style={styles.deployButton} onClick={handleDeploy} data-testid="deploy-team-btn">
                🚀 DEPLOY TEAM ({filledCount}/{totalSlots} READY)
              </button>
            )}
          </div>
        ) : (
          <div style={styles.rosterCard}>
            <div style={styles.rosterHeader}>
              <span style={styles.rosterTitle}>CONTRACT DETAILS</span>
            </div>
            <div style={{ padding: '25px' }}>
              <div style={{ ...styles.statsRow, marginBottom: '20px' }}>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{(contract.payout || contract.payment_amount || 0).toLocaleString()}</div>
                  <div style={styles.statLabel}>PAYOUT (aUEC)</div>
                </div>
              </div>
              {!isOwner && !contract.assigned_to && contract.status === 'open' && (
                <button style={{ ...styles.button, ...styles.bidButton, width: '100%', padding: '15px' }} data-testid="apply-contract-btn">
                  APPLY FOR CONTRACT
                </button>
              )}
              {contract.assigned_to && (
                <div style={{ color: '#00ff88', textAlign: 'center', padding: '20px' }}>
                  <Check size={24} style={{ marginBottom: '10px' }} />
                  <div>Assigned to: {contract.assigned_to}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #020b14 0%, #0a1628 50%, #020b14 100%)',
    padding: '20px',
    fontFamily: "'Rajdhani', 'Segoe UI', sans-serif"
  },
  container: { maxWidth: '900px', margin: '0 auto' },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#00f0ff',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '20px',
    padding: '10px 0'
  },
  mainCard: {
    background: 'rgba(2, 11, 20, 0.95)',
    border: '1px solid #00f0ff',
    clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)',
    marginBottom: '20px'
  },
  header: {
    padding: '25px 30px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.3)'
  },
  typeBadge: {
    display: 'inline-block',
    color: '#00f0ff',
    fontSize: '11px',
    letterSpacing: '2px',
    padding: '6px 14px',
    background: 'rgba(0, 240, 255, 0.1)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    marginBottom: '10px'
  },
  title: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 15px 0'
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '14px'
  },
  body: { padding: '25px 30px' },
  description: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: '15px',
    lineHeight: '1.7',
    whiteSpace: 'pre-line',
    marginBottom: '25px'
  },
  statsRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    padding: '20px',
    background: 'rgba(0, 240, 255, 0.03)',
    border: '1px solid rgba(0, 240, 255, 0.15)'
  },
  stat: { flex: '1', minWidth: '120px', textAlign: 'center' },
  statValue: { fontSize: '24px', fontWeight: 'bold', color: '#ffd700' },
  statLabel: { fontSize: '11px', letterSpacing: '1px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '5px' },
  rosterCard: {
    background: 'rgba(2, 11, 20, 0.95)',
    border: '1px solid #00f0ff',
    clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)'
  },
  rosterHeader: {
    padding: '20px 25px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rosterTitle: {
    color: '#00f0ff',
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  progressBadge: { padding: '6px 14px', fontSize: '12px', fontWeight: 'bold', borderRadius: '2px' },
  slotList: { padding: '15px' },
  slot: {
    background: 'rgba(0, 240, 255, 0.03)',
    border: '1px solid rgba(0, 240, 255, 0.15)',
    marginBottom: '10px',
    overflow: 'hidden'
  },
  slotHeader: {
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  slotRole: { display: 'flex', alignItems: 'center', gap: '12px' },
  roleName: { color: '#fff', fontWeight: 'bold', fontSize: '15px' },
  slotPayout: { color: '#ffd700', fontSize: '14px' },
  slotStatus: { fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' },
  expandedArea: {
    padding: '15px 20px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderTop: '1px solid rgba(0, 240, 255, 0.1)'
  },
  bidItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    background: 'rgba(0, 240, 255, 0.05)',
    marginBottom: '8px',
    borderLeft: '3px solid #00f0ff'
  },
  bidderInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
  bidderHandle: { color: '#00f0ff', fontWeight: 'bold', fontSize: '14px' },
  button: {
    padding: '10px 20px',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    border: 'none'
  },
  bidButton: {
    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(0, 240, 255, 0.1))',
    border: '1px solid #00f0ff',
    color: '#00f0ff'
  },
  acceptButton: {
    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 255, 136, 0.1))',
    border: '1px solid #00ff88',
    color: '#00ff88'
  },
  withdrawButton: {
    background: 'linear-gradient(135deg, rgba(255, 77, 77, 0.3), rgba(255, 77, 77, 0.1))',
    border: '1px solid #ff4d4d',
    color: '#ff4d4d'
  },
  deployButton: {
    width: 'calc(100% - 30px)',
    padding: '18px',
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '3px',
    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 255, 136, 0.1))',
    border: '2px solid #00ff88',
    color: '#00ff88',
    cursor: 'pointer',
    margin: '15px'
  },
  filledByInfo: { display: 'flex', alignItems: 'center', gap: '10px', color: '#00ff88' },
  assignedBadge: {
    background: 'rgba(0, 255, 136, 0.2)',
    border: '1px solid #00ff88',
    color: '#00ff88',
    padding: '4px 10px',
    fontSize: '10px',
    letterSpacing: '1px'
  }
};

export default ContractDetails;
