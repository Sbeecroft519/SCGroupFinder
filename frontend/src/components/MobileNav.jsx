import { Link, useLocation } from 'react-router-dom';
import { Radar, Activity, FileText, Map, Users } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'intel', label: 'Intel', icon: Radar, path: '/intel' },
  { id: 'signals', label: 'Signals', icon: Activity, path: '/signals' },
  { id: 'contracts', label: 'Jobs', icon: FileText, path: '/contracts' },
  { id: 'directory', label: 'Directory', icon: Users, path: '/directory' },
  { id: 'roadmap', label: 'Roadmap', icon: Map, path: '/roadmap' },
];

export const MobileNav = () => {
  const location = useLocation();
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
          >
            <Icon size={20} />
            <span>{item.label}</span>
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
          height: 64px;
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
          padding: 8px 12px;
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
