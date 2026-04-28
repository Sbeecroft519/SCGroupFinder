import { X } from 'lucide-react';

const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'rgba(2, 11, 20, 0.98)',
        border: '1px solid #00f0ff',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '30px',
        position: 'relative',
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '25px',
            background: 'none',
            border: 'none',
            color: '#00f0ff',
            fontSize: '24px',
            cursor: 'pointer'
          }}
          data-testid="about-modal-close"
        >
          <X size={24} />
        </button>
        
        {/* Header */}
        <h1 style={{
          color: '#00f0ff',
          fontSize: '28px',
          letterSpacing: '4px',
          marginBottom: '30px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.3)',
          paddingBottom: '15px',
          fontFamily: 'var(--nc-font-display)'
        }}>
          ABOUT SC GROUP FINDER
        </h1>
        
        {/* Origin Story */}
        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#00f0ff', fontSize: '14px', letterSpacing: '2px', marginBottom: '15px', fontFamily: 'var(--nc-font-display)' }}>
            // ORIGIN_STORY
          </h2>
          <p style={{ color: '#ccc', lineHeight: '1.7', fontSize: '15px', fontFamily: 'var(--nc-font-body)' }}>
            SC Group Finder was born from a very specific kind of frustration. I built this because I was sick of wasting my limited free time spending an hour trying to muster a group, only to be ganked by an unknown crewmate I collected from Global Chat, or crash out due to lag spikes, or lose everything because of cargo errors.
          </p>
          <p style={{ color: '#ccc', lineHeight: '1.7', fontSize: '15px', marginTop: '15px', fontFamily: 'var(--nc-font-body)' }}>
            I believe in solving problems rather than just bitching about them; since this is a feature CIG/RSI is sorely lacking, I built the bridge myself. This entire app is "vibe-coded" because I have the "I really like space" kind of autism, not the much more useful "I actually know how to code" type.
          </p>
        </section>
        
        {/* Philosophy */}
        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#00f0ff', fontSize: '14px', letterSpacing: '2px', marginBottom: '15px', fontFamily: 'var(--nc-font-display)' }}>
            // PROJECT_PHILOSOPHY
          </h2>
          <ul style={{ color: '#ccc', lineHeight: '1.8', fontSize: '15px', listStyle: 'none', padding: 0, fontFamily: 'var(--nc-font-body)' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#00ff88' }}>No Adware:</strong> You won't find banner ads or outside adverts here.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#00ff88' }}>Pure Utility:</strong> The only things promoted are other internal projects, like my Star Citizen radio station, The Drift Network.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#00ff88' }}>Optional Support:</strong> There is a donate button, but it is entirely optional for those who want to help with the upkeep and server costs.
            </li>
          </ul>
        </section>
        
        {/* Feature Highlights */}
        <section>
          <h2 style={{ color: '#00f0ff', fontSize: '14px', letterSpacing: '2px', marginBottom: '15px', fontFamily: 'var(--nc-font-display)' }}>
            // FEATURE_HIGHLIGHTS
          </h2>
          
          {/* Job Board */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#ffd700', fontSize: '16px', marginBottom: '10px', fontFamily: 'var(--nc-font-display)' }}>
              Job & Group Board (the main event)
            </h3>
            <p style={{ color: '#ccc', lineHeight: '1.7', fontSize: '14px', marginBottom: '10px', fontFamily: 'var(--nc-font-body)' }}>
              This is "Uber for the Verse".
            </p>
            <ul style={{ color: '#ccc', lineHeight: '1.8', fontSize: '14px', paddingLeft: '20px', fontFamily: 'var(--nc-font-body)' }}>
              <li><strong>Post Jobs & Groups:</strong> Post jobs for specific roles like turret gunners, medics, or miners. Multi-crew manifests are supported — stock that Idris with competent players.</li>
              <li><strong>Applications:</strong> Players apply for specific seats on your ship or contract positions. You accept or decline them.</li>
              <li><strong>Citizen Cards:</strong> View an applicant's full service record, including their Rank and Reputation, before you ever invite them to your party.</li>
              <li><strong>Two-Way Ratings:</strong> After the mission, both the poster and the player rate each other. This builds a persistent, community-driven reputation that filters out the griefers from the professionals.</li>
            </ul>
          </div>

          {/* Signals */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#ffd700', fontSize: '16px', marginBottom: '10px', fontFamily: 'var(--nc-font-display)' }}>
              Signals & Alerts (supporting feature)
            </h3>
            <p style={{ color: '#ccc', lineHeight: '1.7', fontSize: '14px', fontFamily: 'var(--nc-font-body)' }}>
              Real-time player reports about piracy, PvP hot zones, 30ks, and server instability. Filter by server region. Before you undock, check Signals to see if your region is stable or a total mess. Aggregate — the more users we have, the more accurate.
            </p>
          </div>

          {/* Intel */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#ffd700', fontSize: '16px', marginBottom: '10px', fontFamily: 'var(--nc-font-display)' }}>
              Intel (optional)
            </h3>
            <p style={{ color: '#ccc', lineHeight: '1.7', fontSize: '14px', fontFamily: 'var(--nc-font-body)' }}>
              Stop standing around in your Hangar with decision paralysis. Input your available time, your ship, and your risk tolerance, and Intel will suggest a mission profile for your session. Available under Other Tools.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutModal;
