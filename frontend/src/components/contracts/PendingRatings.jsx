import { getCategoryDisplay } from './contractHelpers.js';
import { Star } from 'lucide-react';
export const PendingRatings = ({
  myContracts,
  user,
  isMultiParticipantPending,
  setShowReview
}) => {
  return <>{/* Pending Ratings Section */}
        {myContracts.filter(c => c.status === 'completed' && c.poster_id === user?.id && !c.client_review || c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review || isMultiParticipantPending(c)).length > 0 && <div className="pending-ratings-section">
            <h3 data-testid="pending-ratings-h3" style={{
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 12,
        color: 'var(--nc-gold)',
        marginBottom: 12,
        letterSpacing: 2
      }}>
              // PENDING_RATINGS
            </h3>
            {myContracts.filter(c => c.status === 'completed' && c.poster_id === user?.id && !c.client_review || c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review || isMultiParticipantPending(c)).map(contract => {
        const categoryDisplay = getCategoryDisplay(contract.category);
        const isClient = contract.poster_id === user?.id;
        const isMultiPoster = isMultiParticipantPending(contract);
        return <div key={contract.id} className="contract-card pending-rating" data-testid={`pending-contract-${contract.id}`}>
                  <div className="contract-header">
                    <div className="contract-type">
                      <span data-testid={`pending-ratings-contract-type-icon-${contract.id}`} className="contract-type-icon">{categoryDisplay.icon}</span>
                      <span data-testid={`pending-ratings-contract-type-label-${contract.id}`} className="contract-type-label">{categoryDisplay.label.toUpperCase()}</span>
                      <span data-testid={`pending-ratings-status-badge-${contract.id}`} className="status-badge status-completed">COMPLETED</span>
                    </div>
                  </div>
                  <h3 data-testid={`pending-ratings-contract-title-${contract.id}`} className="contract-title">{contract.title}</h3>
                  <div className="contract-meta">
                    <span data-testid={`pending-ratings-span-${contract.id}`} style={{
              color: 'var(--nc-text-muted)',
              fontSize: 12
            }}>
                      {isClient ? `Player: ${contract.accepted_by?.handle}` : `Poster: ${contract.poster?.handle}`}
                    </span>
                  </div>
                  <div className="contract-actions">
                    <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({
              id: contract.id,
              isClient,
              isMultiRolePoster: isMultiPoster
            })} data-testid={`rate-btn-${contract.id}`}>
                      <Star size={14} /> Rate {isClient ? 'Player' : 'Poster'}
                    </button>
                  </div>
                </div>;
      })}
          </div>}

        </>;
};
