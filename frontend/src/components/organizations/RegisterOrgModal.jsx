import { useState } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { Building2, X } from 'lucide-react';
import { MultiToggle } from './MultiToggle.jsx';
import { SPECIALTY_LABELS, REGIONS, SYSTEMS } from './orgConstants.js';
export function RegisterOrgModal({
  open,
  onClose,
  onCreated
}) {
  const [form, setForm] = useState({
    name: '',
    tag: '',
    description: '',
    rsi_org_url: '',
    discord_invite_url: '',
    specialties: [],
    home_regions: [],
    service_systems: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  if (!open) return null;
  const update = patch => setForm(prev => ({
    ...prev,
    ...patch
  }));
  const submit = async () => {
    setErr(null);
    const name = form.name.trim();
    const tag = form.tag.trim().toUpperCase();
    if (name.length < 3 || name.length > 64) {
      setErr('Name must be 3–64 characters');
      return;
    }
    if (tag.length < 2 || tag.length > 8) {
      setErr('Tag must be 2–8 characters');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name,
        tag,
        description: form.description,
        rsi_org_url: form.rsi_org_url || null,
        discord_invite_url: form.discord_invite_url || null,
        specialties: form.specialties,
        home_regions: form.home_regions,
        service_systems: form.service_systems
      };
      await axios.post(`${API}/orgs/register`, payload);
      setOk(true);
      setTimeout(() => {
        onCreated?.();
        onClose?.();
      }, 1400);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="scgf-wrap" onClick={onClose} data-testid="register-org-overlay" style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '5vh',
    overflow: 'auto'
  }}>
      <div onClick={e => e.stopPropagation()} data-testid="register-org-modal" style={{
      background: 'rgba(2,11,20,0.98)',
      border: '1px solid var(--nc-cyan)',
      padding: 24,
      width: 'min(720px, 92vw)',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
        <div className="scgf-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14
      }}>
          <Building2 size={16} style={{
          color: 'var(--nc-cyan)'
        }} />
          <span data-testid="register-org-modal-span" style={{
          fontFamily: 'var(--nc-font-mono)',
          fontSize: 11,
          letterSpacing: 2,
          color: 'var(--nc-cyan)'
        }}>// REGISTER YOUR ORG</span>
          <button onClick={onClose} data-testid="register-org-close" style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: 'none',
          color: 'var(--nc-text-muted)',
          cursor: 'pointer'
        }}>
            <X size={18} />
          </button>
        </div>
        <p data-testid="register-org-modal-p" style={{
        color: 'var(--nc-text-secondary)',
        fontSize: 13,
        lineHeight: 1.6,
        marginTop: 0
      }}>
          Fill in your org's public profile. Your submission goes to the admin queue for approval —
          you'll be able to keep editing while it's pending.
        </p>

        {ok ? <div data-testid="register-org-success" style={{
        padding: 16,
        border: '1px solid #00ff88',
        color: '#00ff88',
        textAlign: 'center',
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 13,
        letterSpacing: 1
      }}>
            ✓ APPLICATION SUBMITTED — awaiting admin approval
          </div> : <div style={{
        display: 'grid',
        gap: 12
      }}>
            <div className="scgf-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 12
        }}>
              <div>
                <label data-testid="register-org-modal-nc-label" className="nc-label">ORG NAME *</label>
                <input className="nc-input" value={form.name} onChange={e => update({
              name: e.target.value
            })} placeholder="Full organization name (3–64 chars)" maxLength={64} data-testid="register-org-name" />
              </div>
              <div>
                <label data-testid="register-org-modal-nc-label-2" className="nc-label">ORG TAG *</label>
                <input className="nc-input" value={form.tag} onChange={e => update({
              tag: e.target.value.toUpperCase()
            })} placeholder="ABBR (2–8)" maxLength={8} style={{
              textTransform: 'uppercase',
              letterSpacing: 2
            }} data-testid="register-org-tag" />
              </div>
            </div>
            <div>
              <label data-testid="register-org-modal-nc-label-3" className="nc-label">DESCRIPTION</label>
              <textarea className="nc-input" rows={3} value={form.description} onChange={e => update({
            description: e.target.value
          })} placeholder="What does your org do? Who's it for?" data-testid="register-org-description" />
            </div>
            <div className="scgf-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12
        }}>
              <div>
                <label data-testid="register-org-modal-nc-label-4" className="nc-label">RSI ORG URL</label>
                <input className="nc-input" value={form.rsi_org_url} onChange={e => update({
              rsi_org_url: e.target.value
            })} placeholder="https://robertsspaceindustries.com/orgs/..." data-testid="register-org-rsi-url" />
              </div>
              <div>
                <label data-testid="register-org-modal-nc-label-5" className="nc-label">DISCORD INVITE URL</label>
                <input className="nc-input" value={form.discord_invite_url} onChange={e => update({
              discord_invite_url: e.target.value
            })} placeholder="https://discord.gg/..." data-testid="register-org-discord-invite" />
              </div>
            </div>
            <div>
              <label data-testid="register-org-modal-nc-label-6" className="nc-label">SPECIALTIES</label>
              <MultiToggle options={SPECIALTY_LABELS} selected={form.specialties} onChange={v => update({
            specialties: v
          })} testidPrefix="register-org-specialty" />
            </div>
            <div className="scgf-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12
        }}>
              <div>
                <label data-testid="register-org-modal-nc-label-7" className="nc-label">HOME REGIONS</label>
                <MultiToggle options={REGIONS} selected={form.home_regions} onChange={v => update({
              home_regions: v
            })} testidPrefix="register-org-region" />
              </div>
              <div>
                <label data-testid="register-org-modal-nc-label-8" className="nc-label">SERVICE SYSTEMS</label>
                <MultiToggle options={SYSTEMS} selected={form.service_systems} onChange={v => update({
              service_systems: v
            })} testidPrefix="register-org-system" />
              </div>
            </div>

            {err && <div data-testid="register-org-error" style={{
          padding: 10,
          border: '1px solid #ff4466',
          color: '#ff4466',
          fontSize: 12,
          fontFamily: 'var(--nc-font-mono)'
        }}>{err}</div>}
            <div className="scgf-wrap" style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
          marginTop: 4
        }}>
              <button className="nc-btn" onClick={onClose} disabled={submitting} data-testid="register-org-cancel">CANCEL</button>
              <button className="nc-btn nc-btn-primary" onClick={submit} disabled={submitting} data-testid="register-org-submit">
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>}
      </div>
    </div>;
}
