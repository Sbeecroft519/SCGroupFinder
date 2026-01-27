import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../App';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/intel');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" data-testid="login-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="page-label">// AUTHENTICATION</div>
          <h1 className="auth-title">Pilot Login</h1>
          <p className="auth-subtitle">Access your NavCom account</p>
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

        <div className="auth-footer">
          <span className="text-muted">New pilot?</span>
          <Link to="/register" className="auth-link">Create Account</Link>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          width: 100%;
        }
        
        .auth-card {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          padding: 32px 40px;
        }
        
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .auth-title {
          font-family: var(--nc-font-display);
          font-size: 24px;
          color: var(--nc-text-primary);
          margin: 8px 0;
        }
        
        .auth-subtitle {
          font-family: var(--nc-font-body);
          font-size: 14px;
          color: var(--nc-text-muted);
        }
        
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .auth-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(255, 51, 102, 0.1);
          border: 1px solid var(--nc-red);
          color: var(--nc-red);
          font-family: var(--nc-font-body);
          font-size: 13px;
        }
        
        .input-with-icon {
          position: relative;
        }
        
        .input-icon-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--nc-text-muted);
          cursor: pointer;
          padding: 4px;
        }
        
        .input-icon-btn:hover {
          color: var(--nc-cyan);
        }
        
        .auth-submit {
          width: 100%;
          margin-top: 8px;
        }
        
        .auth-footer {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--nc-border);
          font-size: 14px;
        }
        
        .auth-link {
          color: var(--nc-cyan);
          text-decoration: none;
          font-family: var(--nc-font-display);
          letter-spacing: 1px;
        }
        
        .auth-link:hover {
          text-shadow: var(--nc-glow-cyan);
        }
      `}</style>
    </div>
  );
}
