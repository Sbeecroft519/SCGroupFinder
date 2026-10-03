import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Palette, Bell, Info, ChevronRight, Check, Radio, Skull, Wifi, Bug, Volume2, VolumeX, FileText, User, Shield, Building2 } from 'lucide-react';
import { useAuth, API } from '../App';
import axios from 'axios';
import { isSoundEnabled } from '../utils/sounds';
import { PushNotificationSettings } from '../components/PushNotificationSettings';
import { AffiliationRegion } from '../components/settings/AffiliationRegion';

const THEMES = [
  { id: 'default', name: 'MobiGlass', primary: '#00f0ff', description: 'Default MobiGlass theme' },
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
  const { user, updateUser, tickerSettings, updateTickerSettings, notificationSettings, updateNotificationSettings, userShard, setShard, setShowShardPrompt, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('alerts');
  const [selectedTheme, setSelectedTheme] = useState(user?.theme_id || 'default');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_preset || null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [popupsEnabled, setPopupsEnabled] = useState(
    localStorage.getItem('navcom_popups_enabled') !== 'false'
  );
  
  // Redeem code state
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMessage, setRedeemMessage] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  // Delete account state
  const [deleteStep, setDeleteStep] = useState(0); // 0=none, 1=confirm, 2=type DELETE
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/user/account`, { data: { confirmation: 'DELETE' } });
      logout();
      navigate('/login');
    } catch (e) {
      alert('Failed to delete account');
      setDeleting(false);
    }
  };

  const handleSoundToggle = () => {
    const newValue = !soundOn;
    setSoundOn(newValue);
    localStorage.setItem('navcom_sound_enabled', newValue ? 'true' : 'false');
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
            className={`settings-nav-item ${activeSection === 'affiliation' ? 'active' : ''}`}
            onClick={() => setActiveSection('affiliation')}
            data-testid="settings-nav-affiliation"
          >
            <Building2 size={18} />
            <span>Affiliation &amp; Region</span>
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

          <div style={{ borderTop: '1px solid var(--nc-border)', margin: '12px 0' }} />
          
          <button 
            className={`settings-nav-item ${activeSection === 'account' ? 'active' : ''}`}
            onClick={() => setActiveSection('account')}
            style={{ color: 'var(--nc-red)' }}
          >
            <Skull size={18} />
            <span>Danger Zone</span>
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
                Control which alert tickers appear at the top of your screen. Alerts are filtered to your current server region.
              </p>
              
              {/* Region Setting */}
              <div className="shard-setting">
                <div className="shard-setting-info">
                  <h3>Current Server Region</h3>
                  <p>You are currently viewing alerts for:</p>
                  <div className="current-shard-display">
                    {userShard ? (
                      <>
                        <span className="shard-number" data-testid="current-region-value">{userShard}</span>
                        <button className="nc-btn nc-btn-secondary" onClick={() => setShowShardPrompt(true)} style={{ padding: '8px 16px' }} data-testid="change-region-btn">
                          Change
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="shard-global">GLOBAL (All Regions)</span>
                        <button className="nc-btn nc-btn-primary" onClick={() => setShowShardPrompt(true)} style={{ padding: '8px 16px' }} data-testid="set-region-btn">
                          Set Region
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

          {activeSection === 'affiliation' && (
            <div className="settings-section" data-testid="settings-section-affiliation">
              <h2 className="section-title">Affiliation &amp; Region</h2>
              <p className="section-description">
                Show the org you fly with, and set the server region you play on.
              </p>
              <AffiliationRegion />
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
                Choose your preferred visual theme for the SC Group Finder interface.
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
                Control real-time notifications from SC Group Finder via WebSocket.
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

              <PushNotificationSettings />
              <label className="notification-option">
                <span className="option-info" data-testid="foreground-popup-label">In-app browser popups</span>
                <button type="button" role="switch" aria-checked={popupsEnabled}
                  className={`toggle-switch ${popupsEnabled ? 'active' : ''}`}
                  data-testid="popup-notif-toggle"
                  onClick={() => { const value = !popupsEnabled; setPopupsEnabled(value); localStorage.setItem('navcom_popups_enabled', String(value)); }}>
                  <span className="toggle-thumb" />
                </button>
              </label>
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

              {/* Email Preferences Section */}
              <h3 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 14, color: 'var(--nc-text-primary)', marginTop: 24, marginBottom: 16 }}>
                Email Preferences
              </h3>
              <div className="notification-options">
                <label className="notification-option">
                  <div className="option-info">
                    <span className="option-name">📧 Contact me about app updates</span>
                    <span className="option-desc">
                      Opt in to occasional emails about major SC Group Finder changes, new features, and announcements. You can opt out any time.
                    </span>
                  </div>
                  <div
                    className={`toggle-switch ${user?.contact_opt_in ? 'active' : ''}`}
                    onClick={async () => {
                      try {
                        const next = !user?.contact_opt_in;
                        await axios.put(`${API}/user/contact-opt-in`, { contact_opt_in: next });
                        updateUser({ contact_opt_in: next });
                      } catch (e) {
                        alert('Failed to update email preference');
                      }
                    }}
                    data-testid="contact-opt-in-toggle"
                  >
                    <div className="toggle-thumb" />
                  </div>
                </label>

                {user?.discord_linked && (
                  <label className="notification-option" data-testid="discord-visibility-row">
                    <div className="option-info">
                      <span className="option-name">💬 Show my Discord username publicly</span>
                      <span className="option-desc">
                        A small Discord icon always appears next to your handle so others know you signed up with Discord. Turn this on to also reveal your Discord username <strong style={{ color: 'var(--nc-cyan)' }}>{user?.discord_username || ''}</strong> — a single click will let other pilots copy it and add you as a friend in Discord.
                      </span>
                    </div>
                    <div
                      className={`toggle-switch ${user?.discord_public ? 'active' : ''}`}
                      onClick={async () => {
                        try {
                          const next = !user?.discord_public;
                          await axios.put(`${API}/user/discord-visibility`, { discord_public: next });
                          updateUser({ discord_public: next });
                        } catch (e) {
                          alert('Failed to update Discord visibility');
                        }
                      }}
                      data-testid="discord-visibility-toggle"
                    >
                      <div className="toggle-thumb" />
                    </div>
                  </label>
                )}
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
              <h2 className="section-title">About SC Group Finder</h2>
              <div className="about-content">
                <div className="about-logo">
                  <span className="logo-text" style={{ fontSize: 32 }}>SC GROUP FINDER</span>
                  <span className="logo-subtitle">PLAYER CONTRACT BOARD</span>
                </div>
                <p className="about-version">Version 2.0.0-beta</p>
                
                {/* Mission Statement - matching AboutModal */}
                <div style={{ background: 'var(--nc-bg-secondary)', padding: 20, border: '1px solid var(--nc-border)', marginBottom: 24, marginTop: 24 }}>
                  <h3 style={{ color: 'var(--nc-cyan)', fontSize: 14, marginBottom: 12, letterSpacing: 1 }}>// MISSION_STATEMENT</h3>
                  <p style={{ color: 'var(--nc-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                    SC Group Finder is a <span style={{ color: 'var(--nc-cyan)' }}>free</span>, community-built tool for Star Citizen players.
                    Find crews, post jobs, and pick teammates based on reputation — no more Global chat roulette.
                  </p>
                </div>

                {/* What SC Group Finder Offers */}
                <div style={{ background: 'var(--nc-bg-secondary)', padding: 20, border: '1px solid var(--nc-border)', marginBottom: 24 }}>
                  <h3 style={{ color: 'var(--nc-cyan)', fontSize: 14, marginBottom: 16, letterSpacing: 1 }}>// FEATURES</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Job & Group Board</strong> - Post, apply, review applicants, crew up
                    </li>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Two-Way Reputation</strong> - Build trust with ratings and reviews
                    </li>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Signals</strong> - Region-based reports on piracy, bugs, and hot zones
                    </li>
                    <li style={{ color: 'var(--nc-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: '#00ff88', marginRight: 8 }}>✓</span>
                      <strong style={{ color: 'var(--nc-text-primary)' }}>Intel</strong> - Mission planning based on your ship and playtime
                    </li>
                  </ul>
                </div>

                <div className="about-credits">
                  <h3 className="credits-title">CREDITS</h3>
                  <ul className="credits-list">
                    <li>Development: Mowri</li>
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

          {activeSection === 'account' && (
            <div className="settings-section">
              <h2 className="section-title" style={{ color: 'var(--nc-red)' }}>Danger Zone</h2>
              <p className="section-description">
                Irreversible account actions. Proceed with caution.
              </p>

              <div className="nc-card" style={{ border: '1px solid var(--nc-red)', background: 'rgba(255, 0, 68, 0.05)' }}>
                <h3 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16, color: 'var(--nc-red)', marginBottom: 12 }}>
                  DELETE ACCOUNT
                </h3>
                <p style={{ color: 'var(--nc-text-secondary)', fontSize: 14, marginBottom: 16 }}>
                  Permanently delete your account and all associated data including contracts, bids, and reports. This action cannot be undone.
                </p>

                {deleteStep === 0 && (
                  <button
                    onClick={() => setDeleteStep(1)}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: '1px solid var(--nc-red)',
                      color: 'var(--nc-red)',
                      fontFamily: 'var(--nc-font-display)',
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    DELETE MY ACCOUNT
                  </button>
                )}

                {deleteStep === 1 && (
                  <div>
                    <p style={{ color: 'var(--nc-red)', fontSize: 14, marginBottom: 12 }}>
                      Are you sure? This will permanently delete all your data.
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => setDeleteStep(2)}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--nc-red)',
                          border: 'none',
                          color: '#fff',
                          fontFamily: 'var(--nc-font-display)',
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        YES, DELETE
                      </button>
                      <button
                        onClick={() => setDeleteStep(0)}
                        style={{
                          padding: '10px 20px',
                          background: 'transparent',
                          border: '1px solid var(--nc-border)',
                          color: 'var(--nc-text-secondary)',
                          fontFamily: 'var(--nc-font-display)',
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}

                {deleteStep === 2 && (
                  <div>
                    <p style={{ color: 'var(--nc-red)', fontSize: 14, marginBottom: 12 }}>
                      Type <strong>DELETE</strong> to confirm:
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE"
                        style={{
                          padding: '10px 16px',
                          background: 'var(--nc-bg-secondary)',
                          border: '1px solid var(--nc-red)',
                          color: 'var(--nc-text-primary)',
                          fontFamily: 'var(--nc-font-mono)',
                          fontSize: 14,
                          width: 120
                        }}
                      />
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || deleting}
                        style={{
                          padding: '10px 20px',
                          background: deleteConfirmText === 'DELETE' ? 'var(--nc-red)' : 'var(--nc-bg-secondary)',
                          border: 'none',
                          color: deleteConfirmText === 'DELETE' ? '#fff' : 'var(--nc-text-muted)',
                          fontFamily: 'var(--nc-font-display)',
                          fontSize: 13,
                          cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
                      </button>
                      <button
                        onClick={() => { setDeleteStep(0); setDeleteConfirmText(''); }}
                        style={{
                          padding: '10px 20px',
                          background: 'transparent',
                          border: '1px solid var(--nc-border)',
                          color: 'var(--nc-text-secondary)',
                          fontFamily: 'var(--nc-font-display)',
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
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
