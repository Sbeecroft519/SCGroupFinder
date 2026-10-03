import { useAuth, API } from '../App';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FEATURES } from '../components/organizations/orgConstants.js';
import { MyOrgPanel } from '../components/organizations/MyOrgPanel.jsx';
import { Building2, Lock, MessageSquare } from 'lucide-react';
import { RegisterOrgModal } from '../components/organizations/RegisterOrgModal.jsx';
import { OrgCard } from '../components/organizations/OrgCard.jsx';
export default function Organizations() {
  const {
    user
  } = useAuth();
  const [comingSoon, setComingSoon] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [myOrg, setMyOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const fetchAll = async () => {
    try {
      const [listRes, mineRes] = await Promise.all([axios.get(`${API}/orgs`), user ? axios.get(`${API}/user/my-org`).catch(() => ({
        data: {
          org: null
        }
      })) : Promise.resolve({
        data: {
          org: null
        }
      })]);
      setComingSoon(!!listRes.data?.coming_soon);
      setOrgs(listRes.data?.orgs || []);
      const mine = mineRes.data?.org || null;
      setMyOrg(mine);
      // Auto-accept a pending owner invitation the moment the invited user opens /orgs.
      if (mine && mine.owner_pending && mine.owner_id === user?.id) {
        try {
          await axios.post(`${API}/user/org-invites/${mine.id}/accept`);
          window.dispatchEvent(new CustomEvent('org-invite-accepted', {
            detail: {
              org_id: mine.id
            }
          }));
        } catch (_e) {/* ignore */}
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll(); /* eslint-disable-next-line */
  }, [user?.id]);
  useEffect(() => {
    const refresh = () => {
      fetchAll();
    };
    window.addEventListener('org-status-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('org-status-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  if (comingSoon) {
    // Original Coming Soon view, preserved verbatim per spec
    return <div className="navcom-page" data-testid="orgs-page">
        <div className="page-header">
          <div className="page-label">// ORGANIZATIONS</div>
          <h1 data-testid="organizations-page-title" className="page-title">Organizations</h1>
          <p data-testid="organizations-page-subtitle" className="page-subtitle">Org dispatch tools for rescue teams, escorts, haulers, and industrial crews.</p>
        </div>
        <div className="nc-card" style={{
        borderLeft: '3px solid var(--nc-cyan)',
        padding: '32px 28px'
      }}>
          <div className="scgf-wrap" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16
        }}>
            <span style={{
            fontFamily: 'var(--nc-font-mono)',
            fontSize: 11,
            letterSpacing: 2,
            color: '#c977ff',
            padding: '3px 10px',
            border: '1px solid #c977ff'
          }} data-testid="orgs-status-pill">COMING SOON</span>
          </div>
          <h2 data-testid="organizations-h2" style={{
          fontFamily: 'var(--nc-font-display)',
          fontSize: 28,
          color: 'var(--nc-text-primary)',
          margin: '0 0 12px'
        }}>Organizations Coming Soon</h2>
          <p data-testid="organizations-p" style={{
          color: 'var(--nc-text-secondary)',
          fontSize: 15,
          lineHeight: 1.7,
          maxWidth: 760
        }}>
            Soon, organizations will be able to create public org profiles, connect Discord alert channels,
            and receive filtered contract notifications when relevant jobs are posted.
          </p>
          <ul style={{
          listStyle: 'none',
          padding: 0,
          marginTop: 20,
          display: 'grid',
          gap: 8
        }}>
            {FEATURES.map(f => <li key={f} style={{
            color: 'var(--nc-text-secondary)',
            fontSize: 14
          }}>
                <span data-testid={`organizations-span-${f}`} style={{
              color: '#00ff88',
              marginRight: 8
            }}>›</span>{f}
              </li>)}
          </ul>
        </div>
      </div>;
  }
  return <div className="navcom-page" data-testid="orgs-page">
      <div className="page-header">
        <div className="page-label">// ORGANIZATIONS</div>
        <h1 data-testid="organizations-page-title-2" className="page-title">Organizations</h1>
        <p data-testid="organizations-page-subtitle-2" className="page-subtitle">Rescue teams, escorts, haulers, and industrial crews.</p>
      </div>

      {myOrg && <MyOrgPanel org={myOrg} currentUser={user} onChanged={fetchAll} />}

      {/* Self-serve org registration CTA — visible when user has no org */}
      {!myOrg && user && <div data-testid="register-org-cta" style={{
      background: 'rgba(0,240,255,0.06)',
      border: '1px solid var(--nc-cyan)',
      borderLeft: '3px solid var(--nc-cyan)',
      padding: 18,
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap'
    }}>
          <Building2 size={22} style={{
        color: 'var(--nc-cyan)'
      }} />
          <div style={{
        flex: '1 1 220px',
        minWidth: 0
      }}>
            <div style={{
          fontFamily: 'var(--nc-font-mono)',
          fontSize: 11,
          letterSpacing: 2,
          color: 'var(--nc-cyan)',
          marginBottom: 4
        }}>// LEAD AN ORGANIZATION?</div>
            <div style={{
          color: 'var(--nc-text-primary)',
          fontSize: 14,
          fontFamily: 'var(--nc-font-display)'
        }}>
              Register your org for a public profile and Discord dispatch.
            </div>
            <div style={{
          color: 'var(--nc-text-muted)',
          fontSize: 12,
          marginTop: 4
        }}>
              {user.is_verified ? 'Submit an application — an admin reviews before it goes live.' : 'Verify your RSI handle first to unlock org registration.'}
            </div>
          </div>
          <button className="nc-btn nc-btn-primary" onClick={() => setShowRegister(true)} disabled={!user.is_verified} data-testid="register-org-btn">
            Register Your Org
          </button>
        </div>}

      <RegisterOrgModal open={showRegister} onClose={() => setShowRegister(false)} onCreated={fetchAll} />

      {/* Public org list */}
      <div className="scgf-wrap" style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 12,
      margin: '24px 0 12px'
    }}>
        <h2 data-testid="organizations-h2-2" style={{
        fontFamily: 'var(--nc-font-display)',
        fontSize: 18,
        color: 'var(--nc-text-primary)',
        margin: 0
      }}>APPROVED ORGS</h2>
        <span data-testid="organizations-span-2" style={{
        fontSize: 12,
        color: 'var(--nc-text-muted)',
        fontFamily: 'var(--nc-font-mono)'
      }}>
          {loading ? 'Loading…' : `${orgs.length} active`}
        </span>
      </div>

      {orgs.length === 0 ? <div data-testid="empty-orgs" style={{
      padding: 18,
      border: '1px dashed var(--nc-border)',
      color: 'var(--nc-text-muted)',
      fontFamily: 'var(--nc-font-mono)',
      fontSize: 13
    }}>
          No approved organizations yet.
        </div> : <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
      gap: 14
    }}>
          {orgs.map(o => <OrgCard key={o.id} org={o} />)}
        </div>}

      {/* Rescue-safe + Early access notes (preserved from Coming Soon) */}
      <div style={{
      marginTop: 28,
      display: 'grid',
      gap: 12
    }}>
        <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: 14,
        background: 'rgba(255, 0, 68, 0.05)',
        border: '1px solid rgba(255,0,68,0.25)'
      }}>
          <Lock size={16} style={{
          color: '#ff4466',
          marginTop: 2
        }} />
          <div style={{
          color: 'var(--nc-text-secondary)',
          fontSize: 13,
          lineHeight: 1.6
        }}>
            <strong data-testid="organizations-strong" style={{
            color: '#ff4466',
            display: 'block',
            marginBottom: 4,
            fontFamily: 'var(--nc-font-mono)',
            fontSize: 11,
            letterSpacing: 1
          }}>RESCUE-SAFE DISPATCH</strong>
            Discord alerts for medical/rescue jobs include only public risk fields and bleed-out timing.
            Exact patient location, body location, and private notes are <strong data-testid="organizations-strong-2">never</strong> sent to Discord
            — they're disclosed only to the accepted rescuer.
          </div>
        </div>
        <div style={{
        padding: 14,
        background: 'rgba(0,240,255,0.05)',
        border: '1px solid rgba(0,240,255,0.25)'
      }}>
          <div className="scgf-wrap" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4
        }}>
            <MessageSquare size={14} style={{
            color: 'var(--nc-cyan)'
          }} />
            <strong data-testid="organizations-strong-3" style={{
            fontFamily: 'var(--nc-font-mono)',
            fontSize: 11,
            letterSpacing: 1,
            color: 'var(--nc-cyan)'
          }}>EARLY ACCESS</strong>
          </div>
          <p data-testid="organizations-p-2" style={{
          color: 'var(--nc-text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: 0
        }}>
            Org tools are free during early access. Advanced org dispatch tools may be added later.
          </p>
        </div>
      </div>
    </div>;
}
