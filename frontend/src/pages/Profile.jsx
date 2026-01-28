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
      <div className="citizen-card">
        {/* Header */}
        <div className="card-header">
          <div className="citizen-name">{user.rsi_handle?.toUpperCase()}</div>
          <div className="card-label">UEE CITIZEN RECORD</div>
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
              <span>Contracts: {user.contracts_completed || 0}</span>
              <span className="divider">|</span>
              <span>Joined: {joinDate}</span>
              <span className="divider">|</span>
              <span>Status: <strong>{user.is_verified ? 'VERIFIED' : 'PENDING'}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer - Badge Rack */}
        <div className="card-footer">
          <div className="badge-rack-label">RIBBON RACK</div>
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

      <style>{`
        .profile-page {
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: calc(100vh - 140px);
        }

        .citizen-card {
          width: 100%;
          max-width: 480px;
          background: var(--nc-bg-secondary);
          border: 2px solid var(--nc-cyan);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 60px rgba(0, 240, 255, 0.03);
          clip-path: polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px));
          position: relative;
          padding: 24px;
        }

        .citizen-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.02) 2px, rgba(0, 240, 255, 0.02) 4px);
          pointer-events: none;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .citizen-name {
          font-family: var(--nc-font-display);
          font-size: 28px;
          font-weight: 700;
          color: var(--nc-cyan);
          letter-spacing: 3px;
          text-shadow: 0 0 10px var(--nc-cyan);
        }

        .card-label {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
          opacity: 0.6;
        }

        .card-divider {
          height: 1px;
          background: var(--nc-cyan);
          opacity: 0.4;
          margin-bottom: 20px;
        }

        .card-body {
          display: flex;
          gap: 24px;
        }

        .left-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .avatar-container {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 2px solid var(--nc-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgba(0, 240, 255, 0.05);
        }

        .avatar-ring {
          position: absolute;
          inset: -8px;
          border: 2px solid var(--nc-cyan);
          border-radius: 50%;
          border-top-color: transparent;
          border-left-color: transparent;
          animation: spin 4s linear infinite;
          opacity: 0.6;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .avatar-icon {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .avatar-icon.rsi-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-initials {
          font-family: var(--nc-font-display);
          font-size: 32px;
          color: var(--nc-cyan);
        }

        .barcode {
          display: flex;
          gap: 2px;
          align-items: flex-end;
          height: 50px;
          opacity: 0.6;
        }

        .bar {
          width: 3px;
          background: var(--nc-cyan);
        }

        .right-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .label {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
          display: block;
          margin-bottom: 2px;
        }

        .rank-section .rank-value {
          font-family: var(--nc-font-display);
          font-size: 26px;
          font-weight: 700;
          color: #ffd700;
          letter-spacing: 2px;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        .rep-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rep-value {
          font-family: var(--nc-font-display);
          font-size: 32px;
          font-weight: 700;
          color: var(--nc-cyan);
        }

        .stars {
          display: flex;
          gap: 2px;
        }

        .star {
          font-size: 16px;
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
          gap: 8px;
          margin-top: 8px;
        }

        .stats-row .divider {
          opacity: 0.4;
        }

        .stats-row strong {
          color: var(--nc-cyan);
        }

        .card-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 240, 255, 0.2);
        }

        .badge-rack-label {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
          margin-bottom: 10px;
        }

        .badge-rack {
          display: flex;
          gap: 10px;
        }

        .ribbon {
          width: 36px;
          height: 36px;
          border: 1px solid var(--nc-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--nc-cyan);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background: rgba(0, 240, 255, 0.1);
        }

        .ribbon svg {
          width: 18px;
          height: 18px;
        }

        .ribbon.supporter {
          color: #ffd700;
          border-color: #ffd700;
          background: rgba(255, 215, 0, 0.1);
        }

        .copy-btn {
          position: absolute;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid var(--nc-border);
          color: var(--nc-text-muted);
          font-family: var(--nc-font-mono);
          font-size: 10px;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          border-color: var(--nc-cyan);
          color: var(--nc-cyan);
        }

        @media (max-width: 500px) {
          .citizen-card {
            padding: 20px;
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
            font-size: 22px;
          }

          .rank-section .rank-value {
            font-size: 22px;
          }

          .copy-btn {
            position: static;
            margin-top: 20px;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
