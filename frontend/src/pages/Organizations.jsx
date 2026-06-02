import { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Stethoscope, Shield, Truck, Pickaxe, Users, MessageSquare, Lock, Check, X, Send, AlertCircle } from 'lucide-react';
import { API, useAuth } from '../App';

const SPECIALTIES = [
  { icon: Stethoscope, label: 'Medical / Rescue', color: '#ff4466' },
  { icon: Shield, label: 'Security', color: '#00f0ff' },
  { icon: Shield, label: 'Escort', color: '#00f0ff' },
  { icon: Truck, label: 'Cargo', color: '#00ff88' },
  { icon: Pickaxe, label: 'Mining', color: '#ffd700' },
  { icon: Pickaxe, label: 'Salvage', color: '#ffd700' },
  { icon: Users, label: 'New Player Help', color: '#c977ff' },
  { icon: Building2, label: 'Events', color: '#ff9900' },
  { icon: Building2, label: 'Roleplay', color: '#ff9900' },
  { icon: Shield, label: 'Combat', color: '#ff6600' },
  { icon: Users, label: 'Training', color: '#c977ff' },
  { icon: Building2, label: 'Exploration', color: '#00f0ff' },
];
const SPECIALTY_LABELS = SPECIALTIES.map(s => s.label);
const REGIONS = ['USA', 'Europe', 'Australia', 'Asia', 'Global'];
const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];
const TIMINGS = ['now', 'future'];
const ALERT_CATEGORIES = ['MEDICAL', 'COMBAT', 'CARGO', 'MINING', 'SALVAGE', 'ESCORT', 'LFG', 'OTHER'];

const FEATURES = [
  'Public organization profiles',
  'Org specialties: Medical, Rescue, Security, Cargo, Mining, Salvage',
  'Discord alerts for matching contracts',
  'Rescue-safe dispatch alerts that protect private patient location data',
  'Region, system, timing, and category filters',
  'Future org reputation and dispatch tools',
];

