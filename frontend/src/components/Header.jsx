import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radar, Activity, FileText, Map, User, Settings, LogOut, Search, Users, Radio, ChevronDown, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import NotificationBell from './NotificationBell';
import { useAuth } from '../App';

const MAIN_NAV = [
  { id: 'signals', label: 'SIGNALS', icon: Activity, path: '/signals' },
  { id: 'contracts', label: 'JOB BOARD', icon: FileText, path: '/contracts' },
  { id: 'lounge', label: 'LOUNGE (LFG)', icon: Radio, path: '/lounge' },
];

const OTHER_TOOLS = [
  { id: 'intel', label: 'Intel', icon: Radar, path: '/intel' },
  { id: 'directory', label: 'Directory', icon: Users, path: '/directory' },
  { id: 'roadmap', label: 'Roadmap', icon: Map, path: '/roadmap' },
];

export const Header = ({ user, onLogout, userShard, onShardClick }) => {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { notificationSettings } = useAuth();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isOtherToolActive = OTHER_TOOLS.some(t => isActive(t.path));

  const getInitials = (handle) => {
    if (!handle) return 'NC';
    return handle.slice(0, 2).toUpperCase();
  };

  return (
    <header className="navcom-header" data-testid="navcom-header">
      <Link to="/" className="navcom-logo" data-testid="navcom-logo">
        <span className="logo-text">NAVCOM</span>
        <span className="logo-subtitle">MISSION ADVISOR</span>
      </Link>

      <nav className="navcom-nav" data-testid="navcom-nav">
        {MAIN_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="nav-icon" size={16} />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
        
        <DropdownMenu open={toolsOpen} onOpenChange={setToolsOpen}>
          <DropdownMenuTrigger asChild>
            <button className={`nav-item tools-trigger ${isOtherToolActive ? 'active' : ''}`} data-testid="nav-other-tools">
              <MoreHorizontal className="nav-icon" size={16} />
              <span className="nav-label">OTHER TOOLS</span>
              <ChevronDown size={12} style={{ marginLeft: 4, opacity: 0.7 }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="navcom-dropdown tools-dropdown" align="start">
            {OTHER_TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem key={item.id} asChild>
                  <Link to={item.path} className={`dropdown-item ${isActive(item.path) ? 'active' : ''}`} data-testid={`nav-${item.id}`}>
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <div className="navcom-avatar-area" data-testid="avatar-area">
        {userShard && (
          <button className="shard-display" onClick={onShardClick} title="Click to change shard">
            <span className="shard-label">SHARD</span>
            <span className="shard-value">{userShard}</span>
          </button>
        )}
        {user && <NotificationBell currentUserId={user.id} notificationSettings={notificationSettings} />}
        {user ? (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="avatar-trigger" data-testid="avatar-trigger">
                <Avatar className={`navcom-avatar ${user.is_supporter ? 'supporter' : ''}`}>
                  <AvatarFallback className="avatar-fallback">
                    {getInitials(user.rsi_handle)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="navcom-dropdown" align="end" data-testid="avatar-dropdown">
              <div className="dropdown-header">
                <span className="dropdown-handle">{user.rsi_handle || 'Pilot'}</span>
                {user.is_supporter && <span className="supporter-badge">SYNDICATE</span>}
              </div>
              <DropdownMenuSeparator className="dropdown-separator" />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="dropdown-item" data-testid="dropdown-profile">
                  <User size={14} />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/search" className="dropdown-item" data-testid="dropdown-search">
                  <Search size={14} />
                  <span>Player Search</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="dropdown-item" data-testid="dropdown-settings">
                  <Settings size={14} />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dropdown-separator" />
              <DropdownMenuItem 
                onClick={onLogout} 
                className="dropdown-item logout"
                data-testid="dropdown-logout"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/login" className="login-link" data-testid="login-link">
            LOGIN
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
