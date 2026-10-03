import { MultiToggle } from './MultiToggle.jsx';
import { SPECIALTY_LABELS, REGIONS, SYSTEMS } from './orgConstants.js';
export const OrgProfileFields = ({
  form,
  update
}) => {
  return <>{/* Profile section */}
      <div style={{
      display: 'grid',
      gap: 12,
      marginBottom: 18
    }}>
        <div className="scgf-form-grid" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 12
      }}>
          <div>
            <label data-testid="org-profile-fields-nc-label" className="nc-label">ORG NAME</label>
            <input className="nc-input" value={form.name} onChange={e => update({
            name: e.target.value
          })} placeholder="Full organization name (3–64 chars)" maxLength={64} data-testid="org-name-input" />
          </div>
          <div>
            <label data-testid="org-profile-fields-nc-label-2" className="nc-label">ORG TAG</label>
            <input className="nc-input" value={form.tag} onChange={e => update({
            tag: e.target.value.toUpperCase()
          })} placeholder="ABBR (2–8)" maxLength={8} style={{
            textTransform: 'uppercase',
            letterSpacing: 2
          }} data-testid="org-tag-input" />
          </div>
        </div>
        <label data-testid="org-profile-fields-nc-label-3" className="nc-label">DESCRIPTION</label>
        <textarea className="nc-input" rows={3} value={form.description} onChange={e => update({
        description: e.target.value
      })} placeholder="What does your org do? Who's it for?" data-testid="org-description-input" />
        <div className="scgf-form-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12
      }}>
          <div>
            <label data-testid="org-profile-fields-nc-label-4" className="nc-label">RSI ORG URL</label>
            <input className="nc-input" value={form.rsi_org_url} onChange={e => update({
            rsi_org_url: e.target.value
          })} placeholder="https://robertsspaceindustries.com/orgs/..." data-testid="org-rsi-url" />
          </div>
          <div>
            <label data-testid="org-profile-fields-nc-label-5" className="nc-label">DISCORD INVITE URL</label>
            <input className="nc-input" value={form.discord_invite_url} onChange={e => update({
            discord_invite_url: e.target.value
          })} placeholder="https://discord.gg/..." data-testid="org-discord-invite" />
          </div>
          <div style={{
          display: 'grid',
          gap: 6
        }}>
            <label data-testid="org-profile-fields-label" style={{
            fontSize: 11,
            color: 'var(--nc-cyan)',
            fontFamily: 'var(--nc-font-mono)',
            textTransform: 'uppercase'
          }}>Contract-History Webhook (optional)</label>
            <input className="nc-input" value={form.discord_history_webhook_url} onChange={e => update({
            discord_history_webhook_url: e.target.value
          })} placeholder="https://discord.com/api/webhooks/..." data-testid="org-discord-history-webhook" />
            <div style={{
            fontSize: 11,
            color: 'var(--nc-text-muted)'
          }}>
              When a contract is marked <strong data-testid="org-profile-fields-strong">complete</strong>, a summary post is sent here (leave blank to disable). Use a different channel (e.g. <code>#contract-history</code>) from your live alerts.
            </div>
          </div>
        </div>

        <label data-testid="org-profile-fields-nc-label-6" className="nc-label" style={{
        marginTop: 8
      }}>SPECIALTIES</label>
        <MultiToggle options={SPECIALTY_LABELS} selected={form.specialties} onChange={v => update({
        specialties: v
      })} testidPrefix="org-specialty" />

        <div className="scgf-form-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginTop: 8
      }}>
          <div>
            <label data-testid="org-profile-fields-nc-label-7" className="nc-label">HOME REGIONS</label>
            <MultiToggle options={REGIONS} selected={form.home_regions} onChange={v => update({
            home_regions: v
          })} testidPrefix="org-region" />
          </div>
          <div>
            <label data-testid="org-profile-fields-nc-label-8" className="nc-label">SERVICE SYSTEMS</label>
            <MultiToggle options={SYSTEMS} selected={form.service_systems} onChange={v => update({
            service_systems: v
          })} testidPrefix="org-system" />
          </div>
        </div>
      </div>

      </>;
};
