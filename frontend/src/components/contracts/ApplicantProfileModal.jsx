import { X, Users, Star, Shield } from 'lucide-react';
export const ApplicantProfileModal = ({
  showMercProfile,
  setShowMercProfile
}) => {
  return <>{/* Applicant Profile Modal */}
      {showMercProfile && <div data-testid="applicant-profile-modal-set-show-merc-profile" className="mission-modal-overlay" onClick={() => setShowMercProfile(null)}>
          <div data-testid="applicant-profile-modal-mission-modal" role="dialog" aria-modal="true" className="mission-modal" onClick={e => e.stopPropagation()} style={{
        maxWidth: 450
      }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// PILOT_DOSSIER</div>
                <h2 data-testid="applicant-profile-modal-mission-title" className="mission-title">Applicant Profile</h2>
              </div>
              <button data-testid="applicant-profile-modal-set-show-merc-profile-2" className="mission-modal-close" onClick={() => setShowMercProfile(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              <div className="merc-profile-header">
                <div className="merc-avatar-large">
                  {showMercProfile.avatar_url ? <img src={showMercProfile.avatar_url} alt="" /> : <Users size={64} />}
                </div>
                <h3 data-testid="applicant-profile-modal-merc-handle" className="merc-handle">{showMercProfile.handle}</h3>
              </div>
              <div className="merc-stats-grid">
                <div className="merc-stat">
                  <Star size={24} color="#FFD700" fill="#FFD700" />
                  <span data-testid="applicant-profile-modal-stat-value" className="stat-value">{showMercProfile.reputation?.toFixed(1) || '5.0'}</span>
                  <span data-testid="applicant-profile-modal-stat-label" className="stat-label">RATING</span>
                </div>
                <div className="merc-stat">
                  <Shield size={24} color="var(--nc-cyan)" />
                  <span data-testid="applicant-profile-modal-stat-value-2" className="stat-value">{showMercProfile.contracts_completed || 0}</span>
                  <span data-testid="applicant-profile-modal-stat-label-2" className="stat-label">COMPLETED</span>
                </div>
              </div>
            </div>
          </div>
        </div>}

      </>;
};
