import { MessageSquare, Check, Send, Lock } from 'lucide-react';
import { AlertRoutesPanel } from './AlertRoutesPanel.jsx';
import { MultiToggle } from './MultiToggle.jsx';
import { ALERT_CATEGORIES, REGIONS, SYSTEMS, TIMINGS } from './orgConstants.js';
export const OrgDispatchFields = ({
  org,
  webhookInput,
  setWebhookInput,
  connectWebhook,
  saving,
  sendTest,
  testing,
  form,
  update
}) => {
  return <>{/* Discord webhook + alert filters */}
      <div style={{
      background: 'rgba(0,240,255,0.04)',
      border: '1px solid rgba(0,240,255,0.2)',
      padding: 16,
      marginBottom: 16
    }}>
        <div className="scgf-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
      }}>
          <MessageSquare size={14} style={{
          color: 'var(--nc-cyan)'
        }} />
          <span data-testid={`org-dispatch-fields-span-${org.id}`} style={{
          fontFamily: 'var(--nc-font-mono)',
          fontSize: 11,
          letterSpacing: 2,
          color: 'var(--nc-cyan)'
        }}>DISCORD DISPATCH</span>
          <span data-testid="webhook-status" style={{
          marginLeft: 'auto',
          fontSize: 11,
          fontFamily: 'var(--nc-font-mono)',
          color: org.discord_connected ? '#00ff88' : 'var(--nc-text-muted)'
        }}>
            {org.discord_connected ? '● Webhook connected' : '○ No webhook configured'}
          </span>
        </div>

        <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 12
      }}>
          <input className="nc-input" placeholder="https://discord.com/api/webhooks/..." value={webhookInput} onChange={e => setWebhookInput(e.target.value)} style={{
          flex: '1 1 320px'
        }} data-testid="webhook-input" />
          <button type="button" className="nc-btn nc-btn-primary" onClick={connectWebhook} disabled={saving || !webhookInput.trim()} data-testid="webhook-save-btn">
            <Check size={14} /> Save Webhook
          </button>
          <button type="button" className="nc-btn nc-btn-secondary" onClick={sendTest} disabled={testing || !org.discord_connected} data-testid="webhook-test-btn">
            <Send size={14} /> {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>

        {/* Per-category alert routes */}
        <AlertRoutesPanel orgId={org.id} />

        <label data-testid={`org-dispatch-fields-label-${org.id}`} style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        fontSize: 13,
        color: 'var(--nc-text-secondary)',
        cursor: 'pointer',
        marginBottom: 12
      }}>
          <input type="checkbox" checked={form.discord_alerts_enabled} onChange={e => update({
          discord_alerts_enabled: e.target.checked
        })} data-testid="alerts-enabled-toggle" />
          <span data-testid={`org-dispatch-fields-span-2-${org.id}`}><strong data-testid={`org-dispatch-fields-strong-${org.id}`} style={{
            color: 'var(--nc-cyan)'
          }}>Enable dispatch</strong> — fire Discord alerts for new contracts matching the filters below.</span>
        </label>

        <div style={{
        display: 'grid',
        gap: 12
      }}>
          <div>
            <label data-testid={`org-dispatch-fields-nc-label-${org.id}`} className="nc-label">ALERT CATEGORIES (empty = all)</label>
            <MultiToggle options={ALERT_CATEGORIES} selected={form.alert_categories} onChange={v => update({
            alert_categories: v
          })} testidPrefix="alert-cat" />
          </div>
          <div className="scgf-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12
        }}>
            <div>
              <label data-testid={`org-dispatch-fields-nc-label-2-${org.id}`} className="nc-label">REGIONS</label>
              <MultiToggle options={REGIONS} selected={form.alert_regions} onChange={v => update({
              alert_regions: v
            })} testidPrefix="alert-region" />
            </div>
            <div>
              <label data-testid={`org-dispatch-fields-nc-label-3-${org.id}`} className="nc-label">SYSTEMS</label>
              <MultiToggle options={SYSTEMS} selected={form.alert_systems} onChange={v => update({
              alert_systems: v
            })} testidPrefix="alert-system" />
            </div>
          </div>
          <div className="scgf-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12
        }}>
            <div>
              <label data-testid={`org-dispatch-fields-nc-label-4-${org.id}`} className="nc-label">TIMING</label>
              <MultiToggle options={TIMINGS} selected={form.alert_timing_types} onChange={v => update({
              alert_timing_types: v
            })} testidPrefix="alert-timing" />
            </div>
            <div>
              <label data-testid={`org-dispatch-fields-nc-label-5-${org.id}`} className="nc-label">MIN PAYOUT (aUEC)</label>
              <input className="nc-input" type="number" min={0} placeholder="0" value={form.alert_min_payout} onChange={e => update({
              alert_min_payout: e.target.value
            })} data-testid="alert-min-payout" />
            </div>
          </div>
          <label data-testid={`org-dispatch-fields-label-2-${org.id}`} style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          fontSize: 13,
          color: 'var(--nc-text-secondary)',
          cursor: 'pointer'
        }}>
            <input type="checkbox" checked={form.alert_rescue_only} onChange={e => update({
            alert_rescue_only: e.target.checked
          })} data-testid="alert-rescue-only" />
            <span data-testid={`org-dispatch-fields-span-3-${org.id}`}><strong data-testid={`org-dispatch-fields-strong-2-${org.id}`} style={{
              color: '#ff4466'
            }}>Rescue-only mode</strong> — only fire alerts for Medical / Rescue contracts.</span>
          </label>
        </div>

        <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 6,
        alignItems: 'flex-start',
        padding: 10,
        marginTop: 14,
        background: 'rgba(255,0,68,0.04)',
        border: '1px solid rgba(255,0,68,0.2)'
      }}>
          <Lock size={14} style={{
          color: '#ff4466',
          marginTop: 2
        }} />
          <span data-testid={`org-dispatch-fields-span-4-${org.id}`} style={{
          color: 'var(--nc-text-secondary)',
          fontSize: 12,
          lineHeight: 1.5
        }}>
            Rescue-safe: exact patient location, body location, and private notes are <strong data-testid={`org-dispatch-fields-strong-3-${org.id}`}>never</strong> sent to Discord —
            only public risk fields and bleed-out timing. Webhook URL is never exposed publicly.
          </span>
        </div>
      </div>

  </>;
};
