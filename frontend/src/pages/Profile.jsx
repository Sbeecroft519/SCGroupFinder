import { useState } from 'react';
import { User, Star, Shield, Award, Copy, Check, Edit2 } from 'lucide-react';
import { useAuth } from '../App';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [copiedHandle, setCopiedHandle] = useState(false);

  const handleCopyHandle = () => {
    if (user?.rsi_handle) {
      navigator.clipboard.writeText(user.rsi_handle);
      setCopiedHandle(true);
      setTimeout(() => setCopiedHandle(false), 2000);
    }
  };

  // Calculate pilot rank based on reputation
  const getPilotRank = (rep) => {
    if (rep >= 4.8) return 'Admiral';
    if (rep >= 4.5) return 'Captain';
    if (rep >= 4.0) return 'Commander';
    if (rep >= 3.5) return 'Lieutenant';
    if (rep >= 3.0) return 'Ensign';
    return 'Cadet';
  };

  const reputation = user?.reputation || 4.5;
  const rank = getPilotRank(reputation);
  const contractsCompleted = user?.contracts_completed || 12;
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Dec 2025';

  return (
    <div className="navcom-page" data-testid="profile-page">
      <div className="page-header">
        <div className="page-label">// PILOT_LICENSE</div>
        <h1 className="page-title">Identity Card</h1>
      </div>

      {/* Main Profile Card */}
      <div className={`profile-card ${user?.is_supporter ? 'supporter' : ''}`}>
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <span className="avatar-initials">
              {user?.rsi_handle?.slice(0, 2).toUpperCase() || 'NC'}
            </span>
          </div>
          <div className="profile-info">
            <div className="profile-handle-row">
              <h2 className="profile-handle">{user?.rsi_handle || 'Pilot'}</h2>
              {user?.is_supporter && (
                <span className="supporter-badge">SYNDICATE</span>
              )}
            </div>
            <button className="copy-handle-btn" onClick={handleCopyHandle}>
              {copiedHandle ? <Check size={12} className="text-green" /> : <Copy size={12} />}
              {copiedHandle ? 'Copied!' : 'Copy Handle'}
            </button>
          </div>
        </div>

        {/* Profile Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <Award size={20} className="text-cyan" />
            <div className="stat-content">
              <span className="stat-label">RANK</span>
              <span className="stat-value">{rank}</span>
            </div>
          </div>
          <div className="profile-stat">
            <Star size={20} className="text-gold" />
            <div className="stat-content">
              <span className="stat-label">REPUTATION</span>
              <span className="stat-value">{reputation.toFixed(1)}</span>
            </div>
          </div>
          <div className="profile-stat">
            <Shield size={20} className="text-green" />
            <div className="stat-content">
              <span className="stat-label">CONTRACTS</span>
              <span className="stat-value">{contractsCompleted}</span>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="profile-details">
          <div className="detail-row">
            <span className="detail-label">EMAIL</span>
            <span className="detail-value">{user?.email || 'pilot@navcom.space'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">MEMBER SINCE</span>
            <span className="detail-value">{memberSince}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">STATUS</span>
            <span className="detail-value text-green">VERIFIED</span>
          </div>
        </div>

        {/* Badges */}
        <div className="profile-badges">
          <h3 className="badges-title">EARNED BADGES</h3>
          <div className="badges-grid">
            <div className="badge-item" title="Early Adopter">
              <Shield size={24} className="text-cyan" />
              <span>Pioneer</span>
            </div>
            {user?.is_supporter && (
              <div className="badge-item" title="Syndicate Member">
                <Star size={24} className="text-gold" />
                <span>Syndicate</span>
              </div>
            )}
            {contractsCompleted >= 10 && (
              <div className="badge-item" title="10+ Contracts">
                <Award size={24} className="text-green" />
                <span>Veteran</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-card {
          max-width: 600px;
          background: var(--nc-bg-card);
          border: 2px solid var(--nc-border);
          padding: 32px;
        }
        
        .profile-card.supporter {
          border-color: var(--nc-gold);
          box-shadow: var(--nc-glow-gold);
        }
        
        .profile-header {
          display: flex;
          gap: 20px;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--nc-border);
        }
        
        .profile-avatar {
          width: 80px;
          height: 80px;
          background: var(--nc-bg-secondary);
          border: 2px solid var(--nc-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .supporter .profile-avatar {
          border-color: var(--nc-gold);
        }
        
        .avatar-initials {
          font-family: var(--nc-font-display);
          font-size: 28px;
          color: var(--nc-cyan);
        }
        
        .supporter .avatar-initials {
          color: var(--nc-gold);
        }
        
        .profile-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }
        
        .profile-handle-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .profile-handle {
          font-family: var(--nc-font-display);
          font-size: 24px;
          color: var(--nc-cyan);
          letter-spacing: 2px;
        }
        
        .supporter .profile-handle {
          color: var(--nc-gold);
          text-shadow: var(--nc-glow-gold);
        }
        
        .copy-handle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          cursor: pointer;
          padding: 4px 0;
        }
        
        .copy-handle-btn:hover {
          color: var(--nc-cyan);
        }
        
        .profile-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .profile-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .stat-label {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
        }
        
        .stat-value {
          font-family: var(--nc-font-display);
          font-size: 16px;
          color: var(--nc-text-primary);
        }
        
        .profile-details {
          margin-bottom: 32px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--nc-border);
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
        }
        
        .detail-value {
          font-family: var(--nc-font-body);
          font-size: 14px;
          color: var(--nc-text-primary);
        }
        
        .profile-badges {
          padding-top: 24px;
          border-top: 1px solid var(--nc-border);
        }
        
        .badges-title {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          letter-spacing: 2px;
          margin-bottom: 16px;
        }
        
        .badges-grid {
          display: flex;
          gap: 16px;
        }
        
        .badge-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
        }
        
        .badge-item span {
          font-family: var(--nc-font-mono);
          font-size: 10px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        @media (max-width: 640px) {
          .profile-stats {
            grid-template-columns: 1fr;
          }
          
          .badges-grid {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
