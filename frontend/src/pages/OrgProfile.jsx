import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Users, ArrowLeft, Star, BadgeCheck, X, Check } from 'lucide-react';
import { useAuth, API } from '../App';

export default function OrgProfile() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [error, setError] = useState('');
  const [roster, setRoster] = useState(null);

  const load = useCallback(() => {
    axios.get(`${API}/orgs/${orgId}`)
      .then(res => setOrg(res.data))
      .catch(() => setError('Org not found'));
    axios.get(`${API}/orgs/${orgId}/affiliations`)
      .then(res => setRoster(res.data.members || []))
      .catch(() => setRoster(null));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (memberId, action) => {
    try {
      await axios.post(`${API}/orgs/${orgId}/affiliations/${memberId}`, { action });
      load();
    } catch (e) {
      // keep the current view; the leader can retry
    }
  };

  const isLeader = Boolean(roster) && Boolean(user);
  const [inviteHandle, setInviteHandle] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  const invite = async () => {
    if (!inviteHandle.trim()) return;
    try {
      const res = await axios.post(`${API}/orgs/${orgId}/invite-member`, { handle: inviteHandle.trim() });
      setInviteMsg(`${res.data.handle} added as a confirmed member`);
      setInviteHandle('');
      load();
    } catch (e) {
      setInviteMsg(e.response?.data?.detail || 'Could not add that player');
    }
    setTimeout(() => setInviteMsg(''), 4000);
  };

  if (error) {
    return (
      <div className="nc-page" style={{ padding: 24 }} data-testid="org-profile-error">
        <Link to="/orgs" className="nc-btn nc-btn-secondary"><ArrowLeft size={14} /> BACK TO ORGS</Link>
        <p style={{ color: 'var(--nc-text-muted)', marginTop: 20 }}>{error}</p>
      </div>
    );
  }

  if (!org) {
    return <div className="nc-page" style={{ padding: 24, color: 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)', fontSize: 12 }}>LOADING…</div>;
  }

  const members = org.displayed_members || [];

  return (
    <div className="nc-page" data-testid="org-profile-page" style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <Link to="/orgs" className="nc-btn nc-btn-secondary" style={{ marginBottom: 20, display: 'inline-flex' }} data-testid="org-profile-back">
        <ArrowLeft size={14} /> BACK TO ORGS
      </Link>

      <div style={{ border: '1px solid var(--nc-border)', borderLeft: '3px solid var(--nc-cyan)', background: 'rgba(2, 11, 20, 0.85)', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 26, margin: 0, color: 'var(--nc-text-primary)' }} data-testid="org-profile-name">
            {org.name}
          </h1>
          <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 12, color: 'var(--nc-cyan)', letterSpacing: 1 }}>[{org.tag}]</span>
        </div>
        {org.description && (
          <p style={{ color: 'var(--nc-text-secondary)', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{org.description}</p>
        )}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16, fontSize: 11, fontFamily: 'var(--nc-font-mono)', color: 'var(--nc-text-muted)' }}>
          <span data-testid="org-profile-member-count"><Users size={12} style={{ verticalAlign: -2 }} /> {members.length} displaying this org</span>
          {(org.specialties || []).length > 0 && <span>Specialties: {org.specialties.join(', ')}</span>}
          {(org.home_regions || []).length > 0 && <span>Regions: {org.home_regions.join(', ')}</span>}
          {(org.service_systems || []).length > 0 && <span>Systems: {org.service_systems.join(', ')}</span>}
        </div>
      </div>

      {isLeader && (
        <div style={{ marginTop: 28, border: '1px solid var(--nc-border)', borderLeft: '3px solid var(--nc-gold, #FFD700)', background: 'rgba(2,11,20,0.85)', padding: 18 }} data-testid="org-affiliation-review-panel">
          <div style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--nc-text-muted)', marginBottom: 12 }}>
            AFFILIATION REQUESTS — LEADER ONLY
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <input
              className="nc-input"
              placeholder="RSI handle"
              value={inviteHandle}
              onChange={e => setInviteHandle(e.target.value)}
              style={{ flex: '1 1 180px', minWidth: 0 }}
              data-testid="org-invite-handle"
            />
            <button className="nc-btn nc-btn-primary" onClick={invite} data-testid="org-invite-submit">
              ADD CONFIRMED MEMBER
            </button>
          </div>
          {inviteMsg && (
            <div style={{ color: 'var(--nc-cyan)', fontSize: 12, marginBottom: 12 }} data-testid="org-invite-msg">{inviteMsg}</div>
          )}
          {roster.length === 0 ? (
            <div style={{ color: 'var(--nc-text-muted)', fontSize: 13 }} data-testid="org-affiliation-review-empty">
              Nobody is displaying this org yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roster.map(m => (
                <div key={m.id} data-testid={`affiliation-row-${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--nc-border)', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--nc-text-primary)', fontSize: 14 }}>{m.rsi_handle}</span>
                  <span
                    data-testid={`affiliation-status-${m.id}`}
                    style={{
                      fontFamily: 'var(--nc-font-mono)', fontSize: 10, letterSpacing: 1, padding: '1px 6px',
                      color: m.affiliation_status === 'verified' ? '#00ff88' : m.affiliation_status === 'rejected' ? '#ff4d4d' : 'var(--nc-text-muted)',
                      border: `1px solid ${m.affiliation_status === 'verified' ? 'rgba(0,255,136,0.4)' : m.affiliation_status === 'rejected' ? 'rgba(255,77,77,0.4)' : 'var(--nc-border)'}`,
                    }}
                  >
                    {m.affiliation_status.toUpperCase()}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {m.affiliation_status !== 'verified' && (
                      <button className="nc-btn nc-btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => decide(m.id, 'verify')} data-testid={`affiliation-verify-${m.id}`}>
                        <Check size={12} /> CONFIRM
                      </button>
                    )}
                    {m.affiliation_status !== 'rejected' && (
                      <button className="nc-btn nc-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => decide(m.id, 'reject')} data-testid={`affiliation-reject-${m.id}`}>
                        <X size={12} /> REJECT
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 'var(--nc-h2, 1.125rem)', fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', margin: '28px 0 12px' }}>
        Displayed members
      </h2>
      {members.length === 0 ? (
        <div style={{ border: '1px dashed var(--nc-border)', padding: 28, color: 'var(--nc-text-muted)', textAlign: 'center' }} data-testid="org-profile-no-members">
          No players are displaying this org yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {members.map(m => (
            <Link
              key={m.id}
              to={`/profile/${m.id}`}
              data-testid={`org-member-${m.id}`}
              style={{
                border: '1px solid var(--nc-border)',
                background: 'rgba(0,240,255,0.03)',
                padding: 14,
                textDecoration: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                transition: 'border-color .2s',
              }}
            >
              <span style={{ color: 'var(--nc-text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                {m.rsi_handle}
                {m.affiliation_status === 'verified' && <BadgeCheck size={13} color="#00ff88" />}
              </span>
              <span style={{ color: 'var(--nc-gold)', fontSize: 12, fontFamily: 'var(--nc-font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={12} fill="#FFD700" /> {(m.reputation ?? 0).toFixed(1)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
