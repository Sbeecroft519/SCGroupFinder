import { useState } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { MultiToggle } from './MultiToggle.jsx';
import { ALERT_CATEGORIES } from './orgConstants.js';
export function AlertRouteRow({
  orgId,
  route,
  onChanged
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    webhook_url: route.webhook_url || '',
    label: route.label || '',
    categories: route.categories || [],
    rescue_only: !!route.rescue_only,
    enabled: route.enabled !== false
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const flash = (type, text) => {
    setMsg({
      type,
      text
    });
    setTimeout(() => setMsg(null), 3500);
  };
  const save = async () => {
    setBusy(true);
    try {
      await axios.put(`${API}/orgs/${orgId}/routes/${route.id}`, form);
      setEditing(false);
      onChanged?.();
    } catch (e) {
      flash('err', e.response?.data?.detail || 'Save failed');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm('Remove this route?')) return;
    setBusy(true);
    try {
      await axios.delete(`${API}/orgs/${orgId}/routes/${route.id}`);
      onChanged?.();
    } catch (e) {
      flash('err', e.response?.data?.detail || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    try {
      const r = await axios.post(`${API}/orgs/${orgId}/routes/${route.id}/test`);
      if (r.data?.success) flash('ok', 'Test ping delivered.');else flash('err', `Webhook returned ${r.data?.status || 'error'}`);
    } catch (e) {
      flash('err', e.response?.data?.detail || 'Test failed');
    } finally {
      setBusy(false);
    }
  };
  const cats = route.categories || [];
  const catSummary = cats.length === 0 ? 'CATCH-ALL' : cats.join(', ');
  const maskedUrl = (route.webhook_url || '').replace(/^(https:\/\/[^/]+\/api\/webhooks\/\d+\/).*$/, '$1•••');
  return <div data-testid={`route-row-${route.id}`} style={{
    border: '1px solid rgba(0,240,255,0.25)',
    background: route.enabled === false ? 'rgba(255,255,255,0.02)' : 'rgba(0,240,255,0.03)',
    padding: 12,
    marginBottom: 8,
    opacity: route.enabled === false ? 0.55 : 1
  }}>
      {!editing ? <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }}>
          <div style={{
        flex: '1 1 240px'
      }}>
            <div className="scgf-wrap" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
              <span data-testid={`alert-route-row-span-${route.id}`} style={{
            fontFamily: 'var(--nc-font-mono)',
            fontSize: 12,
            color: 'var(--nc-cyan)'
          }}>
                › {(route.label || 'unnamed').toUpperCase()}
              </span>
              <span data-testid={`alert-route-row-span-2-${route.id}`} style={{
            fontSize: 10,
            padding: '2px 6px',
            letterSpacing: 1,
            background: cats.length === 0 ? 'rgba(255,153,0,0.10)' : 'rgba(0,240,255,0.10)',
            color: cats.length === 0 ? '#ff9900' : 'var(--nc-cyan)',
            border: `1px solid ${cats.length === 0 ? '#ff9900' : 'var(--nc-cyan)'}`,
            fontFamily: 'var(--nc-font-mono)'
          }}>{catSummary}</span>
              {route.rescue_only && <span data-testid={`alert-route-row-span-3-${route.id}`} style={{
            fontSize: 10,
            padding: '2px 6px',
            letterSpacing: 1,
            fontFamily: 'var(--nc-font-mono)',
            background: 'rgba(255,68,102,0.10)',
            color: '#ff4466',
            border: '1px solid #ff4466'
          }}>RESCUE-ONLY</span>}
              {route.enabled === false && <span data-testid={`alert-route-row-span-4-${route.id}`} style={{
            fontSize: 10,
            padding: '2px 6px',
            letterSpacing: 1,
            fontFamily: 'var(--nc-font-mono)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--nc-text-muted)',
            border: '1px solid var(--nc-text-muted)'
          }}>DISABLED</span>}
            </div>
            <div style={{
          fontSize: 11,
          color: 'var(--nc-text-muted)',
          fontFamily: 'var(--nc-font-mono)',
          marginTop: 4
        }}>
              {maskedUrl}
            </div>
          </div>
          <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 6
      }}>
            <button type="button" onClick={test} disabled={busy} data-testid={`route-test-${route.id}`} style={{
          background: 'transparent',
          border: '1px solid #00f0ff',
          color: '#00f0ff',
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          cursor: 'pointer'
        }}>
              {busy ? '…' : 'TEST'}
            </button>
            <button type="button" onClick={() => setEditing(true)} disabled={busy} data-testid={`route-edit-${route.id}`} style={{
          background: 'transparent',
          border: '1px solid var(--nc-text-secondary)',
          color: 'var(--nc-text-secondary)',
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          cursor: 'pointer'
        }}>
              EDIT
            </button>
            <button type="button" onClick={remove} disabled={busy} data-testid={`route-delete-${route.id}`} style={{
          background: 'transparent',
          border: '1px solid #ff4466',
          color: '#ff4466',
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          cursor: 'pointer'
        }}>
              ✕
            </button>
          </div>
          {msg && <div style={{
        flex: '0 0 100%',
        fontSize: 11,
        fontFamily: 'var(--nc-font-mono)',
        color: msg.type === 'ok' ? '#00ff88' : '#ff4466'
      }}>{msg.text}</div>}
        </div> : <div style={{
      display: 'grid',
      gap: 8
    }}>
          <input data-testid={`alert-route-row-set-form-${route.id}`} className="nc-input" placeholder="Label (e.g. medical-alerts)" value={form.label} onChange={e => setForm(p => ({
        ...p,
        label: e.target.value
      }))} />
          <input data-testid={`alert-route-row-set-form-2-${route.id}`} className="nc-input" placeholder="https://discord.com/api/webhooks/..." value={form.webhook_url} onChange={e => setForm(p => ({
        ...p,
        webhook_url: e.target.value
      }))} />
          <div>
            <label data-testid={`alert-route-row-nc-label-${route.id}`} className="nc-label" style={{
          fontSize: 10
        }}>CATEGORIES (empty = catch-all)</label>
            <MultiToggle options={ALERT_CATEGORIES} selected={form.categories} onChange={v => setForm(p => ({
          ...p,
          categories: v
        }))} testidPrefix={`route-cat-${route.id}`} />
          </div>
          <label data-testid={`alert-route-row-label-${route.id}`} style={{
        display: 'flex',
        gap: 8,
        fontSize: 12,
        color: 'var(--nc-text-secondary)'
      }}>
            <input data-testid={`alert-route-row-set-form-3-${route.id}`} type="checkbox" checked={form.rescue_only} onChange={e => setForm(p => ({
          ...p,
          rescue_only: e.target.checked
        }))} />
            Rescue-only (only fire for MEDICAL contracts)
          </label>
          <label data-testid={`alert-route-row-label-2-${route.id}`} style={{
        display: 'flex',
        gap: 8,
        fontSize: 12,
        color: 'var(--nc-text-secondary)'
      }}>
            <input data-testid={`alert-route-row-set-form-4-${route.id}`} type="checkbox" checked={form.enabled} onChange={e => setForm(p => ({
          ...p,
          enabled: e.target.checked
        }))} />
            Enabled
          </label>
          <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 6
      }}>
            <button type="button" onClick={save} disabled={busy || !form.webhook_url.trim()} data-testid={`route-save-${route.id}`} style={{
          background: 'transparent',
          border: '1px solid #00ff88',
          color: '#00ff88',
          padding: '4px 12px',
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          cursor: 'pointer'
        }}>
              {busy ? 'SAVING...' : 'SAVE'}
            </button>
            <button data-testid={`alert-route-row-set-editing-${route.id}`} type="button" onClick={() => setEditing(false)} style={{
          background: 'transparent',
          border: '1px solid var(--nc-text-muted)',
          color: 'var(--nc-text-muted)',
          padding: '4px 12px',
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          cursor: 'pointer'
        }}>
              CANCEL
            </button>
            {msg && <span data-testid={`alert-route-row-span-5-${route.id}`} style={{
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          color: msg.type === 'ok' ? '#00ff88' : '#ff4466',
          marginLeft: 8,
          alignSelf: 'center'
        }}>{msg.text}</span>}
          </div>
        </div>}
    </div>;
}
