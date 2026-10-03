import { useContractBoard } from '../components/contracts/useContractBoard.js';
import { ReviewModal } from '../components/contracts/ReviewModal.jsx';
import { CrewRatingModal } from '../components/contracts/CrewRatingModal.jsx';
import { CreatePostModal } from '../components/contracts/CreatePostModal.jsx';
import { ContractToolbar } from '../components/contracts/ContractToolbar.jsx';
import { ContractCard } from '../components/contracts/ContractCard.jsx';
import { Users } from 'lucide-react';
import { MyContractsList } from '../components/contracts/MyContractsList.jsx';
import { ApplicantsModal } from '../components/contracts/ApplicantsModal.jsx';
import { HandshakeModal } from '../components/contracts/HandshakeModal.jsx';
import { AcceptedBidModal } from '../components/contracts/AcceptedBidModal.jsx';
import { ApplicantProfileModal } from '../components/contracts/ApplicantProfileModal.jsx';
import '../components/contracts/contracts.css';
export default function Contracts() {
  const {
    showReview,
    setShowReview,
    setReviewRating,
    reviewRating,
    reviewComment,
    setReviewComment,
    handleSubmitReview,
    multiRating,
    setMultiRating,
    submitParticipantRating,
    showCreate,
    setShowCreate,
    isLfg,
    setNewContract,
    setIsMultiCrew,
    newContract,
    isFuture,
    isMedical,
    isMultiCrew,
    manifest,
    setManifest,
    basePayout,
    setBasePayout,
    crewRoles,
    setCrewRoles,
    crewPayTotal,
    setCrewPayTotal,
    totalSeats,
    perSeatPayout,
    showPaymentField,
    duration,
    setDuration,
    isMultiJoin,
    handleCreateContract,
    isContractValid,
    myShard,
    setMyShard,
    viewMode,
    setViewMode,
    myContracts,
    user,
    filter,
    setFilter,
    filteredContracts,
    isMyShardContract,
    navigateToContract,
    myBids,
    fetchBids,
    handleBid,
    hasActiveContract,
    handleCopyHandle,
    handleMarkComplete,
    handleCancelContract,
    isMultiParticipantPending,
    showBidsModal,
    setShowBidsModal,
    contractBids,
    setShowMercProfile,
    navigate,
    handleAcceptBid,
    handleDeclineBid,
    showHandshakeModal,
    setShowHandshakeModal,
    acceptedBidNotification,
    acknowledgeAcceptedBid,
    showMercProfile
  } = useContractBoard();
  return <div className="navcom-page" data-testid="contracts-page">
      <ReviewModal showReview={showReview} setShowReview={setShowReview} setReviewRating={setReviewRating} reviewRating={reviewRating} reviewComment={reviewComment} setReviewComment={setReviewComment} handleSubmitReview={handleSubmitReview} />
    <CrewRatingModal multiRating={multiRating} setMultiRating={setMultiRating} submitParticipantRating={submitParticipantRating} />
    <CreatePostModal showCreate={showCreate} setShowCreate={setShowCreate} isLfg={isLfg} setNewContract={setNewContract} setIsMultiCrew={setIsMultiCrew} newContract={newContract} isFuture={isFuture} isMedical={isMedical} isMultiCrew={isMultiCrew} manifest={manifest} setManifest={setManifest} basePayout={basePayout} setBasePayout={setBasePayout} crewRoles={crewRoles} setCrewRoles={setCrewRoles} crewPayTotal={crewPayTotal} setCrewPayTotal={setCrewPayTotal} totalSeats={totalSeats} perSeatPayout={perSeatPayout} showPaymentField={showPaymentField} duration={duration} setDuration={setDuration} isMultiJoin={isMultiJoin} handleCreateContract={handleCreateContract} isContractValid={isContractValid} />
    <ContractToolbar myShard={myShard} setMyShard={setMyShard} setShowCreate={setShowCreate} viewMode={viewMode} setViewMode={setViewMode} myContracts={myContracts} user={user} filter={filter} setFilter={setFilter} />
    {/* Contracts Feed - Only show on Feed view */}
      {viewMode === 'feed' && <div className="scgf-wrap" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
        {filteredContracts.map(contract => <ContractCard key={contract.id} contract={contract} isMyShardContract={isMyShardContract} navigateToContract={navigateToContract} user={user} myBids={myBids} fetchBids={fetchBids} handleBid={handleBid} hasActiveContract={hasActiveContract} handleCopyHandle={handleCopyHandle} handleMarkComplete={handleMarkComplete} handleCancelContract={handleCancelContract} setShowReview={setShowReview} />)}

        {filteredContracts.length === 0 && <div className="nc-card" style={{
        textAlign: 'center',
        padding: 48
      }}>
            <Users size={48} className="text-muted" style={{
          marginBottom: 16,
          opacity: 0.5
        }} />
            <h3 data-testid="contracts-font-display" className="font-display text-muted" style={{
          fontSize: 16,
          marginBottom: 8
        }}>
              No Active Jobs
            </h3>
            <p data-testid="contracts-text-muted" className="text-muted" style={{
          fontSize: 14
        }}>
              Be the first to post a job!
            </p>
          </div>}
      </div>}

      <MyContractsList viewMode={viewMode} myContracts={myContracts} user={user} isMultiParticipantPending={isMultiParticipantPending} setShowReview={setShowReview} navigateToContract={navigateToContract} fetchBids={fetchBids} handleCopyHandle={handleCopyHandle} handleMarkComplete={handleMarkComplete} />
    <ApplicantsModal showBidsModal={showBidsModal} setShowBidsModal={setShowBidsModal} contractBids={contractBids} setShowMercProfile={setShowMercProfile} navigate={navigate} handleAcceptBid={handleAcceptBid} handleDeclineBid={handleDeclineBid} />
    <HandshakeModal showHandshakeModal={showHandshakeModal} handleCopyHandle={handleCopyHandle} setShowHandshakeModal={setShowHandshakeModal} />
    <AcceptedBidModal acceptedBidNotification={acceptedBidNotification} handleCopyHandle={handleCopyHandle} acknowledgeAcceptedBid={acknowledgeAcceptedBid} />
    <ApplicantProfileModal showMercProfile={showMercProfile} setShowMercProfile={setShowMercProfile} />

    </div>;
}
