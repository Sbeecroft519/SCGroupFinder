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
        <div className="card-inner">
          {/* Header */}
          <div className="card-header">
            <div className="citizen-name">{user.rsi_handle?.toUpperCase()}</div>
            <div className="card-label">CITIZEN RECORD</div>
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
                  <div key={i} className="bar" style={{ height: `${25 + Math.random() * 35}px` }} />
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
                <div className="stat-item">
                  <span className="stat-label">Completed Contracts:</span>
                  <span className="stat-value">{user.contracts_completed || 0}</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-label">Status:</span>
                  <span className="stat-value">{user.is_verified ? 'VERIFIED' : 'PENDING'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Badge Rack */}
          <div className="card-footer">
            <div className="badge-rack-label">BADGE RACK</div>
            <div className="badge-rack">
              {user.is_supporter && (
                <div className="ribbon supporter" title="Supporter">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                  <span className="ribbon-label">SUPPORTER</span>
                </div>
              )}
              <div className="ribbon" title="Pioneer">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>
                <span className="ribbon-label">PIONEER</span>
              </div>
              {user.contracts_completed >= 1 && (
                <div className="ribbon" title="First Contract">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span className="ribbon-label">FIRST JOB</span>
                </div>
              )}
              {user.contracts_completed >= 10 && (
                <div className="ribbon" title="Veteran">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                  <span className="ribbon-label">VETERAN</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Copy Handle Button */}
        <button className="copy-btn" onClick={copyHandle} title="Copy RSI Handle">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'COPIED' : 'COPY'}
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
          grid-template-columns: 1fr;
          gap: 24px;
          max-width: 700px;
          margin: 0 auto;
        }

        .card-column {
          display: flex;
          justify-content: center;
        }

        .history-column {
          /* Future: Mission History module */
        }

        .citizen-card {
          width: 100%;
          max-width: 720px;
          aspect-ratio: 1.75;
          background: #020b14;
          position: relative;
          padding: 0;
          clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);
        }

        .citizen-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--nc-cyan) 0%, var(--nc-cyan) 100%);
          clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);
          z-index: 0;
        }

        .citizen-card::after {
          content: '';
          position: absolute;
          inset: 2px;
          background: #020b14;
          clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px);
          z-index: 1;
        }

        .card-inner {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 20px 24px;
        }

        .card-inner::before {
          content: '';
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(0, 240, 255, 0.25);
          clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
          pointer-events: none;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 8px;
        }

        .citizen-name {
          font-family: 'Orbitron', var(--nc-font-display), sans-serif;
          font-size: 42px;
          font-weight: 700;
          color: var(--nc-cyan);
          letter-spacing: 6px;
          text-shadow: 0 0 20px var(--nc-cyan);
        }

        .card-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-cyan);
          letter-spacing: 2px;
          opacity: 0.8;
        }

        .card-label::before {
          content: '';
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
        }

        .card-divider {
          height: 1px;
          background: var(--nc-cyan);
          opacity: 0.3;
          margin: 0 8px 20px;
        }

        .card-body {
          display: grid;
          grid-template-columns: 30% 70%;
          gap: 16px;
          flex: 1;
          padding: 0 8px;
        }

        .left-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .avatar-container {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          border: 2px solid var(--nc-cyan);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgba(0, 240, 255, 0.03);
        }

        .avatar-ring {
          position: absolute;
          inset: -12px;
          border: 2px solid var(--nc-cyan);
          border-radius: 50%;
          border-top-color: transparent;
          border-left-color: transparent;
          animation: spin 3s linear infinite;
          opacity: 0.7;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .avatar-ring::after {
          content: '';
          position: absolute;
          inset: -10px;
          border: 1px solid var(--nc-cyan);
          border-radius: 50%;
          opacity: 0.3;
        }

        .avatar-icon {
          width: 88px;
          height: 88px;
          object-fit: contain;
          filter: drop-shadow(0 0 8px var(--nc-cyan));
        }

        .avatar-icon.rsi-avatar {
          width: 115px;
          height: 115px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-initials {
          font-family: var(--nc-font-display);
          font-size: 44px;
          color: var(--nc-cyan);
          text-shadow: 0 0 10px var(--nc-cyan);
        }

        .barcode {
          display: flex;
          gap: 3px;
          align-items: flex-end;
          height: 60px;
        }

        .bar {
          width: 4px;
          background: var(--nc-cyan);
          opacity: 0.7;
        }

        .right-col {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 6px;
          border-left: 1px solid rgba(0, 240, 255, 0.2);
          padding-left: 20px;
        }

        .label {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          letter-spacing: 2px;
          display: block;
          margin-bottom: 2px;
        }

        .rank-section {
          margin-bottom: 8px;
        }

        .rank-section .rank-value {
          font-family: 'Orbitron', var(--nc-font-display), sans-serif;
          font-size: 36px;
          font-weight: 700;
          color: #ffd700;
          letter-spacing: 4px;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
        }

        .rep-section {
          margin-bottom: 12px;
        }

        .rep-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rep-value {
          font-family: 'Orbitron', var(--nc-font-display), sans-serif;
          font-size: 32px;
          font-weight: 700;
          color: var(--nc-cyan);
          text-shadow: 0 0 10px var(--nc-cyan);
        }

        .stars {
          display: flex;
          gap: 4px;
        }

        .star {
          font-size: 20px;
          color: #334455;
        }

        .star.filled {
          color: #ffd700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
        }

        .stats-row {
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: var(--nc-font-mono);
          font-size: 13px;
          color: var(--nc-text-muted);
          margin-top: 8px;
        }

        .stats-row .stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stats-row .stat-label {
          font-size: 10px;
          letter-spacing: 1px;
          opacity: 0.6;
        }

        .stats-row .stat-value {
          color: var(--nc-cyan);
          font-size: 14px;
        }

        .stats-row .stat-divider {
          width: 1px;
          height: 30px;
          background: rgba(0, 240, 255, 0.3);
        }

        .card-footer {
          margin-top: auto;
          padding: 16px 8px 0;
          border-top: 1px solid rgba(0, 240, 255, 0.2);
        }

        .badge-rack-label {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        .badge-rack {
          display: flex;
          gap: 12px;
          justify-content: flex-start;
        }

        .ribbon {
          width: 50px;
          height: 50px;
          border: 1px solid var(--nc-cyan);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--nc-cyan);
          background: rgba(0, 240, 255, 0.05);
          position: relative;
        }

        .ribbon svg {
          width: 20px;
          height: 20px;
        }

        .ribbon-label {
          font-size: 6px;
          font-family: var(--nc-font-mono);
          letter-spacing: 0.5px;
          margin-top: 2px;
          text-align: center;
          max-width: 40px;
        }

        .ribbon.supporter {
          color: #ffd700;
          border-color: #ffd700;
          background: rgba(255, 215, 0, 0.05);
        }

        .copy-btn {
          position: absolute;
          top: 20px;
          right: 24px;
          z-index: 3;
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

        @media (max-width: 600px) {
          .citizen-card {
            aspect-ratio: auto;
          }

          .card-body {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .left-col {
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(0, 240, 255, 0.2);
          }

          .right-col {
            border-left: none;
            padding-left: 0;
            align-items: center;
          }

          .stats-row {
            justify-content: center;
          }

          .badge-rack {
            justify-content: center;
          }

          .citizen-name {
            font-size: 24px;
          }

          .copy-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
