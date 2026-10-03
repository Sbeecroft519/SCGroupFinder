import { useState } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { AlertCircle, Check } from 'lucide-react';
import { OrgProfileFields } from './OrgProfileFields.jsx';
import { OrgDispatchFields } from './OrgDispatchFields.jsx';
export function MyOrgPanel({
  org,
  onChanged
}) {
  const [form, setForm] = useState(() => ({
    name: org.name || '',
    tag: org.tag || '',
    description: org.description || '',
    rsi_org_url: org.rsi_org_url || '',
    discord_invite_url: org.discord_invite_url || '',
    discord_history_webhook_url: org.discord_history_webhook_url || '',
    specialties: org.specialties || [],
    home_regions: org.home_regions || [],
    service_systems: org.service_systems || [],
    discord_alerts_enabled: !!org.discord_alerts_enabled,
    alert_categories: org.alert_categories || [],
    alert_regions: org.alert_regions || [],
    alert_systems: org.alert_systems || [],
    alert_timing_types: org.alert_timing_types || [],
    alert_rescue_only: !!org.alert_rescue_only,
    alert_min_payout: org.alert_min_payout || ''
  }));
  const [webhookInput, setWebhookInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const update = patch => setForm(prev => ({
    ...prev,
    ...patch
  }));
  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        tag: form.tag.trim().toUpperCase(),
        description: form.description,
        rsi_org_url: form.rsi_org_url || null,
        discord_invite_url: form.discord_invite_url || null,
        discord_history_webhook_url: form.discord_history_webhook_url ?? '',
        specialties: form.specialties,
        home_regions: form.home_regions,
        service_systems: form.service_systems,
        discord_alerts_enabled: form.discord_alerts_enabled,
        alert_categories: form.alert_categories,
        alert_regions: form.alert_regions,
        alert_systems: form.alert_systems,
        alert_timing_types: form.alert_timing_types,
        alert_rescue_only: form.alert_rescue_only,
        alert_min_payout: form.alert_min_payout === '' ? null : parseInt(form.alert_min_payout)
      };
      await axios.put(`${API}/orgs/${org.id}`, payload);
      setFeedback({
        type: 'ok',
        text: 'Org saved.'
      });
      onChanged?.();
    } catch (e) {
      setFeedback({
        type: 'err',
        text: e.response?.data?.detail || 'Save failed'
      });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };
  const connectWebhook = async () => {
    if (!webhookInput.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/orgs/${org.id}/discord-webhook`, {
        discord_webhook_url: webhookInput.trim()
      });
      setWebhookInput('');
      setFeedback({
        type: 'ok',
        text: 'Webhook saved.'
      });
      onChanged?.();
    } catch (e) {
      setFeedback({
        type: 'err',
        text: e.response?.data?.detail || 'Webhook save failed'
      });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };
  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await axios.post(`${API}/orgs/${org.id}/test-discord`);
      if (r.data?.success) setFeedback({
        type: 'ok',
        text: 'Test alert delivered to Discord.'
      });else setFeedback({
        type: 'err',
        text: `Webhook returned ${r.data?.status || 'error'}`
      });
    } catch (e) {
      setFeedback({
        type: 'err',
        text: e.response?.data?.detail || 'Test failed'
      });
    } finally {
      setTesting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };
  const approved = org.approval_status === 'approved';
  const pending = org.approval_status === 'pending';
  return <div data-testid="my-org-panel" style={{
    background: 'rgba(2, 11, 20, 0.92)',
    border: '1px solid var(--nc-cyan)',
    padding: 24,
    marginBottom: 24
  }}>
      <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      flexWrap: 'wrap',
      marginBottom: 14
    }}>
        <span data-testid={`my-org-panel-span-${org.id}`} style={{
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 11,
        letterSpacing: 2,
        color: 'var(--nc-cyan)'
      }}>// YOUR ORGANIZATION</span>
        <span data-testid={`my-org-panel-span-2-${org.id}`} style={{
        fontFamily: 'var(--nc-font-display)',
        fontSize: 22,
        color: 'var(--nc-text-primary)'
      }}>{org.name}</span>
        <span data-testid={`my-org-panel-span-3-${org.id}`} style={{
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 12,
        color: 'var(--nc-cyan)'
      }}>[{org.tag}]</span>
        <span data-testid="org-approval-pill" style={{
        marginLeft: 'auto',
        fontSize: 10,
        padding: '3px 8px',
        letterSpacing: 1,
        fontFamily: 'var(--nc-font-mono)',
        color: approved ? '#00ff88' : pending ? '#ffd700' : '#ff4466',
        border: `1px solid ${approved ? '#00ff88' : pending ? '#ffd700' : '#ff4466'}`
      }}>
          {approved ? '● APPROVED' : pending ? '⏳ PENDING REVIEW' : '✕ REJECTED'}
        </span>
      </div>

      {pending && <div className="scgf-wrap" data-testid="pending-notice" style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: 10,
      background: 'rgba(255,215,0,0.05)',
      border: '1px solid rgba(255,215,0,0.3)',
      marginBottom: 16
    }}>
          <AlertCircle size={14} style={{
        color: '#ffd700',
        marginTop: 2
      }} />
          <span data-testid={`my-org-panel-span-4-${org.id}`} style={{
        color: 'var(--nc-text-secondary)',
        fontSize: 12,
        lineHeight: 1.6
      }}>
            Your org is awaiting admin approval. You can still fill in your profile and connect a webhook —
            dispatch will start firing once approved.
          </span>
        </div>}

      <OrgProfileFields form={form} update={update} />
    <OrgDispatchFields org={org} webhookInput={webhookInput} setWebhookInput={setWebhookInput} connectWebhook={connectWebhook} saving={saving} sendTest={sendTest} testing={testing} form={form} update={update} />
      <div style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
        <button type="button" className="nc-btn nc-btn-primary" onClick={saveProfile} disabled={saving} data-testid="save-org-btn">
          <Check size={14} /> {saving ? 'Saving...' : 'Save Org Profile'}
        </button>
        {feedback && <span data-testid="org-feedback" style={{
        fontSize: 12,
        fontFamily: 'var(--nc-font-mono)',
        color: feedback.type === 'ok' ? '#00ff88' : '#ff4466'
      }}>
            {feedback.text}
          </span>}
      </div>
    </div>;
}
