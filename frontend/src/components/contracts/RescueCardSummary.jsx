import { useBleedoutCountdown, HeartMonitor } from '../../utils/bleedout';
export const RescueCardSummary = ({
  contract
}) => {
  const {
    label,
    expired
  } = useBleedoutCountdown(contract.rescue_bleedout_expires_at);
  const pills = [contract.rescue_injury_tier && `Injury: ${contract.rescue_injury_tier}`, contract.rescue_pvp_area && `PvP: ${contract.rescue_pvp_area}`, contract.rescue_hostile_npcs && `NPCs: ${contract.rescue_hostile_npcs}`, contract.rescue_aa_turrets && `AA: ${contract.rescue_aa_turrets}`, contract.rescue_needs_food_hydration && `Food/Water: ${contract.rescue_needs_food_hydration}`].filter(Boolean);
  return <div data-testid={`rescue-card-summary-${contract.id}`} style={{
    marginTop: 8,
    padding: '8px 12px',
    background: 'rgba(255, 0, 68, 0.06)',
    border: '1px solid rgba(255, 0, 68, 0.25)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10
  }}>
      {contract.rescue_bleedout_expires_at && <div className="scgf-wrap" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: expired ? '#888' : '#ff4466',
      fontFamily: 'var(--nc-font-mono)',
      fontSize: 13
    }}>
          <HeartMonitor flatline={expired} />
          <span data-testid={`bleedout-countdown-${contract.id}`}>{expired ? 'Deceased' : label}</span>
        </div>}
      {pills.map((p, i) => <span data-testid={`rescue-card-summary-span-${i}-${contract.id}`} key={i} style={{
      fontSize: 11,
      fontFamily: 'var(--nc-font-mono)',
      color: 'var(--nc-text-secondary)',
      padding: '2px 8px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
          {p}
        </span>)}
      <span data-testid={`rescue-card-summary-span-2-${contract.id}`} style={{
      fontSize: 11,
      fontFamily: 'var(--nc-font-mono)',
      color: 'var(--nc-text-muted)',
      marginLeft: 'auto'
    }}>
        Exact location hidden until accepted
      </span>
    </div>;
};
