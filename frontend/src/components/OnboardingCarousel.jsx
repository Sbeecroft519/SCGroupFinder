import { useState } from 'react';
import { Radar, Activity, FileText, Map, ChevronRight, ChevronLeft, X } from 'lucide-react';

const SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to NavCom',
    subtitle: 'Your Star Citizen Mission Advisor',
    description: 'NavCom is your tactical companion for navigating the verse. Get mission recommendations, track server health, connect with other players, and support feature development.',
    icon: null,
    gradient: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(2, 11, 20, 0.95) 100%)'
  },
  {
    id: 'intel',
    title: 'Intel Module',
    subtitle: 'Mission Recommendations',
    description: 'Tell us your ship, available time, and preferred activity. NavCom will analyze live market data and server conditions to recommend the best missions for maximum profit or enjoyment.',
    icon: Radar,
    features: ['Live UEX Corp commodity prices', 'Risk-based route planning', 'Ship-specific recommendations']
  },
  {
    id: 'signals',
    title: 'Signals Module',
    subtitle: 'Server Health & Reports',
    description: 'Monitor RSI server status, view crowd-sourced incident reports, and contribute your own. Track reliability by activity type and see real-time alerts for your shard.',
    icon: Activity,
    features: ['Real-time server status', 'Pirate & PvP alerts', 'Location-based reports']
  },
  {
    id: 'contracts',
    title: 'Contracts Module',
    subtitle: 'Mercenary Beacon System',
    description: 'Need backup? Post a contract. Looking for work? Browse available jobs. Our bilateral rating system ensures quality service on both sides.',
    icon: FileText,
    features: ['Escort & rescue contracts', '5-star rating system', 'Reputation tracking']
  },
  {
    id: 'disclaimer',
    title: 'About NavCom',
    subtitle: 'Made by the Community',
    description: 'This site is created and maintained by one person — Mowri — and is a work in progress. I am not affiliated with Cloud Imperium Games, Roberts Space Industries, or Star Citizen in any way.',
    icon: null,
    showCommunityBadge: true
  },
  {
    id: 'getstarted',
    title: 'Set Your Shard',
    subtitle: 'Personalize Your Experience',
    description: 'Enter your server shard number to receive alerts relevant to your gameplay. You can find this in-game by pressing ~ and typing r_displayinfo 1.',
    icon: Map,
    isLast: true
  }
];

