import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FileText, Radio, Star, ChevronRight, Radar } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  const features = [
    { icon: Star, title: 'Two-Way Reputation System', desc: 'Rate and review contractors and mercenaries. Build trust through verified job history.' },
    { icon: FileText, title: 'Community-Driven Job Board', desc: 'Post contracts, bid on jobs, and connect with skilled pilots across the verse.' },
    { icon: Users, title: 'Friend Finder', desc: 'Discover like-minded citizens. Search by specialization, rating, or availability.' },
    { icon: Radio, title: 'Real-Time Intel', desc: 'Live threat alerts, server status, and crowd-sourced stability reports.' },
  ];

  return (
    <div className="landing-page" style={{ minHeight: '100vh', background: 'var(--nc-bg-primary)' }}>
      {/* Header */}
      <header style={{ 
        padding: '20px 40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--nc-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Radar size={28} style={{ color: 'var(--nc-cyan)' }} />
          <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 20, color: 'var(--nc-cyan)' }}>NAVCOM</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ 
              padding: '10px 24px', 
              background: 'transparent', 
              border: '1px solid var(--nc-cyan)', 
              color: 'var(--nc-cyan)',
              fontFamily: 'var(--nc-font-display)',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            LOGIN
          </button>
          <button 
            onClick={() => navigate('/register')}
            style={{ 
              padding: '10px 24px', 
              background: 'var(--nc-cyan)', 
              border: 'none', 
              color: '#000',
              fontFamily: 'var(--nc-font-display)',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            REGISTER
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ 
        padding: '80px 40px', 
        textAlign: 'center',
        borderBottom: '1px solid var(--nc-border)'
      }}>
        <h1 style={{ 
          fontFamily: 'var(--nc-font-display)', 
          fontSize: 48, 
          color: 'var(--nc-cyan)',
          marginBottom: 16,
          letterSpacing: 4
        }}>
          NAVCOM CONNECT
        </h1>
        <p style={{ 
          fontSize: 20, 
          color: 'var(--nc-text-secondary)', 
          maxWidth: 600, 
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}>
          The ultimate companion app for Star Citizen pilots. 
          Connect with mercenaries, post contracts, and stay informed with real-time intel.
        </p>
        <button 
          onClick={() => navigate('/register')}
          style={{ 
            padding: '16px 48px', 
            background: 'var(--nc-cyan)', 
            border: 'none', 
            color: '#000',
            fontFamily: 'var(--nc-font-display)',
            fontSize: 16,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          GET STARTED <ChevronRight size={20} />
        </button>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 40px' }}>
        <h2 style={{ 
          fontFamily: 'var(--nc-font-display)', 
          fontSize: 14, 
          color: 'var(--nc-text-muted)',
          textAlign: 'center',
          marginBottom: 40,
          letterSpacing: 3
        }}>
          // KEY FEATURES
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 24,
          maxWidth: 1200,
          margin: '0 auto'
        }}>
          {features.map((f, i) => (
            <div key={i} style={{ 
              background: 'var(--nc-bg-card)', 
              border: '1px solid var(--nc-border)',
              padding: 24
            }}>
              <f.icon size={32} style={{ color: 'var(--nc-cyan)', marginBottom: 16 }} />
              <h3 style={{ 
                fontFamily: 'var(--nc-font-display)', 
                fontSize: 16, 
                color: 'var(--nc-text-primary)',
                marginBottom: 8
              }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--nc-text-secondary)', lineHeight: 1.5 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ 
        padding: '60px 40px', 
        textAlign: 'center',
        borderTop: '1px solid var(--nc-border)'
      }}>
        <Shield size={48} style={{ color: 'var(--nc-cyan)', marginBottom: 20 }} />
        <h2 style={{ 
          fontFamily: 'var(--nc-font-display)', 
          fontSize: 24, 
          color: 'var(--nc-text-primary)',
          marginBottom: 12
        }}>
          Join the Network
        </h2>
        <p style={{ color: 'var(--nc-text-secondary)', marginBottom: 24 }}>
          Create your Citizen ID and start connecting today.
        </p>
        <button 
          onClick={() => navigate('/register')}
          style={{ 
            padding: '14px 40px', 
            background: 'var(--nc-cyan)', 
            border: 'none', 
            color: '#000',
            fontFamily: 'var(--nc-font-display)',
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          CREATE ACCOUNT
        </button>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '20px 40px', 
        borderTop: '1px solid var(--nc-border)',
        textAlign: 'center',
        color: 'var(--nc-text-muted)',
        fontSize: 12
      }}>
        NavCom Connect © 2950 | Not affiliated with CIG or RSI
      </footer>
    </div>
  );
};

export default LandingPage;
