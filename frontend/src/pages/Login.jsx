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
    </div>
  );
}
