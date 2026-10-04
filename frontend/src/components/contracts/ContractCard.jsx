import { getCategoryDisplay, getCrewSeatSummary, getContractPayout, getTimeRemaining, getTimeAgo } from './contractHelpers.js';
import { Users, MapPin, Star } from 'lucide-react';
import DiscordBadge from '../DiscordBadge';
import { OrgTag } from '../OrgTag';
import { RescueCardSummary } from './RescueCardSummary.jsx';
import { ContractActions } from './ContractActions.jsx';
export const ContractCard = ({
  contract,
  isMyShardContract,
  navigateToContract,
  user,
  myBids,
  fetchBids,
  handleBid,
  hasActiveContract,
  handleCopyHandle,
  handleMarkComplete,
  handleCancelContract,
  setShowReview
}) => {
  const categoryDisplay = getCategoryDisplay(contract.category);
  const isMyShard = isMyShardContract(contract);
  const crewSeats = getCrewSeatSummary(contract);
  const isLootSplit = contract.compensation_type && contract.compensation_type !== 'Flat Fee';
  const isSplitProfits = contract.split_profits;
  return <div key={contract.id} className={`contract-card ${isMyShard ? 'my-shard' : 'global'}`} data-testid={`contract-${contract.id}`} onClick={() => contract.is_multi_crew ? navigateToContract(contract.id) : null} style={{
    cursor: contract.is_multi_crew ? 'pointer' : 'default'
  }}>
              <div className="contract-header">
                <div className="contract-type">
                  <span data-testid={`contract-card-contract-type-icon-${contract.id}`} className="contract-type-icon">{categoryDisplay.icon}</span>
                  <span data-testid={`contract-card-contract-type-label-${contract.id}`} className="contract-type-label">{categoryDisplay.label.toUpperCase()}</span>
                  {contract.is_multi_crew && <span data-testid={`contract-card-span-${contract.id}`} style={{
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
                      {crewSeats ? `${crewSeats.filled}/${crewSeats.total} SEATS` : ''}
                    </span>}
                </div>
                
                {/* Payment Display */}
                <div className="scgf-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
                  {contract.category === 'LFG' ? <span data-testid={`contract-card-span-2-${contract.id}`} style={{
          background: 'rgba(255, 102, 0, 0.15)',
          border: '1px solid #ff6600',
          color: '#ff6600',
          padding: '4px 10px',
          fontSize: 11,
          letterSpacing: 1,
          fontFamily: 'var(--nc-font-mono)'
        }}>
                      👥 LFG · NO PAYOUT
                    </span> : contract.category === 'MEDICAL' ? (/* Medical / rescue posts always display the flat-fee payout the poster entered */
        <span data-testid={`contract-card-payment-amount-${contract.id}`} className="payment-amount">{getContractPayout(contract).toLocaleString()} aUEC</span>) : isSplitProfits ? <span data-testid={`contract-card-span-3-${contract.id}`} style={{
          color: 'var(--nc-cyan)',
          fontSize: 13,
          fontFamily: 'var(--nc-font-mono)'
        }}>
                      💰 SPLIT PROFITS
                    </span> : isLootSplit ? <span data-testid={`contract-card-loot-split-badge-${contract.id}`} className="loot-split-badge">
                      {contract.compensation_type === 'Equal Split' ? 'LOOT SPLIT' : '% SHARE'}
                    </span> : getContractPayout(contract) > 0 ? <span data-testid={`contract-card-payment-amount-2-${contract.id}`} className="payment-amount">{getContractPayout(contract).toLocaleString()} aUEC</span> : null}
                  {/* Show IN PROGRESS badge for active contracts */}
                  {['active', 'in_progress'].includes(contract.status) ? <span data-testid={`contract-card-span-4-${contract.id}`} style={{
          background: 'rgba(0, 255, 136, 0.2)',
          border: '1px solid #00ff88',
          color: '#00ff88',
          padding: '4px 8px',
          fontSize: '11px',
          letterSpacing: '1px',
          fontFamily: 'var(--nc-font-mono)'
        }}>
                      IN PROGRESS
                    </span> : contract.status === 'cancelled' ? <span data-testid={`contract-card-span-5-${contract.id}`} style={{
          background: 'rgba(255, 77, 77, 0.2)',
          border: '1px solid #ff4d4d',
          color: '#ff4d4d',
          padding: '4px 8px',
          fontSize: '11px',
          letterSpacing: '1px',
          fontFamily: 'var(--nc-font-mono)'
        }}>
                      CANCELLED
                    </span> : (() => {
          const timeInfo = getTimeRemaining(contract);
          if (!timeInfo) return <span data-testid={`contract-card-contract-time-${contract.id}`} className="contract-time">{getTimeAgo(contract.created_at)}</span>;
          return <span data-testid={`contract-card-span-6-${contract.id}`} style={{
            fontSize: 11,
            fontFamily: 'var(--nc-font-mono)',
            color: timeInfo.color,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
                        {timeInfo.isDistress ? '🚨' : '⏱️'} {timeInfo.text}
                      </span>;
        })()}
                </div>
              </div>

              <h3 data-testid={`contract-card-contract-title-${contract.id}`} className="contract-title">{contract.title}</h3>
              
              {/* Crew seat roll-up — makes a crew job scannable straight from the list */}
              {crewSeats && <div data-testid={`crew-seats-${contract.id}`} style={{
      fontFamily: 'var(--nc-font-mono)',
      fontSize: 11,
      letterSpacing: 1,
      color: crewSeats.filled === crewSeats.total ? '#00ff88' : 'var(--nc-cyan)',
      margin: '6px 0 0'
    }}>
                  {crewSeats.filled}/{crewSeats.total} SEATS FILLED
                  {crewSeats.openRoles.length > 0 && <span style={{
        color: 'var(--nc-text-muted)'
      }}> — OPEN: {crewSeats.openRoles.join(', ')}</span>}
                </div>}
              
              {/* Contract Description */}
              {contract.description && <p data-testid={`contract-card-p-${contract.id}`} style={{
      color: 'var(--nc-text-secondary)',
      fontSize: 13,
      margin: '8px 0 12px',
      lineHeight: 1.5,
      maxHeight: 60,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}>
                  {contract.description}
                </p>}

              <div className="contract-meta">
                <div className="contract-meta-item">
                  <MapPin size={12} />
                  {contract.meeting_visibility === 'disclosed_on_acceptance' ? 'Disclosed on Acceptance' : contract.category === 'MEDICAL' ? `${contract.meeting_system || contract.system || 'Unknown'} (exact location private)` : contract.location || (contract.meeting_system && contract.meeting_major_location ? `${contract.meeting_system} - ${contract.meeting_major_location}` : contract.meeting_system || contract.planet || 'Location TBD')}
                </div>
                <div className="contract-meta-item">
                  <Users size={12} />
                  {contract.shard ? contract.shard : 'Any Region'}
                </div>
                <div className="contract-meta-item">
                  <Star size={12} className="text-gold" />
                  {contract.poster?.reputation?.toFixed(1) || '0.0'}
                  <OrgTag tag={contract.poster?.org_tag} orgId={contract.poster?.org_id} verified={contract.poster?.org_verified} testId={`poster-org-tag-${contract.id}`} />
                  <DiscordBadge discordLinked={contract.poster?.discord_linked} discordUsername={contract.poster?.discord_username} />
                </div>
                {/* Timing badge */}
                {contract.timing_type === 'future' && contract.scheduled_start_at ? <div className="contract-meta-item" style={{
        color: '#aa00ff',
        borderLeft: '1px solid rgba(170,0,255,0.4)',
        paddingLeft: 8
      }} data-testid={`timing-badge-future-${contract.id}`}>
                    📅 Scheduled: {new Date(contract.scheduled_start_at).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}{contract.scheduled_timezone ? ` ${contract.scheduled_timezone}` : ''}
                  </div> : <div className="contract-meta-item" style={{
        color: 'var(--nc-cyan)'
      }} data-testid={`timing-badge-now-${contract.id}`}>
                    🚨 Looking Now
                  </div>}
                {contract.poster?.is_supporter && <span data-testid={`contract-card-supporter-badge-${contract.id}`} className="supporter-badge" style={{
        marginLeft: 'auto'
      }}>SYNDICATE</span>}
              </div>

              {/* Medical / Rescue public detail strip */}
              {contract.category === 'MEDICAL' && <RescueCardSummary contract={contract} />}

              <ContractActions contract={contract} user={user} myBids={myBids} navigateToContract={navigateToContract} fetchBids={fetchBids} handleBid={handleBid} hasActiveContract={hasActiveContract} handleCopyHandle={handleCopyHandle} handleMarkComplete={handleMarkComplete} handleCancelContract={handleCancelContract} setShowReview={setShowReview} />
    {/* Reviews Display */}
              {(contract.client_review || contract.merc_review) && <div className="contract-reviews">
                  {contract.client_review && <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Poster: {contract.client_review.rating}/5
                    </div>}
                  {contract.merc_review && <div className="review-badge">
                      <Star size={12} fill="#FFD700" /> Player: {contract.merc_review.rating}/5
                    </div>}
                </div>}
            </div>;
};
