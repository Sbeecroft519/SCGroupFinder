import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="navcom-page" data-testid="privacy-policy-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          color: 'var(--nc-cyan)',
          cursor: 'pointer',
          marginBottom: 24,
          fontFamily: 'var(--nc-font-display)',
          fontSize: 12,
          letterSpacing: 1
        }}
      >
        <ArrowLeft size={16} /> BACK
      </button>

      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-label">// LEGAL</div>
        <h1 className="page-title">Privacy Policy</h1>
        <p style={{ color: 'var(--nc-text-muted)', fontSize: 13, marginTop: 8 }}>
          Last Updated: February 16, 2026
        </p>
      </div>

      <div className="nc-card" style={{ padding: 32 }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: 'var(--nc-cyan)', fontSize: 16, marginBottom: 16, fontFamily: 'var(--nc-font-display)', letterSpacing: 1 }}>
            1. What We Collect & Why
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
            We keep it simple. To use SC Group Finder, we only ask for:
          </p>
          <ul style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.8, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'var(--nc-text-primary)' }}>Email Address:</strong> Used for account recovery and occasional app updates (new features/guides).
            </li>
            <li>
              <strong style={{ color: 'var(--nc-text-primary)' }}>RSI Handle:</strong> Used to verify you are a real Star Citizen player, prevent botting, and maintain your persistent rating profile.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: 'var(--nc-cyan)', fontSize: 16, marginBottom: 16, fontFamily: 'var(--nc-font-display)', letterSpacing: 1 }}>
            2. How We Use Your Data
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
            We do not sell your data. We don't like spam any more than you like 30Ks. Your info is used strictly to:
          </p>
          <ul style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.8, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>Validate your in-game identity.</li>
            <li>Send you "How-To" guides and feature updates (which you can opt-out of at any time).</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: 'var(--nc-cyan)', fontSize: 16, marginBottom: 16, fontFamily: 'var(--nc-font-display)', letterSpacing: 1 }}>
            3. Cookies & Tracking
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.7 }}>
            We use "Essential Cookies" to keep you logged in. We do not use third-party tracking pixels or targeted advertising.
          </p>
        </section>

        <section>
          <h2 style={{ color: 'var(--nc-cyan)', fontSize: 16, marginBottom: 16, fontFamily: 'var(--nc-font-display)', letterSpacing: 1 }}>
            4. Your Rights (GDPR / CCPA / PIPEDA)
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.7 }}>
            No matter where you live, you can request a copy of your data or ask us to delete your account entirely by contacting{' '}
            <a href="mailto:support@navcomconnect.com" style={{ color: 'var(--nc-cyan)' }}>support@navcomconnect.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
