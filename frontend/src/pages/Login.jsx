import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { useAuth, API } from '../App';
import AboutModal from '../components/AboutModal';

export default function Login() {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Handle Discord OAuth return: token in URL means verified login succeeded
  useEffect(() => {
    const discordToken = searchParams.get('discord_token');
    const discordError = searchParams.get('discord_error');
    if (discordToken) {
      localStorage.setItem('navcom_token', discordToken);
      // Full reload so AuthContext picks up the token and hydrates /auth/me
      window.location.replace('/contracts');
      return;
    }
    if (discordError) {
      const messages = {
        token_exchange_failed: 'Discord could not authorize this app. Please try again.',
        user_fetch_failed: 'Could not read your Discord profile. Please try again.',
        not_configured: 'Discord login is not configured on this server.',
        network: 'Network error contacting Discord. Please try again.',
        missing_code: 'Discord login was cancelled.',
      };
      setError(messages[discordError] || 'Discord login failed. Please try again.');
    }
  }, [searchParams]);

  const handleDiscordLogin = () => {
    window.location.href = `${API}/auth/discord/login`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/contracts');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await demoLogin();
      navigate('/contracts');
    } catch (err) {
      setError(err.response?.data?.detail || 'Demo login is currently unavailable.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page" data-testid="login-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="page-label">// AUTHENTICATION</div>
          <h1 className="auth-title">Pilot Login</h1>
          <p className="auth-subtitle">Access your SC Group Finder account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error" data-testid="login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="nc-label">EMAIL</label>
            <input
              type="email"
              className="nc-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="pilot@example.com"
              required
              data-testid="login-email"
            />
          </div>

          <div className="form-group">
            <label className="nc-label">PASSWORD</label>
            <div className="input-with-icon">
              <input
                type={showPassword ? 'text' : 'password'}
                className="nc-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="login-password"
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="nc-btn nc-btn-primary auth-submit"
            disabled={loading}
            data-testid="login-submit"
          >
            <LogIn size={16} />
            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>

        {/* Discord OAuth Login */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--nc-border)' }}>
          <button
            type="button"
            className="nc-btn"
            onClick={handleDiscordLogin}
            style={{
              width: '100%',
              background: '#5865F2',
              color: '#fff',
              border: '1px solid #5865F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
            data-testid="discord-login-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.075.075 0 0 0-.079.037c-.34.606-.719 1.396-.984 2.013a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-1-2.013.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.171 4.369a.07.07 0 0 0-.032.027C1.533 9.045.612 13.579 1.06 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027 14.09 14.09 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z"/>
            </svg>
            CONTINUE WITH DISCORD
          </button>
          <p style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginTop: 8, fontFamily: 'var(--nc-font-mono)', textAlign: 'center' }}>
            RSI verification still required for new accounts.
          </p>
        </div>

        {/* Demo Login */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--nc-border)', textAlign: 'center' }}>
          <button
            type="button"
            className="nc-btn nc-btn-secondary"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            style={{ width: '100%' }}
            data-testid="demo-login-btn"
          >
            {demoLoading ? 'LOADING DEMO...' : 'TRY DEMO'}
          </button>
          <p style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginTop: 8, fontFamily: 'var(--nc-font-mono)' }}>
            No account or RSI verification required.
          </p>
        </div>

        <div className="auth-footer">
          <span className="text-muted">New pilot?</span>
          <Link to="/register" className="auth-link">Create Account</Link>
        </div>
        
        {/* Community Badge */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <img 
            src="https://customer-assets.emergentagent.com/job_space-contracts/artifacts/cs2lc5r9_ola6jl4j_MadeByTheCommunity_White.png" 
            alt="Made by the Community" 
            style={{ height: 32, opacity: 0.7 }}
          />
        </div>
        
        {/* About Link */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => setShowAbout(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--nc-cyan)',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--nc-font-display)',
              letterSpacing: 1
            }}
            data-testid="about-navcom-btn"
          >
            <Info size={14} />
            About SC Group Finder
          </button>
        </div>
      </div>
      
      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}
