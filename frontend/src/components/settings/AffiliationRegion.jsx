import { useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, Globe, Check } from 'lucide-react';
import { useAuth, API } from '../../App';

const REGIONS = ['USA', 'Europe', 'Australia', 'Asia', 'Global'];

/** Self-service org affiliation + account-level region memory. */
export const AffiliationRegion = ({ compact = false }) => {
  const { user, updateUser, userShard, setShard } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState(user?.org_affiliation?.org_id || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    axios.get(`${API}/orgs/approved-options`)
      .then(res => setOrgs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrgs([]));
  }, []);

  useEffect(() => {
    setOrgId(user?.org_affiliation?.org_id || '');
  }, [user?.org_affiliation?.org_id]);

  const saveAffiliation = async (nextId) => {
    setOrgId(nextId);
    setSaving(true);
    try {
      const res = await axios.put(`${API}/user/org-affiliation`, { org_id: nextId || null });
      updateUser({ org_affiliation: res.data.affiliation });
      setSaved(nextId ? 'Affiliation updated' : 'Affiliation cleared');
      setTimeout(() => setSaved(''), 2500);
    } catch (e) {
      setSaved(e.response?.data?.detail || 'Could not save affiliation');
      setTimeout(() => setSaved(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="affiliation-region-panel">
      <div className="form-group">
        <label className="nc-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={14} /> DISPLAYED ORG
        </label>
        <select
          className="nc-input"
          value={orgId}
          disabled={saving}
          onChange={e => saveAffiliation(e.target.value)}
          data-testid="affiliation-org-select"
        >
          <option value="">No org displayed</option>
          {orgs.map(o => (
            <option key={o.id} value={o.id}>{o.name} [{o.tag}]</option>
          ))}
        </select>
        <p style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
          Only approved orgs can be displayed. Your tag shows next to your handle on job cards,
          crew manifests and applicant lists. Change or clear it any time — no approval needed.
        </p>
        {orgs.length === 0 && (
          <p style={{ color: 'var(--nc-text-muted)', fontSize: 12 }} data-testid="affiliation-no-orgs">
            No approved orgs yet.
          </p>
        )}
        {user?.org_affiliation && (
          <p
            data-testid="affiliation-status"
            style={{
              fontFamily: 'var(--nc-font-mono)', fontSize: 11, marginTop: 8,
              color: user.org_affiliation.verified ? '#00ff88' : 'var(--nc-text-muted)',
            }}
          >
            {user.org_affiliation.verified
              ? 'CONFIRMED by the org leader'
              : 'AWAITING CONFIRMATION from the org leader'}
          </p>
        )}
      </div>

      {!compact && (
        <div className="form-group" style={{ marginTop: 24 }}>
          <label className="nc-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={14} /> SERVER REGION
          </label>
          <select
            className="nc-input"
            value={userShard || 'Global'}
            onChange={e => setShard(e.target.value === 'Global' ? '' : e.target.value)}
            data-testid="settings-region-select"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <p style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
            Remembered against your account — you won't be asked again on refresh.
          </p>
        </div>
      )}

      {saved && (
        <div style={{ marginTop: 14, color: 'var(--nc-cyan)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} data-testid="affiliation-saved-msg">
          <Check size={14} /> {saved}
        </div>
      )}
    </div>
  );
};

export default AffiliationRegion;
