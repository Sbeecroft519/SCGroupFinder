import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FileText, Radio, Star, ChevronRight, Radar, Info, Zap, Target } from 'lucide-react';
import AboutModal from '../components/AboutModal';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);

  const features = [
    { icon: Star, title: 'Two-Way Reputation System', desc: 'Rate and review contractors and mercenaries. Build trust through verified job history and player ratings.', color: '#FFD700' },
    { icon: FileText, title: 'Community-Driven Job Board', desc: 'Post contracts, bid on jobs, and connect with skilled pilots across the verse.', color: '#00F0FF' },
    { icon: Users, title: 'Citizen Directory', desc: 'Find pilots and mercenaries by specialization, rating, rank, or availability.', color: '#00FF88' },
    { icon: Radio, title: 'Real-Time Intel & Alerts', desc: 'Shard-specific and global alerts powered by player-led reporting. Know before you go.', color: '#FF6600' },
    { icon: Zap, title: 'Live Threat Reporting', desc: 'Report pirates, PvP activity, server issues, and bugs. Help the community stay informed.', color: '#FF0044' },
    { icon: Target, title: 'Mission Advisor', desc: 'AI-powered mission recommendations based on your ship, playstyle, and current server conditions.', color: '#AA00FF' },
  ];

  const screenshots = [
    { src: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=700&h=440&fit=crop', title: 'Mission Advisor', desc: 'AI-powered mission planning' },
    { src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&h=440&fit=crop', title: 'Job Board', desc: 'Player contracts & services' },
    { src: 'https://images.unsplash.com/photo-1534996858221-380b92700493?w=700&h=440&fit=crop', title: 'Citizen Directory', desc: 'Find pilots & mercenaries' },
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
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="scan-line" />
      </div>

      {/* Header */}
      <header style={{ 
        padding: '20px 40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--nc-border)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Radar size={28} style={{ color: 'var(--nc-cyan)' }} />
          <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 20, color: 'var(--nc-cyan)' }}>NAVCOM</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => navigate('/login')}
            className="landing-btn-secondary"
          >
            LOGIN
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="landing-btn-primary"
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
          <Zap size={14} /> STAR CITIZEN COMPANION APP
        </div>
        <h1 className="hero-title">
          NAVCOM <span className="hero-title-accent">CONNECT</span>
        </h1>
        <p style={{ 
          fontSize: 18, 
          color: 'var(--nc-text-secondary)', 
          maxWidth: 550, 
          margin: '0 auto 24px',
          lineHeight: 1.7
        }}>
          The ultimate mission advisor for Star Citizen pilots. 
          Connect with mercenaries, post contracts, and stay informed with real-time intel.
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
          <Info size={16} /> Learn more about NavCom
        </button>

        <div>
          <button 
            onClick={() => navigate('/register')}
            className="landing-btn-hero"
          >
            <Target size={20} /> GET STARTED <ChevronRight size={20} />
          </button>
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 20,
          maxWidth: 1200,
          margin: '0 auto'
        }}>
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
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: 1200,
          margin: '0 auto'
        }}>
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

      {/* CTA */}
      <section style={{ 
        padding: '80px 40px', 
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="cta-container">
          <Shield size={40} style={{ color: 'var(--nc-cyan)', marginBottom: 16 }} />
          <h2 style={{ 
            fontFamily: 'var(--nc-font-display)', 
            fontSize: 22, 
            color: 'var(--nc-text-primary)',
            marginBottom: 8
          }}>
            Join the Network
          </h2>
          <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 24, fontSize: 14 }}>
            Create your Citizen ID and start connecting today.
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="landing-btn-primary"
            style={{ padding: '14px 40px' }}
          >
            CREATE ACCOUNT
          </button>
        </div>
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
        NavCom Connect © 2950 | Not affiliated with CIG or RSI
      </footer>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <style>{`
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
          .screenshot-card { width: 100%; max-width: 350px; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
