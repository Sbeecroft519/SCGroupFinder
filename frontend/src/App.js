import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import QuickActionsFAB from './components/QuickActionsFAB';
import AlertTicker from './components/AlertTicker';
import OnboardingCarousel from './components/OnboardingCarousel';
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
import { useNotifications, requestNotificationPermission } from './hooks/useNotifications';
import { useContractPolling } from './hooks/useContractPolling';

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
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/intel" replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('navcom_token'));
  const [userShard, setUserShard] = useState(''); // Session-based, not localStorage
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

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

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
        
        // Check if first time user (no onboarding completed)
        const onboardingDone = localStorage.getItem('navcom_onboarding_done');
        if (!onboardingDone) {
          setShowOnboarding(true);
        } else {
          // Always show shard prompt on login (session-based)
          setShowShardPrompt(true);
        }
        
        // Request notification permission
        requestNotificationPermission();
        
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
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('navcom_token', newToken);
    setToken(newToken);
    setUser(userData);
    
    // Check if first time user
    const onboardingDone = localStorage.getItem('navcom_onboarding_done');
    if (!onboardingDone) {
      setShowOnboarding(true);
    } else {
      // Always prompt for shard on login
      setShowShardPrompt(true);
    }
    
    requestNotificationPermission();
    return userData;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('navcom_token');
    setToken(null);
    setUser(null);
    setUserShard(''); // Clear session shard
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const setShard = (shard) => {
    setUserShard(shard);
    setShowShardPrompt(false);
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
        <BrowserRouter>
          {/* Only show tickers when logged in */}
          {user && <AlertTicker userShard={userShard} tickerSettings={tickerSettings} />}
          <Header user={user} onLogout={logout} userShard={userShard} onShardClick={() => setShowShardPrompt(true)} />
          <main className="navcom-main">
            {/* Onboarding Carousel for first-time users */}
            {showOnboarding && user && (
              <OnboardingCarousel 
                onComplete={completeOnboarding} 
                onSetShard={setShard}
              />
            )}

            {/* Shard Prompt Modal - shown on every login after onboarding */}
            {showShardPrompt && user && !showOnboarding && (
              <div className="mission-modal-overlay" style={{ zIndex: 1001 }}>
                <div className="mission-modal" style={{ maxWidth: 450 }}>
                  <div className="mission-modal-header">
                    <div>
                      <div className="mission-type-badge">// SESSION_SETUP</div>
                      <h2 className="mission-title">Enter Your Shard</h2>
                    </div>
                  </div>
                  <div className="mission-modal-content">
                    <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                      Welcome back, <span style={{ color: 'var(--nc-cyan)' }}>{user?.rsi_handle}</span>! 
                      Enter your current shard number for accurate alerts.
                    </p>
                    <div className="shard-instructions">
                      <h4>How to find your shard:</h4>
                      <ol>
                        <li>When logged in to Star Citizen</li>
                        <li>Press <code>~</code> (tilde) to open console</li>
                        <li>Type <code>r_displayinfo 1</code></li>
                        <li>Look for "Shard" in the info overlay</li>
                        <li>Write down the number beside it</li>
                        <li>Type <code>r_displayinfo 0</code></li>
                        <li>Enter the shard number below</li>
                      </ol>
                    </div>
                    <input
                      type="text"
                      className="nc-input"
                      placeholder="Enter shard number (e.g., 360)"
                      value={userShard}
                      onChange={e => setUserShard(e.target.value)}
                      style={{ marginTop: 16 }}
                    />
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button 
                        className="nc-btn nc-btn-secondary" 
                        style={{ flex: 1 }}
                        onClick={() => setShard('')}
                      >
                        Skip (Global Only)
                      </button>
                      <button 
                        className="nc-btn nc-btn-primary" 
                        style={{ flex: 1 }}
                        onClick={() => setShard(userShard)}
                      >
                        Set Shard
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
              <Route path="/intel" element={<ProtectedRoute><Intel /></ProtectedRoute>} />
              <Route path="/signals" element={<ProtectedRoute><Signals /></ProtectedRoute>} />
              <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
              <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetails /></ProtectedRoute>} />
              <Route path="/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            </Routes>
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
