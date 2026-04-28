import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, Check, Copy, RefreshCw } from 'lucide-react';
import { useAuth, API } from '../App';
import axios from 'axios';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    rsi_handle: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const generateCode = () => {
    return 'NAV-' + Math.floor(100 + Math.random() * 900);
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setVerificationCode(generateCode());
    setStep(2);
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
      // First, verify the RSI profile contains the code
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
            <div className="form-group">
              <label className="nc-label">EMAIL</label>
              <input
                type="email"
                className="nc-input"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="pilot@example.com"
                required
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

            <button 
              type="submit" 
              className="nc-btn nc-btn-primary auth-submit"
              data-testid="register-next"
            >
              CONTINUE TO VERIFICATION
            </button>
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
