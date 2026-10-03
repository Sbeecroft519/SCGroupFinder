import { Users, ChevronRight, Check, ThumbsUp, Copy, X, Star } from 'lucide-react';
export const ContractActions = ({
  contract,
  user,
  myBids,
  navigateToContract,
  fetchBids,
  handleBid,
  hasActiveContract,
  handleCopyHandle,
  handleMarkComplete,
  handleCancelContract,
  setShowReview
}) => {
  return <><div className="contract-actions">
                {(() => {
        const isMulti = (contract.join_mode || 'single') === 'multi';
        const accepted = contract.accepted_participants || [];
        const acceptedIds = accepted.map(p => p.id);
        const maxP = contract.max_participants || 8;
        const isFull = isMulti && accepted.length >= maxP;
        const isAccepted = isMulti && user && acceptedIds.includes(user.id);
        const alreadyApplied = myBids.some(b => b.contract_id === contract.id);
        const isPoster = contract.poster_id === user?.id;
        const isOpen = contract.status === 'open';
        return <>
                      {/* Capacity badge for multi-join events */}
                      {isMulti && <span className="status-badge" data-testid={`capacity-${contract.id}`} style={{
            background: isFull ? 'rgba(255,68,102,0.12)' : 'rgba(0,240,255,0.10)',
            color: isFull ? '#ff4466' : 'var(--nc-cyan)',
            border: `1px solid ${isFull ? '#ff4466' : 'var(--nc-cyan)'}`
          }}>
                          👥 {accepted.length}/{maxP}{isFull ? ' · FULL' : ''}
                        </span>}

                      {/* Status badge — hide "in progress / active" noise on multi events.
                          For multi events the post is always considered open to joiners. */}
                      {contract.status && contract.status !== 'open' && !isMulti && <span data-testid={`contract-actions-span-${contract.id}`} className={`status-badge status-${contract.status}`}>
                          {contract.status.replace('_', ' ').toUpperCase()}
                        </span>}

                      {/* Multi-crew: View Details button */}
                      {contract.is_multi_crew && <button className="nc-btn nc-btn-primary" onClick={e => {
            e.stopPropagation();
            navigateToContract(contract.id);
          }} data-testid={`view-crew-${contract.id}`}>
                          <Users size={14} /> View Crew Slots
                          <ChevronRight size={14} />
                        </button>}

                      {/* Poster actions */}
                      {!contract.is_multi_crew && isPoster && isOpen && <button data-testid={`contract-actions-fetch-bids-${contract.id}`} className="nc-btn nc-btn-secondary" onClick={() => fetchBids(contract.id)}>
                          <Users size={14} /> Manage Applicants
                        </button>}

                      {/* Applicant actions */}
                      {!contract.is_multi_crew && !isPoster && isOpen && (isAccepted ? <button className="nc-btn nc-btn-secondary" disabled data-testid={`joined-${contract.id}`}>
                            <Check size={14} /> Joined
                          </button> : alreadyApplied ? <button data-testid={`contract-actions-nc-btn-${contract.id}`} className="nc-btn nc-btn-secondary" disabled>
                            <Check size={14} /> Application Sent
                          </button> : isFull ? <button className="nc-btn nc-btn-secondary" disabled data-testid={`full-${contract.id}`}>
                            Group Full
                          </button> : <button className="nc-btn nc-btn-primary" onClick={() => handleBid(contract.id)} disabled={!isMulti && hasActiveContract} title={!isMulti && hasActiveContract ? 'You already have an active contract' : ''} data-testid={`apply-${contract.id}`}>
                            <ThumbsUp size={14} /> {isMulti ? 'Join Group' : 'Apply to Join'}
                          </button>)}
                    </>;
      })()}
                
                {/* In Progress - Show Handle & Mark Complete */}
                {(contract.status === 'in_progress' || contract.status === 'pending_completion' || contract.status === 'active' || contract.poster_id === user?.id && (contract.join_mode === 'multi' || contract.is_multi_crew) && (contract.accepted_participants?.length > 0 || (contract.manifest || []).some(s => s.accepted_by?.id)) && contract.status !== 'completed' && contract.status !== 'cancelled' && contract.status !== 'expired') && <>
                    <button data-testid={`contract-actions-handle-copy-handle-${contract.id}`} className="nc-btn nc-btn-secondary" onClick={() => handleCopyHandle(contract.poster_id === user?.id ? contract.accepted_by?.handle : contract.poster?.handle)}>
                      <Copy size={14} /> Copy Handle
                    </button>
                    <button data-testid={`contract-actions-handle-mark-complete-${contract.id}`} className="nc-btn nc-btn-primary" onClick={() => handleMarkComplete(contract)}>
                      <Check size={14} /> 
                      {contract.status === 'pending_completion' ? 'Confirm Complete' : 'Mark Complete'}
                    </button>
                  </>}
                
                {/* Cancel button for contract owner — one button, all live statuses */}
                {contract.poster_id === user?.id && ['open', 'mustering', 'in_progress', 'pending_completion', 'active'].includes(contract.status) && <button onClick={() => handleCancelContract(contract.id)} data-testid={`cancel-btn-${contract.id}`} style={{
        background: 'transparent',
        border: '1px solid #ff4d4d',
        color: '#ff4d4d',
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'var(--nc-font-display)',
        letterSpacing: '1px'
      }}>
                    <X size={14} style={{
          marginRight: 4,
          verticalAlign: 'middle'
        }} />
                    CANCEL
                  </button>}
                
                {/* Completed - Show Rating for each party */}
                {contract.status === 'completed' && <>
                    {/* Poster can rate player if they haven't yet */}
                    {contract.poster_id === user?.id && !contract.client_review && <button data-testid={`contract-actions-set-show-review-${contract.id}`} className="nc-btn nc-btn-gold" onClick={() => setShowReview({
          id: contract.id,
          isClient: true
        })}>
                        <Star size={14} /> Rate Player
                      </button>}
                    {/* Player can rate poster if they haven't yet */}
                    {contract.accepted_by?.id === user?.id && !contract.merc_review && <button data-testid={`contract-actions-set-show-review-2-${contract.id}`} className="nc-btn nc-btn-gold" onClick={() => setShowReview({
          id: contract.id,
          isClient: false
        })}>
                        <Star size={14} /> Rate Poster
                      </button>}
                  </>}
              </div>
              
              </>;
};
