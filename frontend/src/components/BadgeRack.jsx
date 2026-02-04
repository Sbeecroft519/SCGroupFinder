import { BADGE_DEFINITIONS } from '../constants/badges';

export default function BadgeRack({ badges = [] }) {
  if (!badges || badges.length === 0) {
    return null;
  }

  const sortedBadges = [...badges].sort((a, b) => {
    const order = { SUPPORTER: 0, SPECIALIST: 1, MILESTONE: 2 };
    const catA = BADGE_DEFINITIONS[a]?.category || 'MILESTONE';
    const catB = BADGE_DEFINITIONS[b]?.category || 'MILESTONE';
    return order[catA] - order[catB];
  });

  return (
    <div style={{
      background: 'rgba(2, 11, 20, 0.9)',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      padding: '15px 20px',
      marginBottom: '20px',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
    }}>
      <div style={{
        color: '#00f0ff',
        fontSize: '11px',
        letterSpacing: '2px',
        marginBottom: '10px'
      }}>
        BADGES
      </div>
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {sortedBadges.map(badgeId => {
          const badge = BADGE_DEFINITIONS[badgeId];
          return badge ? (
            <div
              key={badgeId}
              title={`${badge.name}: ${badge.description}`}
              style={{
                fontSize: '24px',
                cursor: 'help',
                transition: 'transform 0.2s'
              }}
            >
              {badge.icon}
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
