import { getCategoryDisplay, getCrewStatus } from './contractHelpers.js';
import { Users, ChevronRight, Copy, Check, Star } from 'lucide-react';
export const MyContractCard = ({
  contract,
  user,
  navigateToContract,
  fetchBids,
  handleCopyHandle,
  handleMarkComplete,
  setShowReview,
  isMultiParticipantPending
}) => {
  const categoryDisplay = getCategoryDisplay(contract.category);
  const isClient = contract.poster_id === user?.id;
  return <div key={contract.id} className={`contract-card ${contract.status}`} data-testid={`my-contract-${contract.id}`} onClick={() => contract.is_multi_crew ? navigateToContract(contract.id) : null} style={{
    cursor: contract.is_multi_crew ? 'pointer' : 'default'
  }}>
              <div className="contract-header">
                <div className="contract-type">
                  <span data-testid={`my-contract-card-contract-type-icon-${contract.id}`} className="contract-type-icon">{categoryDisplay.icon}</span>
                  <span data-testid={`my-contract-card-contract-type-label-${contract.id}`} className="contract-type-label">{categoryDisplay.label.toUpperCase()}</span>
                  {contract.is_multi_crew && <span data-testid={`my-contract-card-span-${contract.id}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--nc-cyan)',
          fontSize: '11px',
          padding: '2px 8px',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '1px solid rgba(0, 240, 255, 0.3)'
        }}>
                      <Users size={12} />
                      {getCrewStatus(contract)}
                    </span>}
                  <span data-testid={`my-contract-card-span-2-${contract.id}`} className={`status-badge status-${contract.status}`}>
                    {contract.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span data-testid={`my-contract-card-span-3-${contract.id}`} style={{
          marginLeft: 8,
          fontSize: 10,
          color: 'var(--nc-text-muted)',
          fontFamily: 'var(--nc-font-mono)'
        }}>
                    {isClient ? '(POSTED)' : '(ACCEPTED)'}
                  </span>
                </div>
              </div>
              <h3 data-testid={`my-contract-card-contract-title-${contract.id}`} className="contract-title">{contract.title}</h3>
              <div className="contract-meta">
                <span data-testid={`my-contract-card-span-4-${contract.id}`} style={{
        color: 'var(--nc-text-muted)',
        fontSize: 12
      }}>
                  {isClient ? contract.accepted_by ? `Player: ${contract.accepted_by.handle}` : 'Awaiting player...' : `Poster: ${contract.poster?.handle}`}
                </span>
              </div>
              
              {/* Contract Actions based on status */}
              <div className="contract-actions">
                {/* Multi-crew view details */}
                {contract.is_multi_crew && <button data-testid={`my-contract-card-navigate-to-contract-${contract.id}`} className="nc-btn nc-btn-primary" onClick={e => {
        e.stopPropagation();
        navigateToContract(contract.id);
      }}>
                    <Users size={14} /> Manage Crew
                    <ChevronRight size={14} />
                  </button>}
                
                {/* Poster can manage applicants on open contracts */}
                {!contract.is_multi_crew && isClient && contract.status === 'open' && <button data-testid={`my-contract-card-fetch-bids-${contract.id}`} className="nc-btn nc-btn-secondary" onClick={() => fetchBids(contract.id)}>
                    <Users size={14} /> Manage Applicants
                  </button>}
                
                {/* In Progress - Mark Complete */}
                {(contract.status === 'in_progress' || contract.status === 'pending_completion' || contract.status === 'active' || contract.poster_id === user?.id && (contract.join_mode === 'multi' || contract.is_multi_crew) && (contract.accepted_participants?.length > 0 || (contract.manifest || []).some(s => s.accepted_by?.id)) && contract.status !== 'completed' && contract.status !== 'cancelled' && contract.status !== 'expired') && <>
                    <button data-testid={`my-contract-card-handle-copy-handle-${contract.id}`} className="nc-btn nc-btn-secondary" onClick={() => handleCopyHandle(isClient ? contract.accepted_by?.handle : contract.poster?.handle)}>
                      <Copy size={14} /> Copy Handle
                    </button>
                    <button data-testid={`my-contract-card-handle-mark-complete-${contract.id}`} className="nc-btn nc-btn-primary" onClick={() => handleMarkComplete(contract)}>
                      <Check size={14} /> 
                      {contract.status === 'pending_completion' ? 'Confirm Complete' : 'Mark Complete'}
                    </button>
                  </>}
                
                {/* Completed - Show Rating if not yet rated */}
                {contract.status === 'completed' && <>
                    {isClient && !contract.client_review && <button data-testid={`my-contract-card-set-show-review-${contract.id}`} className="nc-btn nc-btn-gold" onClick={() => setShowReview({
          id: contract.id,
          isClient: true
        })}>
                        <Star size={14} /> Rate Player
                      </button>}
                    {!isClient && !contract.merc_review && contract.accepted_by?.id === user?.id && <button data-testid={`my-contract-card-set-show-review-2-${contract.id}`} className="nc-btn nc-btn-gold" onClick={() => setShowReview({
          id: contract.id,
          isClient: false
        })}>
                        <Star size={14} /> Rate Poster
                      </button>}
                    {isMultiParticipantPending(contract) && <button className="nc-btn nc-btn-gold" onClick={() => setShowReview({
          id: contract.id,
          isClient: false,
          isMultiRolePoster: true
        })} data-testid={`rate-poster-multi-${contract.id}`}>
                        <Star size={14} /> Rate Poster
                      </button>}
                  </>}
              </div>
              
              {/* Reviews Display */}
              {(contract.client_review || contract.merc_review) && <div className="contract-reviews">
                  {contract.client_review && <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Poster rated: {contract.client_review.rating}/5
                    </div>}
                  {contract.merc_review && <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Player rated: {contract.merc_review.rating}/5
                    </div>}
                </div>}
            </div>;
};
