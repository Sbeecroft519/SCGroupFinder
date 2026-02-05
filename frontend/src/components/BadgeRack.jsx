import { BADGE_DEFINITIONS } from '../constants/badges';

const getSupporterIcon = (tier) => {
  switch (tier) {
    case 'BRONZE': return '🪙';
    case 'SILVER': return '🛡️';
    case 'GOLD': return '🏆';
    default: return null;
  }
};

const getSupporterLabel = (tier) => {
  switch (tier) {
    case 'BRONZE': return 'Contributor';
    case 'SILVER': return 'Sponsor';
    case 'GOLD': return 'Patron';
    default: return null;
  }
};

const getSupporterBadgeStyle = (tier) => {
  const base = { fontSize: '28px', marginRight: '12px', cursor: 'help' };
  
  switch (tier) {
    case 'BRONZE':
      return {
        ...base,
        color: '#CD7F32',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
      };
    case 'SILVER':
      return {
        ...base,
        color: '#C0C0C0',
        textShadow: '0 0 5px rgba(192, 192, 192, 0.8), 0 0 10px rgba(192, 192, 192, 0.5), 1px 1px 2px rgba(255, 255, 255, 0.8)'
      };
    case 'GOLD':
      return {
        ...base,
        color: '#FFD700',
        animation: 'gold-pulse 2s ease-in-out infinite'
      };
    default:
      return null;
  }
};

export default function BadgeRack({ supporterTier = 'NONE', badges = [] }) {
  // Filter out old supporter badges from the badges array (we use supporterTier now)
  const gameplayBadges = (badges || []).filter(b => !b.startsWith('SUPPORTER_'));
  
  // Don't render if no supporter tier AND no gameplay badges
  if (supporterTier === 'NONE' && gameplayBadges.length === 0) {
    return null;
  }

  const sortedBadges = [...gameplayBadges].sort((a, b) => {
    const order = { SPECIALIST: 0, MILESTONE: 1 };
    const catA = BADGE_DEFINITIONS[a]?.category || 'MILESTONE';
    const catB = BADGE_DEFINITIONS[b]?.category || 'MILESTONE';
    return (order[catA] || 2) - (order[catB] || 2);
  });

  return (
    <div style={{
      background: 'rgba(2, 11, 20, 0.9)',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      padding: '15px 20px',
      marginBottom: '20px',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
    }}>
      <style>{`
        @keyframes gold-pulse {
          0%, 100% {
            text-shadow: 
              0 0 5px rgba(255, 215, 0, 0.8),
              0 0 10px rgba(255, 215, 0, 0.5);
          }
          50% {
            text-shadow: 
              0 0 10px rgba(255, 215, 0, 1),
              0 0 20px rgba(255, 215, 0, 0.8),
              0 0 30px rgba(255, 215, 0, 0.5);
          }
        }
      `}</style>
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
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Supporter Badge - ALWAYS FIRST */}
        {supporterTier && supporterTier !== 'NONE' && (
          <div
            title={getSupporterLabel(supporterTier)}
            style={getSupporterBadgeStyle(supporterTier)}
          >
            {getSupporterIcon(supporterTier)}
          </div>
        )}
        
        {/* Gameplay Badges */}
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
