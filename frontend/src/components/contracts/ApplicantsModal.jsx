import { X, Users, Star } from 'lucide-react';
import { OrgTag } from '../OrgTag';
export const ApplicantsModal = ({
  showBidsModal,
  setShowBidsModal,
  contractBids,
  setShowMercProfile,
  navigate,
  handleAcceptBid,
  handleDeclineBid
}) => {
  return <>{/* Manage Applicants Modal */}
      {showBidsModal && <div data-testid="applicants-modal-set-show-bids-modal" className="mission-modal-overlay" onClick={() => setShowBidsModal(null)}>
          <div data-testid="applicants-modal-mission-modal" role="dialog" aria-modal="true" className="mission-modal" onClick={e => e.stopPropagation()} style={{
        maxWidth: 550
      }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// APPLICANTS</div>
                <h2 data-testid="applicants-modal-mission-title" className="mission-title">Manage Applicants</h2>
              </div>
              <button data-testid="applicants-modal-set-show-bids-modal-2" className="mission-modal-close" onClick={() => setShowBidsModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              {contractBids.length === 0 ? <p data-testid="applicants-modal-p" style={{
            textAlign: 'center',
            color: 'var(--nc-text-muted)',
            padding: 32
          }}>
                  No applicants yet. Check back soon!
                </p> : <div className="bids-list">
                  {contractBids.filter(b => b.status === 'pending').map(bid => <div key={bid.id} className="pilot-card">
                      <div data-testid={`applicants-modal-set-show-merc-profile-${bid.id}`} className="pilot-avatar clickable" onClick={() => setShowMercProfile(bid.bidder)} title="View Profile">
                        {bid.bidder?.avatar_url ? <img src={bid.bidder.avatar_url} alt="" /> : <Users size={32} />}
                      </div>
                      <div data-testid={`applicants-modal-set-show-merc-profile-2-${bid.id}`} className="pilot-info clickable" onClick={() => setShowMercProfile(bid.bidder)}>
                        <h4 data-testid={`applicants-modal-h4-${bid.id}`}>{bid.bidder?.handle || 'Unknown'} <OrgTag tag={bid.org_tag} orgId={bid.org_id} testId={`applicant-org-tag-${bid.id}`} /></h4>
                        <div className="pilot-stats">
                          <span data-testid={`applicants-modal-span-${bid.id}`}><Star size={12} fill="#FFD700" /> {bid.bidder?.reputation?.toFixed(1) || '5.0'}</span>
                          <span data-testid={`applicants-modal-span-2-${bid.id}`}>{bid.bidder?.contracts_completed || 0} contracts</span>
                        </div>
                        <span data-testid={`applicants-modal-view-profile-hint-${bid.id}`} className="view-profile-hint">Click to view profile</span>
                      </div>
                      <div className="pilot-actions">
                        <button data-testid={`applicants-modal-nc-btn-${bid.id}`} className="nc-btn nc-btn-secondary" onClick={() => navigate(`/profile/${bid.bidder_id}`)} style={{
                  fontSize: 10,
                  padding: '8px 12px'
                }}>
                          View Profile
                        </button>
                        <button data-testid={`applicants-modal-handle-accept-bid-${bid.id}`} className="nc-btn nc-btn-primary" onClick={() => handleAcceptBid(showBidsModal, bid.id, bid.bidder?.handle)}>
                          Accept
                        </button>
                        <button data-testid={`applicants-modal-handle-decline-bid-${bid.id}`} className="nc-btn nc-btn-secondary" onClick={() => handleDeclineBid(showBidsModal, bid.id)}>
                          Decline
                        </button>
                      </div>
                    </div>)}
                </div>}
            </div>
          </div>
        </div>}

      </>;
};
