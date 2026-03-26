import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Palette, Bell, Info, ChevronRight, Check, Radio, Skull, Wifi, Bug, Volume2, VolumeX, FileText, User, Shield } from 'lucide-react';
import { useAuth, API } from '../App';
import axios from 'axios';
import { getSoundEnabled, setSoundEnabled } from '../utils/sounds';

const THEMES = [
  { id: 'default', name: 'MobiGlass', primary: '#00f0ff', description: 'Default NavCom theme' },
  { id: 'scavenger', name: 'Scavenger', primary: '#ff6600', description: 'Industrial orange theme' },
  { id: 'luxury', name: 'Luxury', primary: '#ffffff', description: 'Clean luxury white theme' },
  { id: 'milspec', name: 'MilSpec', primary: '#ff0044', description: 'Military red theme' }
];

const AVATAR_PRESETS = [
  { id: 'pilot', name: 'Pilot', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/qir020ik_pilot.png' },
  { id: 'medic', name: 'Rescue', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/horusbmi_rescue.png' },
  { id: 'pirate', name: 'Pirate', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/gcw4ywaa_pirate.png' },
  { id: 'hauler', name: 'Hauler', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/yjw0cw3r_cargo%20hauler.png' },
  { id: 'miner', name: 'Miner', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/3vgt2etd_mining.png' },
  { id: 'bounty', name: 'Bounty Hunter', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/feh9f09a_bounty%20hunter%20icon.png' },
  { id: 'engineer', name: 'Engineer', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/fkdyhw8p_engineer.png' },
  { id: 'explorer', name: 'Explorer', file: 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/7rceprgl_explorer%20icon.png' },
];

const CONTRACT_TYPES = [
  { id: 'escort', label: 'Escort Missions' },
  { id: 'rescue', label: 'Rescue / Medical' },
  { id: 'transport', label: 'Transport' },
  { id: 'mining', label: 'Mining Support' },
  { id: 'combat', label: 'Combat / Security' }
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUser, tickerSettings, updateTickerSettings, notificationSettings, updateNotificationSettings, userShard, setShard, setShowShardPrompt } = useAuth();
  const [activeSection, setActiveSection] = useState('alerts');
  const [selectedTheme, setSelectedTheme] = useState(user?.theme_id || 'default');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_preset || null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [desktopNotifPermission, setDesktopNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [soundOn, setSoundOn] = useState(getSoundEnabled());
  
  // Redeem code state
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMessage, setRedeemMessage] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const handleSoundToggle = () => {
    const newValue = !soundOn;
    setSoundOn(newValue);
    setSoundEnabled(newValue);
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    try {
      const res = await axios.post(`${API}/redeem-code`, { code: redeemCode });
      setRedeemMessage(res.data.message);
      setRedeemSuccess(res.data.success);
      if (res.data.success) {
        setRedeemCode('');
        updateUser({ supporter_tier: res.data.tier });
      }
    } catch (e) {
      setRedeemMessage('Failed to redeem code');
      setRedeemSuccess(false);
    }
  };

  const requestDesktopPermission = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support desktop notifications');
      return;
    }
    const permission = await Notification.requestPermission();
    setDesktopNotifPermission(permission);
    if (permission === 'granted') {
      // Send a test notification
      new Notification('NavCom Notifications Enabled', {
        body: 'You will now receive desktop alerts for new contracts!',
        tag: 'navcom-test'
      });
    }
  };

  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    updateUser({ theme_id: themeId });
    try {
      await axios.put(`${API}/user/theme`, { theme_id: themeId });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const handleAvatarChange = async (preset) => {
    setSavingAvatar(true);
    try {
      await axios.put(`${API}/user/avatar`, { avatar_preset: preset.id });
      setSelectedAvatar(preset.id);
      updateUser({ avatar_preset: preset.id, avatar_url: preset.file });
    } catch (err) {
      console.error('Failed to save avatar:', err);
    } finally {
      setSavingAvatar(false);
    }
  };

  const toggleContractType = (typeId) => {
    const current = notificationSettings?.contract_types || [];
    const newTypes = current.includes(typeId) 
      ? current.filter(t => t !== typeId)
      : [...current, typeId];
    updateNotificationSettings({ contract_types: newTypes });
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
            className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveSection('notifications')}
          >
            <Bell size={18} />
            <span>Push Notifications</span>
            <ChevronRight size={16} className="nav-arrow" />
          </button>
          <button 
            className={`settings-nav-item ${activeSection === 'avatar' ? 'active' : ''}`}
            onClick={() => setActiveSection('avatar')}
          >
            <User size={18} />
            <span>Avatar</span>
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
            className={`settings-nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            <Info size={18} />
            <span>About</span>
            <ChevronRight size={16} className="nav-arrow" />
          </button>
          
          {/* Admin link - only visible for admin users */}
          {user?.is_admin && (
            <button 
              className="settings-nav-item admin-link"
              onClick={() => navigate('/admin')}
              data-testid="admin-link"
            >
              <Shield size={18} />
              <span>Admin Panel</span>
              <ChevronRight size={16} className="nav-arrow" />
            </button>
          )}
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
                {/* Sound Notifications Toggle */}
                <div className="ticker-toggle-card" style={{ '--ticker-color': '#00ff88' }}>
                  <div className="ticker-toggle-header">
                    {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    <div>
                      <h4>Sound Notifications</h4>
                      <p>Play audio alerts for new notifications</p>
                    </div>
                  </div>
                  <div 
                    className={`toggle-switch ${soundOn ? 'active' : ''}`} 
                    onClick={handleSoundToggle}
                    style={{ '--toggle-color': '#00ff88' }}
                    data-testid="sound-toggle"
                  >
                    <div className="toggle-thumb" />
                  </div>
                </div>

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

          {activeSection === 'avatar' && (
            <div className="settings-section">
              <h2 className="section-title">Profile Avatar</h2>
              <p className="section-description">
                Choose a role-based avatar for your pilot profile. This will be displayed on your identity card and contracts.
              </p>
              
              {user?.avatar_url && !user?.avatar_preset && (
                <div className="current-avatar-notice" style={{ 
                  background: 'rgba(0, 240, 255, 0.1)', 
                  border: '1px solid var(--nc-cyan-dim)', 
                  padding: 16, 
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}>
                  <img src={user.avatar_url} alt="Current avatar" style={{ width: 48, height: 48, borderRadius: 4 }} />
                  <div>
                    <p style={{ color: 'var(--nc-text-primary)', fontSize: 14, marginBottom: 4 }}>RSI Avatar Active</p>
                    <p style={{ color: 'var(--nc-text-muted)', fontSize: 12 }}>Your RSI profile image is currently being used. Select a preset below to override it.</p>
                  </div>
                </div>
              )}
              
              <div className="avatar-grid">
                {AVATAR_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    className={`avatar-preset-card ${selectedAvatar === preset.id || user?.avatar_preset === preset.id ? 'active' : ''}`}
                    onClick={() => handleAvatarChange(preset)}
                    disabled={savingAvatar}
                    data-testid={`avatar-${preset.id}`}
                  >
                    <img src={preset.file} alt={preset.name} className="avatar-preset-img" />
                    <span className="avatar-preset-name">{preset.name}</span>
                    {(selectedAvatar === preset.id || user?.avatar_preset === preset.id) && (
                      <Check size={14} className="avatar-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'theme' && (
            <div className="settings-section">
              <h2 className="section-title">Theme Selection</h2>
              <p className="section-description">
                Choose your preferred visual theme for the NavCom interface.
              </p>
              <div className="theme-grid">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    className={`theme-card ${selectedTheme === theme.id ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme.id)}
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
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2 className="section-title">Push Notifications</h2>
              <p className="section-description">
                Control real-time notifications from NavCom via WebSocket.
              </p>
              
              {/* Sound Toggle */}
              <div className="notification-options">
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">
                      {notificationSettings?.sound_enabled ? <Volume2 size={16} style={{ marginRight: 8 }} /> : <VolumeX size={16} style={{ marginRight: 8 }} />}
                      Notification Sound
                    </span>
                    <span className="option-desc">Play alert sound when notifications arrive</span>
                  </div>
                  <div 
                    className={`toggle-switch ${notificationSettings?.sound_enabled ? 'active' : ''}`} 
                    onClick={() => updateNotificationSettings({ sound_enabled: !notificationSettings?.sound_enabled })}
                    data-testid="sound-toggle"
                  >
                    <div className="toggle-thumb" />
                  </div>
                </label>
              </div>

              {/* Desktop Notifications */}
              <h3 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 14, color: 'var(--nc-text-primary)', marginTop: 24, marginBottom: 16 }}>
                Desktop Notifications
              </h3>
              <div className="desktop-notif-section" style={{ 
                background: 'var(--nc-bg-secondary)', 
                border: '1px solid var(--nc-border)', 
                padding: 16,
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Bell size={16} />
                      <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 14 }}>Browser Push Notifications</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--nc-text-muted)' }}>
                      Receive alerts even when NavCom is in the background
                    </span>
                  </div>
                  {desktopNotifPermission === 'granted' ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      color: 'var(--nc-green)', 
                      fontFamily: 'var(--nc-font-mono)', 
                      fontSize: 11 
                    }}>
                      <Check size={14} /> ENABLED
                    </div>
                  ) : desktopNotifPermission === 'denied' ? (
                    <div style={{ 
                      color: 'var(--nc-red)', 
                      fontFamily: 'var(--nc-font-mono)', 
                      fontSize: 11 
                    }}>
                      BLOCKED (check browser settings)
                    </div>
                  ) : (
                    <button 
                      className="nc-btn nc-btn-primary" 
                      onClick={requestDesktopPermission}
                      style={{ padding: '8px 16px', fontSize: 12 }}
                      data-testid="enable-desktop-notif"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>

              {/* Alert Types Section */}
              <h3 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 14, color: 'var(--nc-text-primary)', marginTop: 24, marginBottom: 16 }}>
                Alert Types
              </h3>
              <div className="notification-options">
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">Threat Alerts</span>
                    <span className="option-desc">PvP and pirate activity notifications</span>
                  </div>
                  <div 
                    className={`toggle-switch ${notificationSettings?.threat_alerts ? 'active' : ''}`} 
                    onClick={() => updateNotificationSettings({ threat_alerts: !notificationSettings?.threat_alerts })}
                    data-testid="threat-alerts-toggle"
                  >
                    <div className="toggle-thumb" />
                  </div>
                </label>
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">Stability Alerts</span>
                    <span className="option-desc">Lag, desync, and 30K disconnect reports</span>
                  </div>
                  <div 
                    className={`toggle-switch ${notificationSettings?.stability_alerts ? 'active' : ''}`} 
                    onClick={() => updateNotificationSettings({ stability_alerts: !notificationSettings?.stability_alerts })}
                    data-testid="stability-alerts-toggle"
                  >
                    <div className="toggle-thumb" />
                  </div>
                </label>
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">Issue Alerts</span>
                    <span className="option-desc">Mission bugs and cargo elevator issues</span>
                  </div>
                  <div 
                    className={`toggle-switch ${notificationSettings?.issue_alerts ? 'active' : ''}`} 
                    onClick={() => updateNotificationSettings({ issue_alerts: !notificationSettings?.issue_alerts })}
                    data-testid="issue-alerts-toggle"
                  >
                    <div className="toggle-thumb" />
                  </div>
                </label>
              </div>

              {/* Contract Notifications Section */}
              <h3 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 14, color: 'var(--nc-text-primary)', marginTop: 24, marginBottom: 16 }}>
                Contract Notifications
              </h3>
              <div className="notification-options">
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">
                      <FileText size={16} style={{ marginRight: 8 }} />
                      Contract Alerts
                    </span>
                    <span className="option-desc">Get notified about new contracts</span>
                  </div>
                  <div 
                    className={`toggle-switch ${notificationSettings?.contract_alerts ? 'active' : ''}`} 
                    onClick={() => updateNotificationSettings({ contract_alerts: !notificationSettings?.contract_alerts })}
                    data-testid="contract-alerts-toggle"
                  >
                    <div className="toggle-thumb" />
                  </div>
                </label>
              </div>
              
              {notificationSettings?.contract_alerts && (
                <div className="contract-type-filters" style={{ marginTop: 16, paddingLeft: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--nc-text-muted)', marginBottom: 12 }}>Filter by contract type:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CONTRACT_TYPES.map(type => (
                      <button
                        key={type.id}
                        className={`nc-btn ${notificationSettings?.contract_types?.includes(type.id) ? 'nc-btn-primary' : 'nc-btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => toggleContractType(type.id)}
                        data-testid={`contract-filter-${type.id}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                
                {/* Mission Statement - matching AboutModal */}
                <div style={{ background: 'var(--nc-bg-secondary)', padding: 20, border: '1px solid var(--nc-border)', marginBottom: 24, marginTop: 24 }}>
                  <h3 style={{ color: 'var(--nc-cyan)', fontSize: 14, marginBottom: 12, letterSpacing: 1 }}>// MISSION_STATEMENT</h3>
                  <p style={{ color: 'var(--nc-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                    NavCom is a <span style={{ color: 'var(--nc-cyan)' }}>free</span>, community-built tool for Star Citizen players. 
                    We're here to help you find crews, coordinate missions, and stay informed about the 'verse.
                  </p>
                </div>

                {/* What NavCom Offers */}
                <div style={{ background: 'var(--nc-bg-secondary)', padding: 20, border: '1px solid var(--nc-border)', marginBottom: 24 }}>
                  <h3 style={{ color: 'var(--nc-cyan)', fontSize: 14, marginBottom: 16, letterSpacing: 1 }}>// FEATURES</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Contract Board</strong> - Post and find player-to-player jobs
                    </li>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Intel Network</strong> - Mission planning based on your ship and playtime
                    </li>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Signals</strong> - Real-time community reports on piracy, bugs, and hot zones
                    </li>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Reputation System</strong> - Build trust in the community with ratings
                    </li>
                  </ul>
                </div>

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
                {/* Community Badge */}
                <div className="community-badge-footer" style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                  <img 
                    src="https://customer-assets.emergentagent.com/job_space-contracts/artifacts/cs2lc5r9_ola6jl4j_MadeByTheCommunity_White.png" 
                    alt="Made by the Community" 
                    style={{ height: 40, opacity: 0.7 }}
                  />
                </div>
                
                {/* Redemption Code Section */}
                <div className="redeem-section" style={{ marginTop: 32, padding: '20px', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid var(--nc-border)' }}>
                  <h3 style={{ color: 'var(--nc-cyan)', fontSize: 14, marginBottom: 8, letterSpacing: 1 }}>// SUPPORTER_CODE</h3>
                  <p style={{ color: 'var(--nc-text-secondary)', fontSize: 13, marginBottom: 16 }}>
                    Have a supporter code? Enter it below to unlock your badge.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      type="text"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      placeholder="Enter redemption code"
                      data-testid="redeem-code-input"
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'var(--nc-bg-secondary)',
                        border: '1px solid var(--nc-border)',
                        color: 'var(--nc-text-primary)',
                        fontFamily: 'var(--nc-font-body)',
                        fontSize: 14
                      }}
                    />
                    <button
                      onClick={handleRedeemCode}
                      data-testid="redeem-code-btn"
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.1))',
                        border: '1px solid var(--nc-cyan)',
                        color: 'var(--nc-cyan)',
                        fontFamily: 'var(--nc-font-display)',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      REDEEM
                    </button>
                  </div>
                  {redeemMessage && (
                    <p style={{ 
                      marginTop: 12, 
                      fontSize: 13, 
                      color: redeemSuccess ? '#00ff88' : '#ff4466' 
                    }}>
                      {redeemMessage}
                    </p>
                  )}
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
        
        .settings-nav-item.admin-link {
          margin-top: 16px;
          border-top: 1px solid var(--nc-border);
          padding-top: 20px;
          color: var(--nc-gold, #ffd700);
        }
        
        .settings-nav-item.admin-link:hover {
          background: rgba(255, 215, 0, 0.1);
          color: var(--nc-gold, #ffd700);
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
        
        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
        }
        
        .avatar-preset-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 12px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        .avatar-preset-card:hover {
          border-color: var(--nc-cyan-dim);
        }
        
        .avatar-preset-card.active {
          border-color: var(--nc-cyan);
          background: rgba(0, 240, 255, 0.1);
        }
        
        .avatar-preset-img {
          width: 56px;
          height: 56px;
        }
        
        .avatar-preset-name {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          text-align: center;
          letter-spacing: 0.5px;
        }
        
        .avatar-preset-card.active .avatar-preset-name {
          color: var(--nc-cyan);
        }
        
        .avatar-check {
          position: absolute;
          top: 6px;
          right: 6px;
          color: var(--nc-cyan);
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
