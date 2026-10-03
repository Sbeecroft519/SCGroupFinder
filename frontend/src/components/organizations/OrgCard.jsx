import { Link } from 'react-router-dom';

export function OrgCard({
  org
}) {
  return <Link to={`/orgs/${org.id}`} data-testid={`org-card-${org.tag}`} style={{
    display: 'block',
    textDecoration: 'none',
    background: 'rgba(2, 11, 20, 0.85)',
    border: '1px solid var(--nc-border)',
    borderLeft: '3px solid var(--nc-cyan)',
    padding: 18,
    transition: 'border-color .2s, transform .2s'
  }}>
      <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      marginBottom: 8,
      flexWrap: 'wrap'
    }}>
        <span data-testid={`org-card-span-${org.id}`} style={{
        fontFamily: 'var(--nc-font-display)',
        fontSize: 18,
        color: 'var(--nc-text-primary)'
      }}>{org.name}</span>
        <span data-testid={`org-card-span-2-${org.id}`} style={{
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 11,
        color: 'var(--nc-cyan)',
        letterSpacing: 1
      }}>[{org.tag}]</span>
        {org.discord_connected && <span data-testid={`org-card-span-3-${org.id}`} style={{
        marginLeft: 'auto',
        fontSize: 10,
        padding: '2px 6px',
        letterSpacing: 1,
        background: 'rgba(0,255,136,0.10)',
        color: '#00ff88',
        border: '1px solid #00ff88',
        fontFamily: 'var(--nc-font-mono)'
      }}>● DISCORD READY</span>}
      </div>
      {org.description && <p data-testid={`org-card-p-${org.id}`} style={{
      color: 'var(--nc-text-secondary)',
      fontSize: 13,
      lineHeight: 1.5,
      margin: '0 0 12px'
    }}>{org.description}</p>}
      <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }}>
        {(org.specialties || []).map(s => <span data-testid={`org-card-span-4-${s}-${org.id}`} key={s} style={{
        fontSize: 11,
        padding: '2px 8px',
        background: 'rgba(0,240,255,0.06)',
        border: '1px solid rgba(0,240,255,0.25)',
        color: 'var(--nc-cyan)',
        fontFamily: 'var(--nc-font-mono)'
      }}>{s}</span>)}
      </div>
      <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 12,
      fontSize: 11,
      color: 'var(--nc-text-muted)',
      fontFamily: 'var(--nc-font-mono)'
    }}>
        {(org.home_regions || []).length > 0 && <span data-testid={`org-card-span-5-${org.id}`}>Regions: {org.home_regions.join(', ')}</span>}
        {(org.service_systems || []).length > 0 && <span data-testid={`org-card-span-6-${org.id}`}>Systems: {org.service_systems.join(', ')}</span>}
        <span data-testid={`org-card-member-count-${org.id}`} style={{
      color: 'var(--nc-cyan)'
    }}>{org.displayed_member_count ?? 0} member{(org.displayed_member_count ?? 0) === 1 ? '' : 's'} displaying</span>
      </div>
    </Link>;
}
