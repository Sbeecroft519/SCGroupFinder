import { useAuth } from '../App';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

// Rank thresholds based on contracts completed
const RANK_THRESHOLDS = [
  { min: 500, rank: 'LEGEND' },
  { min: 250, rank: 'ELITE' },
  { min: 100, rank: 'VETERAN' },
  { min: 50, rank: 'OPERATIVE' },
  { min: 10, rank: 'ASSOCIATE' },
  { min: 1, rank: 'FREELANCER' },
  { min: 0, rank: 'CIVILIAN' },
];

const getRank = (contracts) => {
  for (const tier of RANK_THRESHOLDS) {
    if (contracts >= tier.min) return tier.rank;
  }
  return 'CIVILIAN';
};

export default function Profile() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const rank = getRank(user.contracts_completed || 0);
  const reputation = user.reputation || 5.0;
  const fullStars = Math.floor(reputation);
  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown';

  const copyHandle = () => {
    navigator.clipboard?.writeText(user.rsi_handle).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Get avatar - prefer preset, then RSI scraped, then initials
  const getAvatarContent = () => {
    if (user.avatar_preset || user.avatar_url?.includes('/avatars/')) {
      return <img src={user.avatar_url} alt="Avatar" className="avatar-icon" />;
    }
    if (user.avatar_url) {
      return <img src={user.avatar_url} alt="Avatar" className="avatar-icon rsi-avatar" />;
    }
    return <div className="avatar-initials">{user.rsi_handle?.substring(0, 2).toUpperCase()}</div>;
  };

  return (
    <div className="profile-page">
      <div className="profile-grid">
        {/* Left Column - Citizen ID Card */}
        <div className="card-column">
          <div className="citizen-card">
        {/* Header */}
        <div className="card-header">
          <div className="citizen-name">{user.rsi_handle?.toUpperCase()}</div>
          <div className="card-label">CITIZEN ID BADGE</div>
        </div>
        
        <div className="card-divider" />

        {/* Body */}
        <div className="card-body">
          {/* Left Column - Avatar & Barcode */}
          <div className="left-col">
            <div className="avatar-container">
              <div className="avatar-ring" />
              {getAvatarContent()}
            </div>
            <div className="barcode">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bar" style={{ height: `${20 + Math.random() * 30}px` }} />
              ))}
            </div>
          </div>

          {/* Right Column - Data */}
          <div className="right-col">
            <div className="rank-section">
              <span className="label">RANK</span>
              <span className="rank-value">{rank}</span>
            </div>
            
            <div className="rep-section">
              <span className="label">REPUTATION</span>
              <div className="rep-row">
                <span className="rep-value">{reputation.toFixed(1)}</span>
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`star ${i < fullStars ? 'filled' : ''}`}>★</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="stats-row">
              <span>Completed Contracts: {user.contracts_completed || 0}</span>
              <span className="divider">|</span>
              <span>Status: <strong>{user.is_verified ? 'VERIFIED' : 'PENDING'}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer - Badge Rack */}
        <div className="card-footer">
          <div className="badge-rack-label">AWARDS</div>
          <div className="badge-rack">
            {user.is_supporter && (
              <div className="ribbon supporter" title="Supporter">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              </div>
            )}
            <div className="ribbon pioneer" title="Pioneer">
              <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            {user.contracts_completed >= 1 && (
              <div className="ribbon first-contract" title="First Contract">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
            )}
            {user.contracts_completed >= 10 && (
              <div className="ribbon veteran" title="10 Contracts">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              </div>
            )}
          </div>
        </div>

        {/* Copy Handle Button */}
        <button className="copy-btn" onClick={copyHandle} title="Copy RSI Handle">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'COPIED' : 'COPY HANDLE'}
        </button>
      </div>
        </div>

        {/* Right Column - Future Mission History Module */}
        <div className="history-column">
          {/* PLACEHOLDER: Mission History / Activity Feed will go here */}
        </div>
      </div>

      <style>{`
        .profile-page {
          padding: 40px 20px;
          min-height: calc(100vh - 140px);
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 60% 40%;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .card-column {
          display: flex;
          justify-content: flex-start;
        }

        .history-column {
          /* Future: Mission History module */
        }

        .citizen-card {
          width: 100%;
          max-width: 580px;
          aspect-ratio: 1.6;
          background: var(--nc-bg-secondary);
          border: 2px solid var(--nc-cyan);
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.2), inset 0 0 80px rgba(0, 240, 255, 0.03);
          clip-path: polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px));
          position: relative;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
        }

        .citizen-card::after {
          content: '';
          position: absolute;
          inset: 6px;
          border: 1px solid rgba(0, 240, 255, 0.4);
          clip-path: polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px));
          pointer-events: none;
        }

        .citizen-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.015) 2px, rgba(0, 240, 255, 0.015) 4px);
          pointer-events: none;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .citizen-name {
          font-family: 'Orbitron', var(--nc-font-display), sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--nc-cyan);
          letter-spacing: 4px;
          text-shadow: 0 0 12px var(--nc-cyan);
        }

        .card-label {
          font-family: var(--nc-font-mono);
          font-size: 9px;
          color: var(--nc-text-muted);
          letter-spacing: 1.5px;
          opacity: 0.5;
        }

        .card-divider {
          height: 1px;
          background: linear-gradient(90deg, var(--nc-cyan), transparent);
          opacity: 0.4;
          margin-bottom: 16px;
        }

        .card-body {
          display: flex;
          gap: 20px;
          flex: 1;
        }

        .left-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-width: 100px;
        }

        .avatar-container {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 1px solid var(--nc-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgba(0, 240, 255, 0.03);
        }

        .avatar-ring {
          position: absolute;
          inset: -6px;
          border: 1px solid var(--nc-cyan);
          border-radius: 50%;
          border-top-color: transparent;
          border-left-color: transparent;
          animation: spin 4s linear infinite;
          opacity: 0.5;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .avatar-icon {
          width: 48px;
          height: 48px;
          object-fit: contain;
        }

        .avatar-icon.rsi-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-initials {
          font-family: var(--nc-font-display);
          font-size: 24px;
          color: var(--nc-cyan);
        }

        .barcode {
          display: flex;
          gap: 2px;
          align-items: flex-end;
          height: 35px;
          opacity: 0.5;
        }

        .bar {
          width: 2px;
          background: var(--nc-cyan);
        }

        .right-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }

        .label {
          font-family: var(--nc-font-mono);
          font-size: 9px;
          color: var(--nc-text-muted);
          letter-spacing: 1.5px;
          display: block;
          margin-bottom: 1px;
          opacity: 0.7;
        }

        .rank-section .rank-value {
          font-family: 'Orbitron', var(--nc-font-display), sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffd700;
          letter-spacing: 3px;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
        }

        .rep-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rep-value {
          font-family: 'Orbitron', var(--nc-font-display), sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--nc-cyan);
        }

        .stars {
          display: flex;
          gap: 2px;
        }

        .star {
          font-size: 14px;
          color: var(--nc-text-muted);
          opacity: 0.3;
        }

        .star.filled {
          color: var(--nc-cyan);
          opacity: 1;
          text-shadow: 0 0 6px var(--nc-cyan);
        }

        .stats-row {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 4px;
        }

        .stats-row .divider {
          opacity: 0.3;
        }

        .stats-row strong {
          color: var(--nc-cyan);
        }

        .card-footer {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid rgba(0, 240, 255, 0.15);
        }

        .badge-rack-label {
          font-family: var(--nc-font-mono);
          font-size: 9px;
          color: var(--nc-text-muted);
          letter-spacing: 1.5px;
          margin-bottom: 8px;
          opacity: 0.7;
        }

        .badge-rack {
          display: flex;
          gap: 8px;
        }

        .ribbon {
          width: 30px;
          height: 30px;
          border: 1px solid var(--nc-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--nc-cyan);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background: rgba(0, 240, 255, 0.08);
        }

        .ribbon svg {
          width: 14px;
          height: 14px;
        }

        .ribbon.supporter {
          color: #ffd700;
          border-color: #ffd700;
          background: rgba(255, 215, 0, 0.08);
        }

        .copy-btn {
          position: absolute;
          bottom: 16px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          background: transparent;
          border: 1px solid rgba(0, 240, 255, 0.3);
          color: var(--nc-text-muted);
          font-family: var(--nc-font-mono);
          font-size: 9px;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          border-color: var(--nc-cyan);
          color: var(--nc-cyan);
        }

        @media (max-width: 900px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .card-column {
            justify-content: center;
          }
        }

        @media (max-width: 500px) {
          .citizen-card {
            aspect-ratio: auto;
            padding: 16px;
          }

          .card-body {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .right-col {
            align-items: center;
          }

          .stats-row {
            justify-content: center;
          }

          .citizen-name {
            font-size: 18px;
          }

          .copy-btn {
            position: static;
            margin-top: 12px;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
