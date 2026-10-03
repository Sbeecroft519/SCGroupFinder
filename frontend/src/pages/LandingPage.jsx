import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FileText, Star, ChevronRight, Radar, Info, Zap, Target, PlayCircle } from 'lucide-react';
import AboutModal from '../components/AboutModal';
import { useAuth } from '../App';

const LandingPage = () => {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [showAbout, setShowAbout] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  const handleDemo = async () => {
    setDemoError('');
    setDemoLoading(true);
    try {
      await demoLogin();
      navigate('/contracts');
    } catch (err) {
      setDemoError(err.response?.data?.detail || 'Demo login is currently unavailable.');
    } finally {
      setDemoLoading(false);
    }
  };

  const features = [
    { icon: FileText, title: 'Job & Group Board', desc: 'Post jobs, missions, and group requests. Browse what other players need. No more trawling Global chat for teammates.', color: '#00F0FF' },
    { icon: Users, title: 'Applicant Review', desc: 'Players apply to join your job. Review their reputation, rating, and profile before you accept or decline.', color: '#00FF88' },
    { icon: Star, title: 'Two-Way Reputation', desc: 'Rate and review each other after every mission. Trust is built through a verified reputation system.', color: '#FFD700' },
    { icon: Shield, title: 'Multi-Crew Manifests', desc: 'Running an Idris or Carrack? Post named crew slots — turret gunners, medics, engineers — and fill them with vetted players.', color: '#AA00FF' },
    { icon: Users, title: 'Looking-for-Group Tab', desc: 'Need a casual crew with no payout? Use the LFG / Group Up tab on the Job Board to broadcast a session and get teammates without bidding.', color: '#FF6600' },
    { icon: Zap, title: 'Signals & Alerts', desc: 'Optional supporting feature — crowd-sourced reports on piracy, PvP, lag, and server issues by region.', color: '#FF0044' },
  ];

  const screenshots = [
    { src: '/screenshots/job-board.png', title: 'Job Board', desc: 'Post and apply for jobs' },
    { src: '/screenshots/applicant-review.png', title: 'Applicant Review', desc: 'Choose teammates by reputation' },
    { src: '/screenshots/signals.png', title: 'Signals', desc: 'Region-based intel & alerts' },
  ];

  return (
    <div className="landing-page" style={{ 
      minHeight: '100vh', 
      background: 'var(--nc-bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div className="landing-bg-effects">
        <div className="grid-overlay" />
        <div className="scan-line" />
      </div>

      {/* Header */}
      <header className="landing-header" data-testid="landing-header" style={{ 
        padding: '20px 40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        borderBottom: '1px solid var(--nc-border)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Radar size={28} style={{ color: 'var(--nc-cyan)' }} />
          <span data-testid="landing-brand" style={{ fontFamily: 'var(--nc-font-display)', fontSize: 20, color: 'var(--nc-cyan)' }}>SC GROUP FINDER</span>
        </div>
        <div className="landing-header-actions" style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => navigate('/login')}
            className="landing-btn-secondary"
            data-testid="landing-login-button"
          >
            LOGIN
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="landing-btn-primary"
            data-testid="landing-register-button"
          >
            REGISTER
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ 
        padding: '100px 40px 80px', 
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="hero-badge">
          <Zap size={14} /> STAR CITIZEN PLAYER CONTRACT BOARD
        </div>
        <h1 className="hero-title">
          STAR CITIZEN <span className="hero-title-accent">GROUP FINDER</span>
        </h1>
        <p style={{ 
          fontSize: 18, 
          color: 'var(--nc-text-secondary)', 
          maxWidth: 620, 
          margin: '0 auto 24px',
          lineHeight: 1.7
        }}>
          Find crews, post jobs, apply to missions, and choose teammates based on reputation
          instead of Global chat roulette.
        </p>
        
        <button 
          onClick={() => setShowAbout(true)}
          style={{ 
            background: 'transparent',
            border: 'none',
            color: 'var(--nc-cyan)',
            fontFamily: 'var(--nc-font-display)',
            fontSize: 13,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 32,
            opacity: 0.8
          }}
        >
          <Info size={16} /> Learn more
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => navigate('/register')}
            className="landing-btn-hero"
          >
            <Target size={20} /> GET STARTED <ChevronRight size={20} />
          </button>
          <button
            type="button"
            onClick={handleDemo}
            disabled={demoLoading}
            className="landing-btn-secondary"
            data-testid="demo-login-btn"
            style={{ padding: '14px 36px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <PlayCircle size={18} /> {demoLoading ? 'LOADING DEMO...' : 'TRY DEMO'}
          </button>
          <span style={{ color: 'var(--nc-text-muted)', fontSize: 12, fontFamily: 'var(--nc-font-mono)' }}>
            No account or RSI verification required.
          </span>
          {demoError && (
            <span style={{ color: '#ff4466', fontSize: 12 }} data-testid="demo-error">{demoError}</span>
          )}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 40px 40px', position: 'relative', zIndex: 10 }}>
        <h2 style={{ 
          fontFamily: 'var(--nc-font-display)', 
          fontSize: 12, 
          color: 'var(--nc-cyan)',
          textAlign: 'center',
          marginBottom: 40,
          letterSpacing: 4
        }}>
          // KEY FEATURES
        </h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ '--feature-color': f.color }}>
              <div className="feature-icon-wrap">
                <f.icon size={28} style={{ color: f.color }} />
              </div>
              <h3 style={{ 
                fontFamily: 'var(--nc-font-display)', 
                fontSize: 15, 
                color: 'var(--nc-text-primary)',
                marginBottom: 8
              }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--nc-text-secondary)', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshots */}
      <section style={{ 
        padding: '40px 40px 80px',
        position: 'relative',
        zIndex: 10
      }}>
        <h2 style={{ 
          fontFamily: 'var(--nc-font-display)', 
          fontSize: 12, 
          color: 'var(--nc-cyan)',
          textAlign: 'center',
          marginBottom: 40,
          letterSpacing: 4
        }}>
          // SEE IT IN ACTION
        </h2>
        <div className="screenshots-row">
          {screenshots.map((shot, i) => (
            <div key={i} className="screenshot-card">
              <img src={shot.src} alt={shot.title} />
              <div className="screenshot-overlay">
                <h4>{shot.title}</h4>
                <p>{shot.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Badge */}
      <section style={{ 
        padding: '60px 40px', 
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <img 
          src="https://customer-assets.emergentagent.com/job_space-contracts/artifacts/cs2lc5r9_ola6jl4j_MadeByTheCommunity_White.png"
          alt="Star Citizen - Made by the Community"
          style={{ 
            height: 80,
            opacity: 0.5
          }}
        />
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '20px 40px', 
        borderTop: '1px solid var(--nc-border)',
        textAlign: 'center',
        color: 'var(--nc-text-muted)',
        fontSize: 11,
        position: 'relative',
        zIndex: 10
      }}>
        SC Group Finder © 2950 | Not affiliated with CIG or RSI
      </footer>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <style>{`
        /* Features grid: 3 columns desktop, 2 columns tablet, 1 column mobile */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
          justify-items: stretch;
        }
        @media (max-width: 1024px) {
          .features-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
        }
        @media (max-width: 640px) {
          .features-grid { grid-template-columns: 1fr; gap: 16px; padding: 0 8px; }
        }

        /* Screenshots row: side-by-side desktop, scroll-snap swipe on mobile */
        .screenshots-row {
          display: flex;
          gap: 24px;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .screenshots-row {
            flex-wrap: nowrap;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scroll-padding: 16px;
            padding: 0 16px 16px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
          }
          .screenshots-row .screenshot-card {
            scroll-snap-align: center;
            flex: 0 0 85%;
            max-width: 85%;
          }
          .screenshots-row::after {
            content: 'swipe →';
            position: absolute;
            right: 24px;
            margin-top: -28px;
            color: var(--nc-cyan);
            font-family: var(--nc-font-mono);
            font-size: 11px;
            opacity: 0.7;
            pointer-events: none;
          }
        }

        .landing-bg-effects {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: orbFloat 8s ease-in-out infinite;
        }
        .orb-1 {
          width: 400px;
          height: 400px;
          background: var(--nc-cyan);
          top: -100px;
          right: -100px;
        }
        .orb-2 {
          width: 300px;
          height: 300px;
          background: #ff6600;
          bottom: 20%;
          left: -100px;
          animation-delay: -4s;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.1); }
        }
        .scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--nc-cyan), transparent);
          opacity: 0.3;
          animation: scanDown 4s ease-in-out infinite;
        }
        @keyframes scanDown {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0,240,255,0.1);
          border: 1px solid rgba(0,240,255,0.3);
          color: var(--nc-cyan);
          font-family: var(--nc-font-mono);
          font-size: 11px;
          letter-spacing: 2px;
          margin-bottom: 24px;
        }
        .hero-title {
          font-family: var(--nc-font-display);
          font-size: 56px;
          color: var(--nc-text-primary);
          margin-bottom: 16px;
          letter-spacing: 8px;
        }
        .hero-title-accent {
          color: var(--nc-cyan);
          text-shadow: 0 0 30px var(--nc-cyan-glow);
        }
        .landing-btn-primary {
          padding: 12px 28px;
          background: var(--nc-cyan);
          border: none;
          color: #000;
          font-family: var(--nc-font-display);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .landing-btn-primary:hover {
          box-shadow: 0 0 20px var(--nc-cyan-glow);
          transform: translateY(-2px);
        }
        .landing-btn-secondary {
          padding: 12px 28px;
          background: transparent;
          border: 1px solid var(--nc-cyan);
          color: var(--nc-cyan);
          font-family: var(--nc-font-display);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .landing-btn-secondary:hover {
          background: rgba(0,240,255,0.1);
        }
        .landing-btn-hero {
          padding: 16px 48px;
          background: linear-gradient(135deg, var(--nc-cyan), #00a0aa);
          border: none;
          color: #000;
          font-family: var(--nc-font-display);
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
          box-shadow: 0 4px 20px var(--nc-cyan-glow);
        }
        .landing-btn-hero:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px var(--nc-cyan-glow);
        }
        .screenshot-card {
          position: relative;
          width: 350px;
          height: 220px;
          border: 1px solid var(--nc-border);
          overflow: hidden;
          transition: all 0.3s;
        }
        .screenshot-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s;
        }
        .screenshot-card:hover img {
          transform: scale(1.05);
        }
        .screenshot-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px;
          background: linear-gradient(transparent, rgba(0,0,0,0.9));
        }
        .screenshot-overlay h4 {
          font-family: var(--nc-font-display);
          font-size: 14px;
          color: var(--nc-cyan);
          margin-bottom: 4px;
        }
        .screenshot-overlay p {
          font-size: 12px;
          color: var(--nc-text-secondary);
        }
        .feature-card {
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          padding: 24px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--feature-color);
          transform: scaleX(0);
          transition: transform 0.3s;
        }
        .feature-card:hover::before {
          transform: scaleX(1);
        }
        .feature-card:hover {
          border-color: var(--feature-color);
          transform: translateY(-4px);
        }
        .feature-icon-wrap {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--nc-border);
          margin-bottom: 16px;
        }
        .cta-container {
          display: inline-block;
          padding: 40px 60px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
        }
        @media (max-width: 768px) {
          .hero-title { font-size: 36px; letter-spacing: 4px; }
          .screenshot-card { width: auto; max-width: none; }
          .landing-btn-hero { padding: 14px 28px !important; font-size: 14px !important; }
        }
        @media (max-width: 480px) {
          .hero-title { font-size: 28px; letter-spacing: 2px; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