function MultiToggle({ options, selected, onChange, testidPrefix }) {
  const set = new Set(selected || []);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const active = set.has(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => {
              const next = new Set(set);
              if (active) next.delete(o); else next.add(o);
              onChange([...next]);
            }}
            data-testid={`${testidPrefix}-${o}`}
            style={{
              padding: '5px 10px', fontSize: 11, letterSpacing: 1,
              fontFamily: 'var(--nc-font-mono)',
              background: active ? 'var(--nc-cyan)' : 'transparent',
              color: active ? 'var(--nc-bg-primary)' : 'var(--nc-text-secondary)',
              border: `1px solid ${active ? 'var(--nc-cyan)' : 'var(--nc-border)'}`,
              cursor: 'pointer',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function OrgCard({ org }) {
  return (
    <div data-testid={`org-card-${org.tag}`} style={{
      background: 'rgba(2, 11, 20, 0.85)',
      border: '1px solid var(--nc-border)',
      borderLeft: '3px solid var(--nc-cyan)',
      padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 18, color: 'var(--nc-text-primary)' }}>{org.name}</span>
        <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, color: 'var(--nc-cyan)', letterSpacing: 1 }}>[{org.tag}]</span>
        {org.discord_connected && (
          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', letterSpacing: 1,
            background: 'rgba(0,255,136,0.10)', color: '#00ff88', border: '1px solid #00ff88',
            fontFamily: 'var(--nc-font-mono)' }}>● DISCORD READY</span>
        )}
      </div>
      {org.description && (
        <p style={{ color: 'var(--nc-text-secondary)', fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>{org.description}</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(org.specialties || []).map(s => (
          <span key={s} style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(0,240,255,0.06)',
            border: '1px solid rgba(0,240,255,0.25)', color: 'var(--nc-cyan)',
            fontFamily: 'var(--nc-font-mono)' }}>{s}</span>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12, fontSize: 11,
        color: 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)' }}>
        {(org.home_regions || []).length > 0 && <span>Regions: {org.home_regions.join(', ')}</span>}
        {(org.service_systems || []).length > 0 && <span>Systems: {org.service_systems.join(', ')}</span>}
        <span>{(org.members || []).length} member{(org.members || []).length === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}

function MyOrgPanel({ org, currentUser, onChanged }) {
  const [form, setForm] = useState(() => ({
    description: org.description || '',
    rsi_org_url: org.rsi_org_url || '',
    discord_invite_url: org.discord_invite_url || '',
    specialties: org.specialties || [],
    home_regions: org.home_regions || [],
    service_systems: org.service_systems || [],
    discord_alerts_enabled: !!org.discord_alerts_enabled,
    alert_categories: org.alert_categories || [],
    alert_regions: org.alert_regions || [],
    alert_systems: org.alert_systems || [],
    alert_timing_types: org.alert_timing_types || [],
    alert_rescue_only: !!org.alert_rescue_only,
    alert_min_payout: org.alert_min_payout || '',
  }));
  const [webhookInput, setWebhookInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        rsi_org_url: form.rsi_org_url || null,
        discord_invite_url: form.discord_invite_url || null,
        specialties: form.specialties,
        home_regions: form.home_regions,
        service_systems: form.service_systems,
        discord_alerts_enabled: form.discord_alerts_enabled,
        alert_categories: form.alert_categories,
        alert_regions: form.alert_regions,
        alert_systems: form.alert_systems,
        alert_timing_types: form.alert_timing_types,
        alert_rescue_only: form.alert_rescue_only,
        alert_min_payout: form.alert_min_payout === '' ? null : parseInt(form.alert_min_payout),
      };
      await axios.put(`${API}/orgs/${org.id}`, payload);
      setFeedback({ type: 'ok', text: 'Org saved.' });
      onChanged?.();
    } catch (e) {
      setFeedback({ type: 'err', text: e.response?.data?.detail || 'Save failed' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const connectWebhook = async () => {
    if (!webhookInput.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/orgs/${org.id}/discord-webhook`, { discord_webhook_url: webhookInput.trim() });
      setWebhookInput('');
      setFeedback({ type: 'ok', text: 'Webhook saved.' });
      onChanged?.();
    } catch (e) {
      setFeedback({ type: 'err', text: e.response?.data?.detail || 'Webhook save failed' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await axios.post(`${API}/orgs/${org.id}/test-discord`);
      if (r.data?.success) setFeedback({ type: 'ok', text: 'Test alert delivered to Discord.' });
      else setFeedback({ type: 'err', text: `Webhook returned ${r.data?.status || 'error'}` });
    } catch (e) {
      setFeedback({ type: 'err', text: e.response?.data?.detail || 'Test failed' });
    } finally {
      setTesting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const approved = org.approval_status === 'approved';
  const pending = org.approval_status === 'pending';

  return (
    <div data-testid="my-org-panel" style={{ background: 'rgba(2, 11, 20, 0.92)', border: '1px solid var(--nc-cyan)', padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 2, color: 'var(--nc-cyan)' }}>// YOUR ORGANIZATION</span>
        <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 22, color: 'var(--nc-text-primary)' }}>{org.name}</span>
        <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 12, color: 'var(--nc-cyan)' }}>[{org.tag}]</span>
        <span data-testid="org-approval-pill" style={{
          marginLeft: 'auto', fontSize: 10, padding: '3px 8px', letterSpacing: 1, fontFamily: 'var(--nc-font-mono)',
          color: approved ? '#00ff88' : (pending ? '#ffd700' : '#ff4466'),
          border: `1px solid ${approved ? '#00ff88' : (pending ? '#ffd700' : '#ff4466')}`,
        }}>
          {approved ? '● APPROVED' : pending ? '⏳ PENDING REVIEW' : '✕ REJECTED'}
        </span>
      </div>

      {pending && (
        <div data-testid="pending-notice" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10,
          background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.3)', marginBottom: 16 }}>
          <AlertCircle size={14} style={{ color: '#ffd700', marginTop: 2 }} />
          <span style={{ color: 'var(--nc-text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
            Your org is awaiting admin approval. You can still fill in your profile and connect a webhook —
            dispatch will start firing once approved.
          </span>
        </div>
      )}

      {/* Profile section */}
      <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        <label className="nc-label">DESCRIPTION</label>
        <textarea
          className="nc-input"
          rows={3}
          value={form.description}
          onChange={e => update({ description: e.target.value })}
          placeholder="What does your org do? Who's it for?"
          data-testid="org-description-input"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="nc-label">RSI ORG URL</label>
            <input className="nc-input" value={form.rsi_org_url} onChange={e => update({ rsi_org_url: e.target.value })} placeholder="https://robertsspaceindustries.com/orgs/..." data-testid="org-rsi-url" />
          </div>
          <div>
            <label className="nc-label">DISCORD INVITE URL</label>
            <input className="nc-input" value={form.discord_invite_url} onChange={e => update({ discord_invite_url: e.target.value })} placeholder="https://discord.gg/..." data-testid="org-discord-invite" />
          </div>
        </div>

        <label className="nc-label" style={{ marginTop: 8 }}>SPECIALTIES</label>
        <MultiToggle options={SPECIALTY_LABELS} selected={form.specialties} onChange={v => update({ specialties: v })} testidPrefix="org-specialty" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          <div>
            <label className="nc-label">HOME REGIONS</label>
            <MultiToggle options={REGIONS} selected={form.home_regions} onChange={v => update({ home_regions: v })} testidPrefix="org-region" />
          </div>
          <div>
            <label className="nc-label">SERVICE SYSTEMS</label>
            <MultiToggle options={SYSTEMS} selected={form.service_systems} onChange={v => update({ service_systems: v })} testidPrefix="org-system" />
          </div>
        </div>
      </div>

      {/* Discord webhook + alert filters */}
      <div style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.2)', padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MessageSquare size={14} style={{ color: 'var(--nc-cyan)' }} />
          <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 2, color: 'var(--nc-cyan)' }}>DISCORD DISPATCH</span>
          <span data-testid="webhook-status" style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--nc-font-mono)',
            color: org.discord_connected ? '#00ff88' : 'var(--nc-text-muted)' }}>
            {org.discord_connected ? '● Webhook connected' : '○ No webhook configured'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            className="nc-input"
            placeholder="https://discord.com/api/webhooks/..."
            value={webhookInput}
            onChange={e => setWebhookInput(e.target.value)}
            style={{ flex: '1 1 320px' }}
            data-testid="webhook-input"
          />
          <button
            type="button"
            className="nc-btn nc-btn-primary"
            onClick={connectWebhook}
            disabled={saving || !webhookInput.trim()}
            data-testid="webhook-save-btn"
          >
            <Check size={14} /> Save Webhook
          </button>
          <button
            type="button"
            className="nc-btn nc-btn-secondary"
            onClick={sendTest}
            disabled={testing || !org.discord_connected}
            data-testid="webhook-test-btn"
          >
            <Send size={14} /> {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--nc-text-secondary)', cursor: 'pointer', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={form.discord_alerts_enabled}
            onChange={e => update({ discord_alerts_enabled: e.target.checked })}
            data-testid="alerts-enabled-toggle"
          />
          <span><strong style={{ color: 'var(--nc-cyan)' }}>Enable dispatch</strong> — fire Discord alerts for new contracts matching the filters below.</span>
        </label>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="nc-label">ALERT CATEGORIES (empty = all)</label>
            <MultiToggle options={ALERT_CATEGORIES} selected={form.alert_categories} onChange={v => update({ alert_categories: v })} testidPrefix="alert-cat" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="nc-label">REGIONS</label>
              <MultiToggle options={REGIONS} selected={form.alert_regions} onChange={v => update({ alert_regions: v })} testidPrefix="alert-region" />
            </div>
            <div>
              <label className="nc-label">SYSTEMS</label>
              <MultiToggle options={SYSTEMS} selected={form.alert_systems} onChange={v => update({ alert_systems: v })} testidPrefix="alert-system" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="nc-label">TIMING</label>
              <MultiToggle options={TIMINGS} selected={form.alert_timing_types} onChange={v => update({ alert_timing_types: v })} testidPrefix="alert-timing" />
            </div>
            <div>
              <label className="nc-label">MIN PAYOUT (aUEC)</label>
              <input
                className="nc-input"
                type="number"
                min={0}
                placeholder="0"
                value={form.alert_min_payout}
                onChange={e => update({ alert_min_payout: e.target.value })}
                data-testid="alert-min-payout"
              />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--nc-text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.alert_rescue_only}
              onChange={e => update({ alert_rescue_only: e.target.checked })}
              data-testid="alert-rescue-only"
            />
            <span><strong style={{ color: '#ff4466' }}>Rescue-only mode</strong> — only fire alerts for Medical / Rescue contracts.</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: 10, marginTop: 14,
          background: 'rgba(255,0,68,0.04)', border: '1px solid rgba(255,0,68,0.2)' }}>
          <Lock size={14} style={{ color: '#ff4466', marginTop: 2 }} />
          <span style={{ color: 'var(--nc-text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
            Rescue-safe: exact patient location, body location, and private notes are <strong>never</strong> sent to Discord —
            only public risk fields and bleed-out timing. Webhook URL is never exposed publicly.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="nc-btn nc-btn-primary"
          onClick={saveProfile}
          disabled={saving}
          data-testid="save-org-btn"
        >
          <Check size={14} /> {saving ? 'Saving...' : 'Save Org Profile'}
        </button>
        {feedback && (
          <span data-testid="org-feedback" style={{
            fontSize: 12, fontFamily: 'var(--nc-font-mono)',
            color: feedback.type === 'ok' ? '#00ff88' : '#ff4466',
          }}>
            {feedback.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Organizations() {
  const { user } = useAuth();
  const [comingSoon, setComingSoon] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [myOrg, setMyOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [listRes, mineRes] = await Promise.all([
        axios.get(`${API}/orgs`),
        user ? axios.get(`${API}/user/my-org`).catch(() => ({ data: { org: null } })) : Promise.resolve({ data: { org: null } }),
      ]);
      setComingSoon(!!listRes.data?.coming_soon);
      setOrgs(listRes.data?.orgs || []);
      setMyOrg(mineRes.data?.org || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [user?.id]);

  if (comingSoon) {
    // Original Coming Soon view, preserved verbatim per spec
    return (
      <div className="navcom-page" data-testid="orgs-page">
        <div className="page-header">
          <div className="page-label">// ORGANIZATIONS</div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Org dispatch tools for rescue teams, escorts, haulers, and industrial crews.</p>
        </div>
        <div className="nc-card" style={{ borderLeft: '3px solid var(--nc-cyan)', padding: '32px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 2, color: '#c977ff', padding: '3px 10px', border: '1px solid #c977ff' }} data-testid="orgs-status-pill">COMING SOON</span>
          </div>
          <h2 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 28, color: 'var(--nc-text-primary)', margin: '0 0 12px' }}>Organizations Coming Soon</h2>
          <p style={{ color: 'var(--nc-text-secondary)', fontSize: 15, lineHeight: 1.7, maxWidth: 760 }}>
            Soon, organizations will be able to create public org profiles, connect Discord alert channels,
            and receive filtered contract notifications when relevant jobs are posted.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 20, display: 'grid', gap: 8 }}>
            {FEATURES.map(f => (
              <li key={f} style={{ color: 'var(--nc-text-secondary)', fontSize: 14 }}>
                <span style={{ color: '#00ff88', marginRight: 8 }}>›</span>{f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="navcom-page" data-testid="orgs-page">
      <div className="page-header">
        <div className="page-label">// ORGANIZATIONS</div>
        <h1 className="page-title">Organizations</h1>
        <p className="page-subtitle">Org dispatch tools for rescue teams, escorts, haulers, and industrial crews. Early-access — admin invitation only.</p>
      </div>

      {myOrg && (
        <MyOrgPanel org={myOrg} currentUser={user} onChanged={fetchAll} />
      )}

      {/* Public org list */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '24px 0 12px' }}>
        <h2 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 18, color: 'var(--nc-text-primary)', margin: 0 }}>APPROVED ORGS</h2>
        <span style={{ fontSize: 12, color: 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)' }}>
          {loading ? 'Loading…' : `${orgs.length} active`}
        </span>
      </div>

      {orgs.length === 0 ? (
        <div data-testid="empty-orgs" style={{ padding: 18, border: '1px dashed var(--nc-border)',
          color: 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)', fontSize: 13 }}>
          No approved organizations yet. Talk to an admin to get your org invited.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {orgs.map(o => <OrgCard key={o.id} org={o} />)}
        </div>
      )}

      {/* Rescue-safe + Early access notes (preserved from Coming Soon) */}
      <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, background: 'rgba(255, 0, 68, 0.05)', border: '1px solid rgba(255,0,68,0.25)' }}>
          <Lock size={16} style={{ color: '#ff4466', marginTop: 2 }} />
          <div style={{ color: 'var(--nc-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: '#ff4466', display: 'block', marginBottom: 4, fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 1 }}>RESCUE-SAFE DISPATCH</strong>
            Discord alerts for medical/rescue jobs include only public risk fields and bleed-out timing.
            Exact patient location, body location, and private notes are <strong>never</strong> sent to Discord
            — they're disclosed only to the accepted rescuer.
          </div>
        </div>
        <div style={{ padding: 14, background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MessageSquare size={14} style={{ color: 'var(--nc-cyan)' }} />
            <strong style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 1, color: 'var(--nc-cyan)' }}>EARLY ACCESS</strong>
          </div>
          <p style={{ color: 'var(--nc-text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Org tools are free during early access. Advanced org dispatch tools may be added later.
          </p>
        </div>
      </div>
    </div>
  );
}
