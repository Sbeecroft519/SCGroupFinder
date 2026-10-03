import { PendingRatings } from './PendingRatings.jsx';
import { MyContractCard } from './MyContractCard.jsx';
import { Users } from 'lucide-react';
export const MyContractsList = ({
  viewMode,
  myContracts,
  user,
  isMultiParticipantPending,
  setShowReview,
  navigateToContract,
  fetchBids,
  handleCopyHandle,
  handleMarkComplete
}) => {
  return <>{/* My Contracts View */}
      {viewMode === 'my' && <div className="scgf-wrap" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
        <PendingRatings myContracts={myContracts} user={user} isMultiParticipantPending={isMultiParticipantPending} setShowReview={setShowReview} />
      {/* All My Contracts */}
        <h3 data-testid="my-contracts-list-h3" style={{
        fontFamily: 'var(--nc-font-mono)',
        fontSize: 12,
        color: 'var(--nc-cyan)',
        marginBottom: 12,
        letterSpacing: 2
      }}>
          // ALL_MY_CONTRACTS
        </h3>
        {myContracts.map(contract => <MyContractCard key={contract.id} contract={contract} user={user} navigateToContract={navigateToContract} fetchBids={fetchBids} handleCopyHandle={handleCopyHandle} handleMarkComplete={handleMarkComplete} setShowReview={setShowReview} isMultiParticipantPending={isMultiParticipantPending} />)}

        {myContracts.length === 0 && <div className="nc-card" style={{
        textAlign: 'center',
        padding: 48
      }}>
            <Users size={48} className="text-muted" style={{
          marginBottom: 16,
          opacity: 0.5
        }} />
            <h3 data-testid="my-contracts-list-font-display" className="font-display text-muted" style={{
          fontSize: 16,
          marginBottom: 8
        }}>
              No Jobs Yet
            </h3>
            <p data-testid="my-contracts-list-text-muted" className="text-muted" style={{
          fontSize: 14
        }}>
              Post a job or apply to one to get started!
            </p>
          </div>}
      </div>}

      </>;
};
