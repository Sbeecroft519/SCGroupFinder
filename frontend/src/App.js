import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Header from './components/Header';
import AlertTicker from './components/AlertTicker';
import Intel from './pages/Intel';
import Signals from './pages/Signals';
import Contracts from './pages/Contracts';
import Roadmap from './pages/Roadmap';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

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

// Protected Route Component
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
  return <Navigate to="/intel" replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('navcom_token'));
  const [userShard, setUserShard] = useState(localStorage.getItem('navcom_shard') || '');
  const [tickerSettings, setTickerSettings] = useState(() => {
    const saved = localStorage.getItem('navcom_tickers');
    return saved ? JSON.parse(saved) : { threats: true, stability: true, issues: true };
  });
  const [showShardPrompt, setShowShardPrompt] = useState(!localStorage.getItem('navcom_shard'));

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
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const setShard = (shard) => {
    setUserShard(shard);
    localStorage.setItem('navcom_shard', shard);
    setShowShardPrompt(false);
  };

  const updateTickerSettings = (key, value) => {
    const newSettings = { ...tickerSettings, [key]: value };
    setTickerSettings(newSettings);
    localStorage.setItem('navcom_tickers', JSON.stringify(newSettings));
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
    showShardPrompt,
    setShowShardPrompt
  };

  return (
    <AuthContext.Provider value={authValue}>
      <div className="App">
        <BrowserRouter>
          <AlertTicker userShard={userShard} tickerSettings={tickerSettings} />
          <Header user={user} onLogout={logout} userShard={userShard} onShardClick={() => setShowShardPrompt(true)} />
          <main className="navcom-main">
            {/* Shard Prompt Modal */}
            {showShardPrompt && (
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
                      To receive accurate alerts for your server, enter your shard number. 
                      Alerts from other shards won't apply to your gameplay.
                    </p>
                    <div className="shard-instructions">
                      <h4>How to find your shard:</h4>
                      <ol>
                        <li>Press <code>~</code> (tilde) to open console</li>
                        <li>Type <code>r_displayinfo 1</code></li>
                        <li>Look for "Shard" in the info overlay</li>
                        <li>Enter the number below</li>
                      </ol>
                    </div>
                    <input
                      type="text"
                      className="nc-input"
                      placeholder="Enter shard number (e.g., 360)"
                      defaultValue={userShard}
                      onChange={e => setUserShard(e.target.value)}
                      style={{ marginTop: 16 }}
                    />
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button 
                        className="nc-btn nc-btn-secondary" 
                        style={{ flex: 1 }}
                        onClick={() => { setShard(''); setShowShardPrompt(false); }}
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
              <Route path="/intel" element={<Intel />} />
              <Route path="/signals" element={<Signals />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
