import { Link, useLocation } from 'react-router-dom';
import { Radar, Activity, FileText, Building2, Star } from 'lucide-react';
import { useAuth } from '../App';
import { usePendingRatings } from '../hooks/usePendingRatings';

const NAV_ITEMS = [
  { id: 'contracts', label: 'Jobs', icon: FileText, path: '/contracts' },
  { id: 'signals', label: 'Signals', icon: Activity, path: '/signals' },
  { id: 'ratings', label: 'Ratings', icon: Star, path: '/ratings' },
  { id: 'orgs', label: 'Orgs', icon: Building2, path: '/orgs' },
  { id: 'intel', label: 'Intel', icon: Radar, path: '/intel' },
];

export const MobileNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { count: pendingRatings } = usePendingRatings(Boolean(user));
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="mobile-nav" data-testid="mobile-nav">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.id}
            to={item.path}
            className={`mobile-nav-item ${active ? 'active' : ''}`}
            data-testid={`mobile-nav-${item.id}`}
            style={{ position: 'relative' }}
          >
            <Icon size={20} />
            <span>{item.label}</span>
            {item.id === 'ratings' && pendingRatings > 0 && (
              <span
                data-testid="mobile-nav-ratings-badge"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 'calc(50% - 20px)',
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'var(--nc-gold, #FFD700)',
                  color: '#06131f',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pendingRatings}
              </span>
            )}
          </Link>
        );
      })}

      <style>{`
        .mobile-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(64px + env(safe-area-inset-bottom, 0px));
          background: #020b14;
          border-top: 1px solid var(--nc-border);
          z-index: 1000;
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom, 0);
        }

        @media (max-width: 768px) {
          .mobile-nav {
            display: flex;
            justify-content: space-around;
            align-items: center;
          }
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          min-width: 44px;
          color: var(--nc-text-muted);
          text-decoration: none;
          font-family: var(--nc-font-mono);
          font-size: 10px;
          letter-spacing: 0.5px;
          transition: color 0.2s;
        }

        .mobile-nav-item:hover,
        .mobile-nav-item.active {
          color: var(--nc-cyan);
        }

        .mobile-nav-item.active svg {
          filter: drop-shadow(0 0 6px var(--nc-cyan));
        }
      `}</style>
    </nav>
  );
};

export default MobileNav;
