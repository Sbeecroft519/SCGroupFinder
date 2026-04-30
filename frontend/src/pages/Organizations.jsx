import { Building2, Stethoscope, Shield, Truck, Pickaxe, Users, MessageSquare, Lock } from 'lucide-react';

const SPECIALTIES = [
  { icon: Stethoscope, label: 'Medical / Rescue', color: '#ff4466' },
  { icon: Shield, label: 'Security & Escort', color: '#00f0ff' },
  { icon: Truck, label: 'Cargo & Hauling', color: '#00ff88' },
  { icon: Pickaxe, label: 'Mining / Salvage', color: '#ffd700' },
  { icon: Users, label: 'New Player Help', color: '#c977ff' },
  { icon: Building2, label: 'Events & Roleplay', color: '#ff9900' },
];

const FEATURES = [
  'Public organization profiles',
  'Org specialties: Medical, Rescue, Security, Cargo, Mining, Salvage',
  'Discord alerts for matching contracts',
  'Rescue-safe dispatch alerts that protect private patient location data',
  'Region, system, timing, and category filters',
  'Future org reputation and dispatch tools',
];

export default function Organizations() {
  return (
    <div className="navcom-page" data-testid="orgs-page">
      <div className="page-header">
        <div className="page-label">// ORGANIZATIONS</div>
        <h1 className="page-title">Organizations</h1>
        <p className="page-subtitle">Org dispatch tools for rescue teams, escorts, haulers, and industrial crews.</p>
      </div>

      <div className="nc-card" style={{ borderLeft: '3px solid var(--nc-cyan)', padding: '32px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 2, color: '#c977ff', padding: '3px 10px', border: '1px solid #c977ff' }} data-testid="orgs-status-pill">
            COMING SOON
          </span>
          <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 1, color: 'var(--nc-text-muted)' }}>
            Early-access dispatch tools
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 28, color: 'var(--nc-text-primary)', margin: '0 0 12px' }}>
          Organizations Coming Soon
        </h2>
        <p style={{ color: 'var(--nc-text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 24, maxWidth: 760 }}>
          Soon, organizations will be able to create public org profiles, connect Discord alert
          channels, and receive filtered contract notifications when relevant jobs are posted.
        </p>

        {/* Specialties row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
          {SPECIALTIES.map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <s.icon size={18} style={{ color: s.color }} />
              <span style={{ fontSize: 13, color: 'var(--nc-text-secondary)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Feature bullets */}
        <h3 style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 12, letterSpacing: 2, color: 'var(--nc-cyan)', marginBottom: 12 }}>
          // WHAT_TO_EXPECT
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: 8 }}>
          {FEATURES.map(f => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'var(--nc-text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
              <span style={{ color: '#00ff88', fontFamily: 'var(--nc-font-mono)' }}>›</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Rescue-safe note */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, background: 'rgba(255, 0, 68, 0.05)', border: '1px solid rgba(255,0,68,0.25)', marginBottom: 20 }}>
          <Lock size={16} style={{ color: '#ff4466', marginTop: 2 }} />
          <div style={{ color: 'var(--nc-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: '#ff4466', display: 'block', marginBottom: 4, fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 1 }}>
              RESCUE-SAFE DISPATCH
            </strong>
            Discord alerts for medical/rescue jobs will include only public risk fields and bleed-out
            timing. Exact patient location, body location, and private notes are <strong>never</strong> sent
            to Discord — they're disclosed only to the accepted rescuer.
          </div>
        </div>

        {/* Early-access note (exact copy required by spec) */}
        <div style={{ padding: 14, background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.25)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MessageSquare size={14} style={{ color: 'var(--nc-cyan)' }} />
            <strong style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 1, color: 'var(--nc-cyan)' }}>
              EARLY ACCESS
            </strong>
          </div>
          <p style={{ color: 'var(--nc-text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Org tools are free during early access. Advanced org dispatch tools may be added later.
          </p>
        </div>

        {/* Disabled CTA */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          data-testid="create-org-disabled"
          style={{
            background: 'transparent',
            border: '1px solid var(--nc-border)',
            color: 'var(--nc-text-muted)',
            padding: '12px 24px',
            fontFamily: 'var(--nc-font-display)',
            fontSize: 13,
            letterSpacing: 2,
            cursor: 'not-allowed',
            opacity: 0.65,
          }}
        >
          CREATE ORGANIZATION — COMING SOON
        </button>
      </div>
    </div>
  );
}
