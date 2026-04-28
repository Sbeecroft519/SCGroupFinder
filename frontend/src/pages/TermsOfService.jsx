import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="navcom-page" data-testid="terms-of-service-page" style={{ maxWidth: 800, margin: '0 auto' }}>
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
        <h1 className="page-title">Terms of Service</h1>
      </div>

      <div className="nc-card" style={{ padding: 32 }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: 'var(--nc-cyan)', fontSize: 16, marginBottom: 16, fontFamily: 'var(--nc-font-display)', letterSpacing: 1 }}>
            1. Unofficial Status
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.7 }}>
            SC Group Finder is a fan-made, unofficial site. We are not affiliated with Cloud Imperium Games (CIG) or Roberts Space Industries (RSI). All Star Citizen assets are property of their respective owners.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: 'var(--nc-cyan)', fontSize: 16, marginBottom: 16, fontFamily: 'var(--nc-font-display)', letterSpacing: 1 }}>
            2. Community Conduct
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.7 }}>
            Your RSI Handle is your identity here. Users found using the rating system to harass others or manipulate data will have their access revoked.
          </p>
        </section>

        <section>
          <h2 style={{ color: 'var(--nc-cyan)', fontSize: 16, marginBottom: 16, fontFamily: 'var(--nc-font-display)', letterSpacing: 1 }}>
            3. "As Is" Basis
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', lineHeight: 1.7 }}>
            This is a free community tool. While we strive for 100% uptime, we aren't liable for any data loss or errors in the community-sourced data.
          </p>
        </section>
      </div>
    </div>
  );
}
