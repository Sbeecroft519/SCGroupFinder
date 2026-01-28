import { useState } from 'react';
import { Settings as SettingsIcon, Palette, Bell, Info, ChevronRight, Check, Radio, Skull, Wifi, Bug } from 'lucide-react';
import { useAuth } from '../App';

const THEMES = [
  { id: 'default', name: 'MobiGlass', primary: '#00f0ff', description: 'Default NavCom theme' },
  { id: 'drake', name: 'Drake Interplanetary', primary: '#ff6600', description: 'Industrial orange theme' },
  { id: 'origin', name: 'Origin Jumpworks', primary: '#ffffff', description: 'Clean luxury white theme' },
  { id: 'aegis', name: 'Aegis Dynamics', primary: '#ff0044', description: 'Military red theme' }
];

export default function Settings() {
  const { user, updateUser, tickerSettings, updateTickerSettings, userShard, setShard, setShowShardPrompt } = useAuth();
  const [activeSection, setActiveSection] = useState('alerts');
  const [selectedTheme, setSelectedTheme] = useState(user?.theme_id || 'default');
  const [notifications, setNotifications] = useState({
    contracts: true,
    reports: true,
    goals: false
  });

  const handleThemeChange = (themeId) => {
    setSelectedTheme(themeId);
    updateUser({ theme_id: themeId });
    // In real app, would also update CSS variables
  };

  return (
    <div className="navcom-page" data-testid="settings-page">
      <div className="page-header">
        <div className="page-label">// CONFIGURATION</div>
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <button 
            className={`settings-nav-item ${activeSection === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveSection('alerts')}
          >
            <Radio size={18} />
            <span>Alert Tickers</span>
            <ChevronRight size={16} className="nav-arrow" />
          </button>
          <button 
            className={`settings-nav-item ${activeSection === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveSection('theme')}
          >
            <Palette size={18} />
            <span>Theme</span>
            <ChevronRight size={16} className="nav-arrow" />
          </button>
          <button 
            className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveSection('notifications')}
          >
            <Bell size={18} />
            <span>Notifications</span>
            <ChevronRight size={16} className="nav-arrow" />
          </button>
          <button 
            className={`settings-nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            <Info size={18} />
            <span>About</span>
            <ChevronRight size={16} className="nav-arrow" />
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {activeSection === 'alerts' && (
            <div className="settings-section">
              <h2 className="section-title">Alert Ticker Settings</h2>
              <p className="section-description">
                Control which alert tickers appear at the top of your screen. Alerts are filtered to your current shard.
              </p>
              
              {/* Shard Setting */}
              <div className="shard-setting">
                <div className="shard-setting-info">
                  <h3>Current Shard</h3>
                  <p>You are currently viewing alerts for:</p>
                  <div className="current-shard-display">
                    {userShard ? (
                      <>
                        <span className="shard-number">{userShard}</span>
                        <button className="nc-btn nc-btn-secondary" onClick={() => setShowShardPrompt(true)} style={{ padding: '8px 16px' }}>
                          Change
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="shard-global">GLOBAL (All Shards)</span>
                        <button className="nc-btn nc-btn-primary" onClick={() => setShowShardPrompt(true)} style={{ padding: '8px 16px' }}>
                          Set Shard
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticker Toggles */}
              <div className="ticker-toggles">
                <div className="ticker-toggle-card" style={{ '--ticker-color': '#ff3366' }}>
                  <div className="ticker-toggle-header">
                    <Skull size={20} />
                    <div>
                      <h4>PvP & Pirate Alerts</h4>
                      <p>Live reports of hostile player activity</p>
                    </div>
                  </div>
                  <div 
                    className={`toggle-switch ${tickerSettings?.threats ? 'active' : ''}`} 
                    onClick={() => updateTickerSettings('threats', !tickerSettings?.threats)}
                    style={{ '--toggle-color': '#ff3366' }}
                  >
                    <div className="toggle-thumb" />
                  </div>
                </div>

                <div className="ticker-toggle-card" style={{ '--ticker-color': '#ffcc00' }}>
                  <div className="ticker-toggle-header">
                    <Wifi size={20} />
                    <div>
                      <h4>Stability Alerts</h4>
                      <p>Lag, desync, and 30K disconnect reports</p>
                    </div>
                  </div>
                  <div 
                    className={`toggle-switch ${tickerSettings?.stability ? 'active' : ''}`} 
                    onClick={() => updateTickerSettings('stability', !tickerSettings?.stability)}
                    style={{ '--toggle-color': '#ffcc00' }}
                  >
                    <div className="toggle-thumb" />
                  </div>
                </div>

                <div className="ticker-toggle-card" style={{ '--ticker-color': '#00f0ff' }}>
                  <div className="ticker-toggle-header">
                    <Bug size={20} />
                    <div>
                      <h4>Bug & Issue Alerts</h4>
                      <p>Mission bugs and cargo elevator issues</p>
                    </div>
                  </div>
                  <div 
                    className={`toggle-switch ${tickerSettings?.issues ? 'active' : ''}`} 
                    onClick={() => updateTickerSettings('issues', !tickerSettings?.issues)}
                    style={{ '--toggle-color': '#00f0ff' }}
                  >
                    <div className="toggle-thumb" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'theme' && (
            <div className="settings-section">
              <h2 className="section-title">Theme Selection</h2>
              <p className="section-description">
                Choose your preferred visual theme. Supporter themes coming soon!
              </p>
              <div className="theme-grid">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    className={`theme-card ${selectedTheme === theme.id ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme.id)}
                    disabled={theme.id !== 'default'}
                    data-testid={`theme-${theme.id}`}
                  >
                    <div 
                      className="theme-preview" 
                      style={{ borderColor: theme.primary }}
                    >
                      <div 
                        className="theme-color" 
                        style={{ background: theme.primary }}
                      />
                    </div>
                    <div className="theme-info">
                      <span className="theme-name">{theme.name}</span>
                      <span className="theme-desc">{theme.description}</span>
                    </div>
                    {selectedTheme === theme.id && (
                      <Check size={18} className="theme-check" />
                    )}
                    {theme.id !== 'default' && (
                      <span className="theme-locked">COMING SOON</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2 className="section-title">Notification Preferences</h2>
              <p className="section-description">
                Control what notifications you receive from NavCom.
              </p>
              <div className="notification-options">
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">Contract Updates</span>
                    <span className="option-desc">Get notified about new contracts matching your preferences</span>
                  </div>
                  <div className={`toggle-switch ${notifications.contracts ? 'active' : ''}`} onClick={() => setNotifications(prev => ({ ...prev, contracts: !prev.contracts }))}>
                    <div className="toggle-thumb" />
                  </div>
                </label>
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">Incident Reports</span>
                    <span className="option-desc">Alerts when issues are reported in your system</span>
                  </div>
                  <div className={`toggle-switch ${notifications.reports ? 'active' : ''}`} onClick={() => setNotifications(prev => ({ ...prev, reports: !prev.reports }))}>
                    <div className="toggle-thumb" />
                  </div>
                </label>
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">Roadmap Updates</span>
                    <span className="option-desc">News about feature progress and releases</span>
                  </div>
                  <div className={`toggle-switch ${notifications.goals ? 'active' : ''}`} onClick={() => setNotifications(prev => ({ ...prev, goals: !prev.goals }))}>
                    <div className="toggle-thumb" />
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="settings-section">
              <h2 className="section-title">About NavCom</h2>
              <div className="about-content">
                <div className="about-logo">
                  <span className="logo-text" style={{ fontSize: 32 }}>NAVCOM</span>
                  <span className="logo-subtitle">MISSION ADVISOR</span>
                </div>
                <p className="about-version">Version 2.0.0-beta</p>
                <p className="about-description">
                  NavCom is a tactical companion application for Star Citizen pilots. 
                  Get mission recommendations, track server health, connect with other 
                  players for contracts, and support feature development.
                </p>
                <div className="about-credits">
                  <h3 className="credits-title">CREDITS</h3>
                  <ul className="credits-list">
                    <li>Development: NavCom Team</li>
                    <li>Data: UEX Corp API</li>
                    <li>Status: RSI Official</li>
                  </ul>
                </div>
                <div className="about-legal">
                  <p className="legal-text">
                    This is an unofficial fan project. Star Citizen®, Squadron 42®, 
                    and Roberts Space Industries® are registered trademarks of 
                    Cloud Imperium Rights LLC.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .settings-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
        }
        
        .settings-sidebar {
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          padding: 8px;
        }
        
        .settings-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          background: none;
          border: none;
          color: var(--nc-text-secondary);
          font-family: var(--nc-font-body);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .settings-nav-item:hover {
          background: var(--nc-bg-secondary);
          color: var(--nc-text-primary);
        }
        
        .settings-nav-item.active {
          background: rgba(0, 240, 255, 0.1);
          color: var(--nc-cyan);
        }
        
        .nav-arrow {
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .settings-nav-item.active .nav-arrow {
          opacity: 1;
        }
        
        .settings-content {
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          padding: 24px;
        }
        
        .section-title {
          font-family: var(--nc-font-display);
          font-size: 18px;
          color: var(--nc-text-primary);
          margin-bottom: 8px;
        }
        
        .section-description {
          font-family: var(--nc-font-body);
          font-size: 14px;
          color: var(--nc-text-muted);
          margin-bottom: 24px;
        }
        
        .shard-setting {
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          padding: 20px;
          margin-bottom: 24px;
        }
        
        .shard-setting h3 {
          font-family: var(--nc-font-display);
          font-size: 14px;
          color: var(--nc-text-primary);
          margin-bottom: 8px;
        }
        
        .shard-setting p {
          font-family: var(--nc-font-body);
          font-size: 13px;
          color: var(--nc-text-muted);
          margin-bottom: 12px;
        }
        
        .current-shard-display {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .shard-number {
          font-family: var(--nc-font-display);
          font-size: 28px;
          color: var(--nc-cyan);
          letter-spacing: 2px;
        }
        
        .shard-global {
          font-family: var(--nc-font-mono);
          font-size: 14px;
          color: var(--nc-orange);
          letter-spacing: 1px;
        }
        
        .ticker-toggles {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .ticker-toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          border-left: 3px solid var(--ticker-color, var(--nc-cyan));
        }
        
        .ticker-toggle-header {
          display: flex;
          align-items: center;
          gap: 14px;
          color: var(--ticker-color, var(--nc-cyan));
        }
        
        .ticker-toggle-header h4 {
          font-family: var(--nc-font-display);
          font-size: 14px;
          color: var(--nc-text-primary);
          margin-bottom: 4px;
        }
        
        .ticker-toggle-header p {
          font-family: var(--nc-font-body);
          font-size: 12px;
          color: var(--nc-text-muted);
        }
        
        .theme-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .theme-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        .theme-card:hover:not(:disabled) {
          border-color: var(--nc-cyan-dim);
        }
        
        .theme-card.active {
          border-color: var(--nc-cyan);
        }
        
        .theme-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .theme-preview {
          width: 48px;
          height: 48px;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--nc-bg-primary);
        }
        
        .theme-color {
          width: 24px;
          height: 24px;
        }
        
        .theme-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .theme-name {
          font-family: var(--nc-font-display);
          font-size: 14px;
          color: var(--nc-text-primary);
        }
        
        .theme-desc {
          font-family: var(--nc-font-body);
          font-size: 12px;
          color: var(--nc-text-muted);
        }
        
        .theme-check {
          color: var(--nc-cyan);
        }
        
        .theme-locked {
          position: absolute;
          top: 8px;
          right: 8px;
          font-family: var(--nc-font-mono);
          font-size: 9px;
          color: var(--nc-text-muted);
          background: var(--nc-bg-primary);
          padding: 2px 6px;
          letter-spacing: 1px;
        }
        
        .notification-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .notification-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          cursor: pointer;
        }
        
        .option-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .option-name {
          font-family: var(--nc-font-display);
          font-size: 14px;
          color: var(--nc-text-primary);
        }
        
        .option-desc {
          font-family: var(--nc-font-body);
          font-size: 12px;
          color: var(--nc-text-muted);
        }
        
        .toggle-switch {
          width: 48px;
          height: 24px;
          background: var(--nc-bg-primary);
          border: 1px solid var(--nc-border);
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .toggle-switch.active {
          background: color-mix(in srgb, var(--toggle-color, var(--nc-cyan)) 20%, transparent);
          border-color: var(--toggle-color, var(--nc-cyan));
        }
        
        .toggle-thumb {
          width: 18px;
          height: 18px;
          background: var(--nc-text-muted);
          position: absolute;
          top: 2px;
          left: 2px;
          transition: all 0.2s;
        }
        
        .toggle-switch.active .toggle-thumb {
          left: 26px;
          background: var(--toggle-color, var(--nc-cyan));
        }
        
        .about-content {
          text-align: center;
          padding: 24px 0;
        }
        
        .about-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .about-version {
          font-family: var(--nc-font-mono);
          font-size: 12px;
          color: var(--nc-text-muted);
          margin-bottom: 24px;
        }
        
        .about-description {
          font-family: var(--nc-font-body);
          font-size: 14px;
          color: var(--nc-text-secondary);
          max-width: 500px;
          margin: 0 auto 32px;
          line-height: 1.6;
        }
        
        .about-credits {
          text-align: left;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          padding: 16px;
          margin-bottom: 24px;
        }
        
        .credits-title {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          letter-spacing: 2px;
          margin-bottom: 12px;
        }
        
        .credits-list {
          list-style: none;
          font-family: var(--nc-font-body);
          font-size: 13px;
          color: var(--nc-text-secondary);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .about-legal {
          padding: 16px;
          border-top: 1px solid var(--nc-border);
        }
        
        .legal-text {
          font-family: var(--nc-font-body);
          font-size: 11px;
          color: var(--nc-text-muted);
          line-height: 1.5;
        }
        
        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }
          
          .settings-sidebar {
            display: flex;
            overflow-x: auto;
            padding: 4px;
          }
          
          .settings-nav-item {
            flex-shrink: 0;
            padding: 10px 16px;
          }
          
          .nav-arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
