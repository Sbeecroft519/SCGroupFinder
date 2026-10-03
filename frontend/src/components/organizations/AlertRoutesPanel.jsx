import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { MultiToggle } from './MultiToggle.jsx';
import { ALERT_CATEGORIES } from './orgConstants.js';
import { AlertRouteRow } from './AlertRouteRow.jsx';
export function AlertRoutesPanel({
  orgId
}) {
  const [routes, setRoutes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRoute, setNewRoute] = useState({
    webhook_url: '',
    label: '',
    categories: [],
    rescue_only: false
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fetchRoutes = async () => {
    try {
      const r = await axios.get(`${API}/orgs/${orgId}/routes`);
      setRoutes(r.data?.routes || []);
    } catch (e) {
      setRoutes([]);
    }
  };
  useEffect(() => {
    fetchRoutes(); /* eslint-disable-next-line */
  }, [orgId]);
  const add = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/orgs/${orgId}/routes`, newRoute);
      setNewRoute({
        webhook_url: '',
        label: '',
        categories: [],
        rescue_only: false
      });
      setShowAdd(false);
      fetchRoutes();
    } catch (e) {
      setMsg({
        type: 'err',
        text: e.response?.data?.detail || 'Failed to add route'
      });
      setTimeout(() => setMsg(null), 4000);
    } finally {
      setBusy(false);
    }
  };
  return <div data-testid="alert-routes-panel" style={{
    background: 'rgba(0,240,255,0.03)',
    border: '1px solid rgba(0,240,255,0.2)',
    padding: 16,
    marginBottom: 16
  }}>
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
      flexWrap: 'wrap'
    }}>
        <span data-testid="alert-routes-panel-span" style={{
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 11,
        letterSpacing: 2,
        color: 'var(--nc-cyan)'
      }}>
          DISPATCH ROUTES
        </span>
        <span data-testid="alert-routes-panel-span-2" style={{
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 11,
        color: 'var(--nc-text-muted)'
      }}>
          Route alerts to different Discord channels by contract category.
        </span>
        <button type="button" onClick={() => setShowAdd(s => !s)} data-testid="route-add-toggle" style={{
        marginLeft: 'auto',
        background: 'transparent',
        border: '1px solid var(--nc-cyan)',
        color: 'var(--nc-cyan)',
        padding: '4px 12px',
        fontSize: 11,
        fontFamily: 'var(--nc-font-mono)',
        cursor: 'pointer'
      }}>
          {showAdd ? '✕ CANCEL' : '+ ADD ROUTE'}
        </button>
      </div>

      {showAdd && <div data-testid="route-add-form" style={{
      display: 'grid',
      gap: 8,
      padding: 12,
      marginBottom: 14,
      background: 'rgba(0,0,0,0.2)',
      border: '1px dashed rgba(0,240,255,0.4)'
    }}>
          <input className="nc-input" placeholder="Label (e.g. medical-alerts)" value={newRoute.label} onChange={e => setNewRoute(p => ({
        ...p,
        label: e.target.value
      }))} data-testid="new-route-label" />
          <input className="nc-input" placeholder="https://discord.com/api/webhooks/..." value={newRoute.webhook_url} onChange={e => setNewRoute(p => ({
        ...p,
        webhook_url: e.target.value
      }))} data-testid="new-route-webhook" />
          <div>
            <label data-testid="alert-routes-panel-nc-label" className="nc-label" style={{
          fontSize: 10
        }}>CATEGORIES (empty = catch-all)</label>
            <MultiToggle options={ALERT_CATEGORIES} selected={newRoute.categories} onChange={v => setNewRoute(p => ({
          ...p,
          categories: v
        }))} testidPrefix="new-route-cat" />
          </div>
          <label data-testid="alert-routes-panel-label" style={{
        display: 'flex',
        gap: 8,
        fontSize: 12,
        color: 'var(--nc-text-secondary)'
      }}>
            <input type="checkbox" checked={newRoute.rescue_only} onChange={e => setNewRoute(p => ({
          ...p,
          rescue_only: e.target.checked
        }))} data-testid="new-route-rescue-only" />
            Rescue-only (only fire for MEDICAL contracts)
          </label>
          <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 8
      }}>
            <button type="button" onClick={add} disabled={busy || !newRoute.webhook_url.trim()} data-testid="new-route-submit" style={{
          background: 'transparent',
          border: '1px solid #00ff88',
          color: '#00ff88',
          padding: '6px 14px',
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          cursor: 'pointer'
        }}>
              {busy ? 'ADDING...' : '+ ADD ROUTE'}
            </button>
            {msg && <span data-testid="alert-routes-panel-span-3" style={{
          fontSize: 11,
          alignSelf: 'center',
          fontFamily: 'var(--nc-font-mono)',
          color: msg.type === 'ok' ? '#00ff88' : '#ff4466'
        }}>{msg.text}</span>}
          </div>
        </div>}

      {routes.length === 0 ? <div style={{
      padding: 10,
      color: 'var(--nc-text-muted)',
      fontFamily: 'var(--nc-font-mono)',
      fontSize: 12
    }}>
          No routes yet — dispatch uses the single Discord Webhook (above). Add per-category routes to send
          medical alerts to <code>#med</code>, LFG to <code>#lfg</code>, etc.
        </div> : <div>{routes.map(r => <AlertRouteRow key={r.id} orgId={orgId} route={r} onChanged={fetchRoutes} />)}</div>}

      <div style={{
      marginTop: 10,
      fontSize: 11,
      color: 'var(--nc-text-muted)',
      fontFamily: 'var(--nc-font-mono)'
    }}>
        Selection: the first specific category match wins. If nothing matches, all catch-all routes fire.
      </div>
    </div>;
}
