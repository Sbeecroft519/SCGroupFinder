import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Users, ArrowLeft, Star } from 'lucide-react';
import { API } from '../App';

export default function OrgProfile() {
  const { orgId } = useParams();
  const [org, setOrg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/orgs/${orgId}`)
      .then(res => setOrg(res.data))
      .catch(() => setError('Org not found'));
  }, [orgId]);

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
              <span style={{ color: 'var(--nc-text-primary)', fontSize: 14 }}>{m.rsi_handle}</span>
              <span style={{ color: 'var(--nc-gold)', fontSize: 12, fontFamily: 'var(--nc-font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={12} fill="#FFD700" /> {(m.reputation || 5).toFixed(1)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
