import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, Check, Copy, RefreshCw } from 'lucide-react';
import { useAuth, API } from '../App';
import axios from 'axios';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const discordPendingToken = searchParams.get('discord') || '';
  const discordEmail = searchParams.get('email') || '';
  const discordUsername = searchParams.get('discord_username') || '';
  const isDiscordFlow = !!discordPendingToken;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: discordEmail,
    password: '',
    confirmPassword: '',
    rsi_handle: '',
    contact_opt_in: false,
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // On mount: if this is a Discord flow, pre-fill email and pre-generate code
  useEffect(() => {
    if (isDiscordFlow && !verificationCode) {
      setVerificationCode(generateCode());
    }
  }, [isDiscordFlow, verificationCode]);

  const generateCode = () => {
    return 'NAV-' + Math.floor(100 + Math.random() * 900);
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (!isDiscordFlow) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    if (!formData.rsi_handle.trim()) {
      setError('RSI handle is required');
      return;
    }

    if (!verificationCode) {
      setVerificationCode(generateCode());
    }
    setStep(2);
  };

  const handleDiscordLogin = () => {
    const url = `${API}/auth/discord/login`;
    // Break out of any parent iframe (e.g. Emergent preview) so Discord's page
    // isn't blocked by X-Frame-Options.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_top';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCopyCode = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(verificationCode);
      } else {
        // Fallback for browsers/contexts where clipboard API is blocked
        const textArea = document.createElement('textarea');
        textArea.value = verificationCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      // If all methods fail, show a manual copy message
      console.warn('Clipboard copy failed:', err);
      // Select the text for manual copy
      const codeElement = document.querySelector('[data-testid="verification-code"]');
      if (codeElement) {
        const range = document.createRange();
        range.selectNodeContents(codeElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);

    try {
      if (isDiscordFlow) {
        // Discord flow: single call that verifies RSI bio, attaches handle, and returns JWT
        const resp = await axios.post(`${API}/auth/discord/complete`, {
          pending_token: discordPendingToken,
          rsi_handle: formData.rsi_handle,
          verification_code: verificationCode,
        });
        const { token } = resp.data;
        localStorage.setItem('navcom_token', token);
        // Full reload so AuthContext picks up token and hydrates user via /auth/me
        window.location.replace('/contracts');
        return;
      }

      // Standard email/password flow
      const verifyResponse = await axios.post(`${API}/auth/verify-rsi`, {
        rsi_handle: formData.rsi_handle,
        verification_code: verificationCode
      });

      if (!verifyResponse.data.verified) {
        setError('Verification code not found in RSI bio. Please add the code and try again.');
        setLoading(false);
        return;
      }

      // Now register with verified status
      await register({
        ...formData,
        verification_code: verificationCode,
        is_verified: true
      });
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please ensure the code is in your RSI bio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" data-testid="register-page">
      <div className="auth-card" style={{ maxWidth: step === 2 ? 500 : 420 }}>
        <div className="auth-header">
          <div className="page-label">// NEW_PILOT</div>
          <h1 className="auth-title">{step === 1 ? 'Create Account' : 'Verify RSI Handle'}</h1>
          <p className="auth-subtitle">
            {step === 1 ? 'Join the SC Group Finder community' : 'Confirm ownership of your RSI account'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="step-indicators">
          <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Account</span>
          </div>
          <div className="step-line" />
          <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Verify</span>
          </div>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="auth-form">
            {isDiscordFlow && (
              <div style={{
                background: 'rgba(88, 101, 242, 0.1)',
                border: '1px solid #5865F2',
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 13,
                color: 'var(--nc-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }} data-testid="discord-linked-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                  <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.075.075 0 0 0-.079.037c-.34.606-.719 1.396-.984 2.013a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-1-2.013.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.171 4.369a.07.07 0 0 0-.032.027C1.533 9.045.612 13.579 1.06 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027 14.09 14.09 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.061.061 0 0 0-.031-.028z"/>
                </svg>
                <span>
                  Linked to Discord{discordUsername ? ` as ${discordUsername}` : ''}. Add your RSI handle to finish.
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="nc-label">EMAIL</label>
              <input
                type="email"
                className="nc-input"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="pilot@example.com"
                required
                disabled={isDiscordFlow}
                data-testid="register-email"
              />
            </div>

            <div className="form-group">
              <label className="nc-label">RSI HANDLE</label>
              <input
                type="text"
                className="nc-input"
                value={formData.rsi_handle}
                onChange={e => setFormData(prev => ({ ...prev, rsi_handle: e.target.value }))}
                placeholder="Your Star Citizen handle"
                required
                data-testid="register-handle"
              />
            </div>

            {!isDiscordFlow && (
              <>
                <div className="form-group">
                  <label className="nc-label">PASSWORD</label>
                  <div className="input-with-icon">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="nc-input"
                      value={formData.password}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      required
                      data-testid="register-password"
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

                <div className="form-group">
                  <label className="nc-label">CONFIRM PASSWORD</label>
                  <input
                    type="password"
                    className="nc-input"
                    value={formData.confirmPassword}
                    onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    required
                    data-testid="register-confirm"
                  />
                </div>
              </>
            )}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.contact_opt_in}
                onChange={e => setFormData(prev => ({ ...prev, contact_opt_in: e.target.checked }))}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--nc-cyan)' }}
                data-testid="register-opt-in"
              />
              <span style={{ color: 'var(--nc-text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                Contact me about SC Group Finder updates. You can opt out any time.
              </span>
            </label>

            <button 
              type="submit" 
              className="nc-btn nc-btn-primary auth-submit"
              data-testid="register-next"
            >
              CONTINUE TO VERIFICATION
            </button>

            {!isDiscordFlow && (
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
                  data-testid="register-discord-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.075.075 0 0 0-.079.037c-.34.606-.719 1.396-.984 2.013a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-1-2.013.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.171 4.369a.07.07 0 0 0-.032.027C1.533 9.045.612 13.579 1.06 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027 14.09 14.09 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.061.061 0 0 0-.031-.028z"/>
                  </svg>
                  SIGN UP WITH DISCORD
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="verification-step">
            <div className="verification-instructions">
              <h3 className="font-display" style={{ fontSize: 14, marginBottom: 12, color: 'var(--nc-text-primary)' }}>
                Verification Steps:
              </h3>
              <ol className="verification-steps-list">
                <li>Copy the verification code below</li>
                <li>Go to your RSI Profile Settings</li>
                <li>Add the code to your Bio/Short Bio field</li>
                <li>Click "Verify" below</li>
              </ol>
            </div>

            <div className="verification-code-box">
              <span className="font-mono text-muted" style={{ fontSize: 11 }}>YOUR CODE:</span>
              <div className="verification-code">
                <span className="code-text" data-testid="verification-code">{verificationCode}</span>
                <button 
                  className="nc-btn nc-btn-secondary" 
                  onClick={handleCopyCode}
                  style={{ padding: '8px 12px' }}
                >
                  {codeCopied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <a 
              href={`https://robertsspaceindustries.com/citizens/${formData.rsi_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nc-btn nc-btn-secondary"
              style={{ width: '100%', marginBottom: 12 }}
            >
              Open RSI Profile
            </a>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="nc-btn nc-btn-secondary"
                onClick={() => setStep(1)}
                style={{ flex: 1 }}
              >
                Back
              </button>
              <button 
                className="nc-btn nc-btn-primary"
                onClick={handleVerify}
                disabled={loading}
                style={{ flex: 2 }}
                data-testid="register-verify"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Verify & Create Account
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <span className="text-muted">Already have an account?</span>
          <Link to="/login" className="auth-link">Login</Link>
        </div>
        
        {/* Community Badge */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <img 
            src="https://customer-assets.emergentagent.com/job_space-contracts/artifacts/cs2lc5r9_ola6jl4j_MadeByTheCommunity_White.png" 
            alt="Made by the Community" 
            style={{ height: 32, opacity: 0.7 }}
          />
        </div>
      </div>

      <style>{`
        .step-indicators {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        
        .step-number {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--nc-border);
          font-family: var(--nc-font-display);
          font-size: 14px;
          color: var(--nc-text-muted);
        }
        
        .step-indicator.active .step-number {
          border-color: var(--nc-cyan);
          color: var(--nc-cyan);
          background: rgba(0, 240, 255, 0.1);
        }
        
        .step-label {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .step-indicator.active .step-label {
          color: var(--nc-cyan);
        }
        
        .step-line {
          width: 60px;
          height: 1px;
          background: var(--nc-border);
          margin-bottom: 20px;
        }
        
        .verification-instructions {
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .verification-steps-list {
          margin: 0;
          padding-left: 20px;
          color: var(--nc-text-secondary);
          font-size: 14px;
          line-height: 1.8;
        }
        
        .verification-code-box {
          background: var(--nc-bg-primary);
          border: 1px solid var(--nc-cyan);
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .verification-code {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }
        
        .code-text {
          font-family: var(--nc-font-display);
          font-size: 28px;
          color: var(--nc-cyan);
          letter-spacing: 4px;
          text-shadow: var(--nc-glow-cyan);
        }
      `}</style>
    </div>
  );
}