export default function OnboardingCarousel({ onComplete, onSetShard }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [shardInput, setShardInput] = useState('');

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;
  const isFirst = currentSlide === 0;

  const handleNext = () => {
    if (isLast) {
      if (shardInput) onSetShard(shardInput);
      onComplete();
    } else {
      setCurrentSlide(c => c + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentSlide(c => c - 1);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="onboarding-overlay" data-testid="onboarding-carousel">
      <div className="onboarding-card">
        {/* Skip Button */}
        <button className="onboarding-skip" onClick={handleSkip}>
          <X size={20} />
        </button>

        {/* Progress Dots */}
        <div className="onboarding-progress">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${i === currentSlide ? 'active' : ''} ${i < currentSlide ? 'completed' : ''}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>

        {/* Slide Content */}
        <div className="onboarding-content" style={{ background: slide.gradient }}>
          {slide.icon && (
            <div className="onboarding-icon">
              <slide.icon size={64} />
            </div>
          )}
          
          {!slide.icon && !slide.showCommunityBadge && (
            <div className="onboarding-logo">
              <span className="logo-text">NAVCOM</span>
              <span className="logo-subtitle">MISSION ADVISOR</span>
            </div>
          )}

          {slide.showCommunityBadge && (
            <div className="community-badge-container">
              <img 
                src="https://customer-assets.emergentagent.com/job_space-contracts/artifacts/cs2lc5r9_ola6jl4j_MadeByTheCommunity_White.png" 
                alt="Made by the Community" 
                className="community-badge-img"
              />
            </div>
          )}

          <div className="onboarding-text">
            <span className="onboarding-label">// {slide.subtitle?.toUpperCase().replace(/ /g, '_')}</span>
            <h2 className="onboarding-title">{slide.title}</h2>
            <p className="onboarding-description">{slide.description}</p>
            
            {slide.features && (
              <ul className="onboarding-features">
                {slide.features.map((f, i) => (
                  <li key={i}>
                    <ChevronRight size={14} />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            {slide.isLast && (
              <div className="shard-input-group">
                <input
                  type="text"
                  className="nc-input"
                  placeholder="Enter shard number (e.g., 360)"
                  value={shardInput}
                  onChange={e => setShardInput(e.target.value)}
                />
                <span className="shard-hint">Press ~ in-game, type r_displayinfo 1</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="onboarding-nav">
          <button
            className="nc-btn nc-btn-secondary"
            onClick={handlePrev}
            disabled={isFirst}
            style={{ opacity: isFirst ? 0.3 : 1 }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button className="nc-btn nc-btn-primary" onClick={handleNext}>
            {isLast ? 'Get Started' : 'Next'} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 11, 20, 0.98);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 24px;
        }
        .onboarding-card {
          width: 100%;
          max-width: 600px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          position: relative;
        }
        .onboarding-skip {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: var(--nc-text-muted);
          cursor: pointer;
          z-index: 10;
          padding: 4px;
        }
        .onboarding-skip:hover {
          color: var(--nc-cyan);
        }
        .onboarding-progress {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          background: var(--nc-bg-secondary);
          border-bottom: 1px solid var(--nc-border);
        }
        .progress-dot {
          width: 10px;
          height: 10px;
          border: 1px solid var(--nc-border);
          background: var(--nc-bg-primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .progress-dot.active {
          border-color: var(--nc-cyan);
          background: var(--nc-cyan);
          box-shadow: 0 0 10px var(--nc-cyan);
        }
        .progress-dot.completed {
          background: var(--nc-cyan-dim);
          border-color: var(--nc-cyan-dim);
        }
        .onboarding-content {
          padding: 48px 40px;
          min-height: 350px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .onboarding-icon {
          width: 120px;
          height: 120px;
          border: 2px solid var(--nc-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--nc-cyan);
          margin-bottom: 32px;
          animation: pulse-ring 2s ease-out infinite;
        }
        .onboarding-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }
        .onboarding-logo .logo-text {
          font-family: var(--nc-font-display);
          font-size: 48px;
          font-weight: 700;
          color: var(--nc-cyan);
          letter-spacing: 8px;
          text-shadow: var(--nc-glow-cyan);
        }
        .onboarding-logo .logo-subtitle {
          font-family: var(--nc-font-mono);
          font-size: 12px;
          color: var(--nc-text-muted);
          letter-spacing: 4px;
          margin-top: 8px;
        }
        .onboarding-label {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-cyan);
          letter-spacing: 2px;
          margin-bottom: 12px;
        }
        .onboarding-title {
          font-family: var(--nc-font-display);
          font-size: 28px;
          color: var(--nc-text-primary);
          margin-bottom: 16px;
        }
        .onboarding-description {
          font-family: var(--nc-font-body);
          font-size: 15px;
          color: var(--nc-text-secondary);
          line-height: 1.7;
          max-width: 480px;
        }
        .onboarding-features {
          list-style: none;
          margin-top: 24px;
          text-align: left;
        }
        .onboarding-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--nc-font-body);
          font-size: 14px;
          color: var(--nc-text-secondary);
          padding: 8px 0;
        }
        .onboarding-features li svg {
          color: var(--nc-cyan);
        }
        .shard-input-group {
          margin-top: 24px;
          width: 100%;
          max-width: 300px;
        }
        .shard-hint {
          display: block;
          margin-top: 8px;
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
        }
        .onboarding-nav {
          display: flex;
          justify-content: space-between;
          padding: 20px 24px;
          background: var(--nc-bg-secondary);
          border-top: 1px solid var(--nc-border);
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(0, 240, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0); }
        }
        .community-badge-container {
          margin-bottom: 24px;
        }
        .community-badge-img {
          max-width: 200px;
          height: auto;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
