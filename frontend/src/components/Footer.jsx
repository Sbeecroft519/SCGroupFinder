import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import AboutModal from './AboutModal';

const Footer = () => {
  const [showAbout, setShowAbout] = useState(false);

  const linkStyle = {
    color: 'var(--nc-text-muted)',
    textDecoration: 'none',
    fontSize: 12,
    fontFamily: 'var(--nc-font-mono)',
    transition: 'color 0.2s'
  };

  return (
    <>
      <footer style={{
        borderTop: '1px solid var(--nc-border)',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        fontSize: 12,
        color: 'var(--nc-text-muted)',
        fontFamily: 'var(--nc-font-mono)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span>© 2025 NavCom Connect</span>
          <button 
            onClick={() => setShowAbout(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--nc-cyan)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--nc-font-mono)'
            }}
            data-testid="footer-about-btn"
          >
            <Info size={12} />
            About
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/privacy" style={linkStyle} data-testid="footer-privacy-link">
            Privacy Policy
          </Link>
          <span style={{ color: 'var(--nc-border)' }}>|</span>
          <Link to="/terms" style={linkStyle} data-testid="footer-terms-link">
            Terms of Service
          </Link>
        </div>
      </footer>
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default Footer;
