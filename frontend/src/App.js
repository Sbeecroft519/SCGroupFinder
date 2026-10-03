import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'sonner';
import './App.css';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import QuickActionsFAB from './components/QuickActionsFAB';
import AlertTicker from './components/AlertTicker';
import OnboardingCarousel from './components/OnboardingCarousel';
import Footer from './components/Footer';

import Intel from './pages/Intel';
import Signals from './pages/Signals';
import Contracts from './pages/Contracts';
import ContractDetails from './pages/ContractDetails';
import Roadmap from './pages/Roadmap';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import PlayerSearch from './pages/PlayerSearch';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import LandingPage from './pages/LandingPage';
import CitizenDirectory from './pages/CitizenDirectory';
import Organizations from './pages/Organizations';
import OrgProfile from './pages/OrgProfile';
import PendingRatings from './pages/PendingRatings';
import { useNotifications } from './hooks/useNotifications';
import { disableWebPush, refreshWebPush } from './utils/webPush';
import { useContractPolling } from './hooks/useContractPolling';
import './responsive.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Protected Route Component - ALL routes require auth now
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span className="loading-text">INITIALIZING...</span>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Home redirect
const Home = () => {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  return <Navigate to="/contracts" replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('navcom_token'));
  const [userShard, setUserShard] = useState(() => {
    const saved = localStorage.getItem('navcom_region');
    return saved && saved !== 'Global' ? saved : '';
  });
  const [tickerSettings, setTickerSettings] = useState(() => {
    const saved = localStorage.getItem('navcom_tickers');
    return saved ? JSON.parse(saved) : { threats: true, stability: true, issues: true };
  });
  const [notificationSettings, setNotificationSettings] = useState({
    websocket_enabled: true,
    sound_enabled: true,
    threat_alerts: true,
    stability_alerts: true,
    issue_alerts: true,
    contract_alerts: true,
    contract_types: []
  });
  const [showShardPrompt, setShowShardPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  // Handle new alerts from WebSocket
  const handleNewAlert = useCallback((alert) => {
    setRecentAlerts(prev => [alert, ...prev.slice(0, 9)]);
  }, []);

  // WebSocket notifications hook
  useNotifications(userShard, notificationSettings, handleNewAlert);
  
  // Contract polling (every 15 seconds when enabled)
  useContractPolling(API, user && notificationSettings?.contract_alerts, null);

  // Region is remembered per account (and locally for guests) — never re-asked on refresh.
  const applyRegion = useCallback((region) => {
    localStorage.setItem('navcom_region', region || 'Global');
    setUserShard(region && region !== 'Global' ? region : '');
  }, []);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Apply theme based on user preference
  useEffect(() => {
    const themeId = user?.theme_id || 'default';
    if (themeId === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  }, [user?.theme_id]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
        
        const isDemo = localStorage.getItem('navcom_is_demo') === 'true';
        // Check if first time user (no onboarding completed)
        const onboardingDone = localStorage.getItem('navcom_onboarding_done');
        const serverRegion = response.data.region;
        const localRegion = localStorage.getItem('navcom_region');
        if (serverRegion) {
          applyRegion(serverRegion);
        } else if (localRegion) {
          applyRegion(localRegion);
          axios.put(`${API}/user/region`, { region: localRegion }).catch(() => {});
        }
        const hasRegion = Boolean(serverRegion || localRegion);
        if (isDemo) {
          // Demo users skip onboarding and region prompt
          setShowOnboarding(false);
          setShowShardPrompt(false);
        } else if (!onboardingDone) {
          setShowOnboarding(true);
        } else {
          // Only ask players who have genuinely never chosen a region
          setShowShardPrompt(!hasRegion);
        }
        
        refreshWebPush(response.data.id).catch(() => {});
        
        // Fetch notification settings
        try {
          const settingsRes = await axios.get(`${API}/user/notification-settings`);
          setNotificationSettings(settingsRes.data);
        } catch (e) {
          // Use defaults
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('navcom_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token, applyRegion]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('navcom_token', newToken);
    setToken(newToken);
    setUser(userData);
    
    // Check if first time user
    const onboardingDone = localStorage.getItem('navcom_onboarding_done');
    const serverRegion = userData.region;
    const localRegion = localStorage.getItem('navcom_region');
    if (serverRegion) {
      applyRegion(serverRegion);
    } else if (localRegion) {
      applyRegion(localRegion);
      axios.put(`${API}/user/region`, { region: localRegion }).catch(() => {});
    }
    if (!onboardingDone) {
      setShowOnboarding(true);
    } else {
      setShowShardPrompt(!(serverRegion || localRegion));
    }
    
    return userData;
  };

  const demoLogin = async () => {
    const response = await axios.post(`${API}/auth/demo-login`);
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('navcom_token', newToken);
    localStorage.setItem('navcom_onboarding_done', 'true'); // skip onboarding for demo
    localStorage.setItem('navcom_is_demo', 'true');
    setToken(newToken);
    setUser(userData);
    // No RSI verification, no shard prompt, straight into the app
    setShowOnboarding(false);
    setShowShardPrompt(false);
    return userData;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData);
    return response.data;
  };

  const logout = async () => {
    await disableWebPush().catch(() => {});
    localStorage.removeItem('navcom_token');
    localStorage.removeItem('navcom_is_demo');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const setShard = async (shard) => {
    const region = shard || 'Global';
    applyRegion(region);
    setShowShardPrompt(false);
    setUser(prev => (prev ? { ...prev, region } : prev));
    if (localStorage.getItem('navcom_token')) {
      try {
        await axios.put(`${API}/user/region`, { region });
      } catch (e) {
        console.error('Failed to save region:', e);
      }
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('navcom_onboarding_done', 'true');
    setShowOnboarding(false);
    // Don't show shard prompt again since onboarding handles it
  };

  const updateTickerSettings = (key, value) => {
    const newSettings = { ...tickerSettings, [key]: value };
    setTickerSettings(newSettings);
    localStorage.setItem('navcom_tickers', JSON.stringify(newSettings));
  };

  const updateNotificationSettings = async (updates) => {
    const newSettings = { ...notificationSettings, ...updates };
    setNotificationSettings(newSettings);
    try {
      await axios.put(`${API}/user/notification-settings`, newSettings);
    } catch (e) {
      console.error('Failed to save notification settings:', e);
    }
  };

  const authValue = {
    user,
    token,
    loading,
    login,
    demoLogin,
    register,
    logout,
    updateUser,
    userShard,
    setShard,
    tickerSettings,
    updateTickerSettings,
    notificationSettings,
    updateNotificationSettings,
    showShardPrompt,
    setShowShardPrompt,
    recentAlerts
  };

  return (
    <AuthContext.Provider value={authValue}>
      <div className="App">
        <Toaster position="top-right" theme="dark" richColors closeButton />
        <BrowserRouter>
          {/* Only show tickers when logged in */}
          {user && <AlertTicker userShard={userShard} tickerSettings={tickerSettings} />}
          {user && <Header user={user} onLogout={logout} userShard={userShard} onShardClick={() => setShowShardPrompt(true)} />}
          <main className={user ? "navcom-main" : ""}>
            {/* Onboarding Carousel for first-time users */}
            {showOnboarding && user && (
              <OnboardingCarousel 
                onComplete={completeOnboarding} 
                onSetShard={setShard}
              />
            )}

            {/* Region Prompt Modal - shown on every login after onboarding */}
            {showShardPrompt && user && !showOnboarding && (
              <div className="mission-modal-overlay" style={{ zIndex: 1001 }} data-testid="region-prompt-modal">
                <div className="mission-modal" style={{ maxWidth: 450 }}>
                  <div className="mission-modal-header">
                    <div>
                      <div className="mission-type-badge">// ACCOUNT_SETUP</div>
                      <h2 className="mission-title">Set Your Server Region</h2>
                    </div>
                  </div>
                  <div className="mission-modal-content">
                    <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                      Welcome back, <span style={{ color: 'var(--nc-cyan)' }}>{user?.rsi_handle}</span>!
                      Pick the server region you're playing on so alerts and reports match your area.
                    </p>
                    <label className="nc-label">SERVER REGION</label>
                    <select
                      className="nc-input"
                      value={userShard || '__placeholder__'}
                      onChange={e => setUserShard(e.target.value === '__placeholder__' ? '' : e.target.value)}
                      data-testid="region-select"
                      style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
                    >
                      <option value="__placeholder__">Select your region...</option>
                      <option value="USA">USA</option>
                      <option value="Europe">Europe</option>
                      <option value="Australia">Australia</option>
                      <option value="Asia">Asia</option>
                    </select>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button
                        className="nc-btn nc-btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setShard('')}
                        data-testid="region-skip-btn"
                      >
                        Skip (Global)
                      </button>
                      <button
                        className="nc-btn nc-btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => setShard(userShard)}
                        data-testid="region-set-btn"
                      >
                        Set Region
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/intel" element={<ProtectedRoute><Intel /></ProtectedRoute>} />
              <Route path="/signals" element={<ProtectedRoute><Signals /></ProtectedRoute>} />
              <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
              <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetails /></ProtectedRoute>} />
              <Route path="/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><PlayerSearch /></ProtectedRoute>} />
              <Route path="/directory" element={<ProtectedRoute><CitizenDirectory /></ProtectedRoute>} />
              <Route path="/orgs" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
              <Route path="/orgs/:orgId" element={<ProtectedRoute><OrgProfile /></ProtectedRoute>} />
              <Route path="/ratings" element={<ProtectedRoute><PendingRatings /></ProtectedRoute>} />
            </Routes>
            
            {/* Footer - shown when logged in */}
            {user && <Footer />}
          </main>
          {/* Mobile Bottom Navigation - only shown when logged in */}
          {user && <MobileNav />}
          {/* Quick Actions FAB - only shown when logged in on mobile */}
          {user && <QuickActionsFAB />}
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
