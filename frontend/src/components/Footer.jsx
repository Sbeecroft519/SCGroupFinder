import { useState } from 'react';
import { Info } from 'lucide-react';
import AboutModal from './AboutModal';

const Footer = () => {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <footer style={{
        borderTop: '1px solid var(--nc-border)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        fontSize: 12,
        color: 'var(--nc-text-muted)',
        fontFamily: 'var(--nc-font-mono)',
        marginTop: 'auto'
      }}>
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
      </footer>
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default Footer;
