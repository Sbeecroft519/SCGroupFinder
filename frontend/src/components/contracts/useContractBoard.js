import { useAuth, API } from '../../App';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCreateContract } from './useCreateContract.js';
import { useContractRatings } from './useContractRatings.js';
export const useContractBoard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState([]);
  const [myContracts, setMyContracts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('feed'); // 'feed' or 'my'
  const [showCreate, setShowCreate] = useState(false);

  // { contractId, participants:[{id,handle,rating,comment,submitted}] }
  const [myShard, setMyShard] = useState('');

  // Bidding system state
  const [myBids, setMyBids] = useState([]);
  const [showBidsModal, setShowBidsModal] = useState(null);
  const [contractBids, setContractBids] = useState([]);
  const [showHandshakeModal, setShowHandshakeModal] = useState(null);
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [showMercProfile, setShowMercProfile] = useState(null);
  const [acceptedBidNotification, setAcceptedBidNotification] = useState(null);

  // Multi-crew state

  // Duration state

  // Handle ?action=create from QuickActions FAB
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreate(true);
      // Clear the param so it doesn't persist
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Check for accepted bids (merc notification)
  useEffect(() => {
    const checkAcceptedBids = async () => {
      try {
        const response = await axios.get(`${API}/user/accepted-bids`);
        if (response.data && response.data.length > 0) {
          // Show notification for the first unacknowledged accepted bid
          setAcceptedBidNotification(response.data[0]);
        }
      } catch (e) {
        console.debug('Failed to check accepted bids:', e);
      }
    };
    if (user) {
      checkAcceptedBids();
      // Poll every 10 seconds for accepted bids
      const interval = setInterval(checkAcceptedBids, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);
  const acknowledgeAcceptedBid = async bidId => {
    try {
      await axios.post(`${API}/user/accepted-bids/${bidId}/acknowledge`);
      setAcceptedBidNotification(null);
    } catch (e) {
      console.error('Failed to acknowledge bid:', e);
    }
  };

  // New contract form state

  // Effective join_mode for this draft post — resolved client-side just for the form;
  // server resolves the canonical value too.

  // Major locations per system (curated — major hubs only)

  // Generate title based on category

  // Check if contract form is valid

  useEffect(() => {
    fetchContracts();
    fetchUserStatus();
    fetchMyContracts();
  }, [filter]);
  const fetchContracts = async () => {
    try {
      // 'all' = no filter; 'paid' = exclude LFG; specific category filter passes through
      const params = filter !== 'all' && filter !== 'paid' ? {
        category: filter
      } : {};
      const response = await axios.get(`${API}/contracts`, {
        params
      });
      let data = response.data || [];
      if (filter === 'paid') {
        data = data.filter(c => c.category !== 'LFG');
      }
      if (data.length > 0) {
        setContracts(data);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
  };
  const fetchMyContracts = async () => {
    try {
      const response = await axios.get(`${API}/user/my-contracts`);
      setMyContracts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch my contracts:', error);
    }
  };
  const fetchUserStatus = async () => {
    try {
      const [activeRes, bidsRes] = await Promise.all([axios.get(`${API}/user/active-contract`), axios.get(`${API}/user/my-bids`)]);
      setHasActiveContract(activeRes.data?.has_active || false);
      setMyBids(bidsRes.data || []);
    } catch (e) {
      console.error('Failed to fetch user status:', e);
    }
  };
  const handleBid = async contractId => {
    try {
      await axios.post(`${API}/contracts/${contractId}/bid`);
      setMyBids(prev => [...prev, {
        contract_id: contractId,
        status: 'pending'
      }]);
      fetchUserStatus();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit bid');
    }
  };
  const fetchBids = async contractId => {
    try {
      const response = await axios.get(`${API}/contracts/${contractId}/bids`);
      setContractBids(response.data || []);
      setShowBidsModal(contractId);
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    }
  };
  const handleAcceptBid = async (contractId, bidId, mercHandle) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/bids/${bidId}/accept`);
      setShowBidsModal(null);
      setShowHandshakeModal({
        type: 'poster',
        handle: mercHandle
      });
      fetchContracts();
      fetchUserStatus();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to accept bid');
    }
  };
  const handleDeclineBid = async (contractId, bidId) => {
    try {
      await axios.post(`${API}/contracts/${contractId}/bids/${bidId}/decline`);
      setContractBids(prev => prev.filter(b => b.id !== bidId));
    } catch (error) {
      alert('Failed to decline bid');
    }
  };
  const handleMarkComplete = async contract => {
    const contractId = typeof contract === 'string' ? contract : contract?.id;
    const isMulti = typeof contract === 'object' && (contract.join_mode === 'multi' || contract.is_multi_crew);
    try {
      const endpoint = isMulti ? 'mark-complete-multi' : 'mark-complete';
      const response = await axios.post(`${API}/contracts/${contractId}/${endpoint}`);
      // Multi-role poster gets the per-participant rating prompt.
      const opened = typeof contract === 'object' ? _openMultiRatingIfNeeded(contract) : false;
      if (!opened && response.data.show_rating) {
        setShowReview({
          id: contractId,
          role: 'both'
        });
      }
      fetchContracts();
      fetchUserStatus();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to mark complete');
    }
  };
  const handleCopyHandle = async handle => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(handle);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = handle;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };
  const handleCancelContract = async contractId => {
    if (!window.confirm('Are you sure you want to cancel this contract?')) return;
    try {
      await axios.post(`${API}/contracts/${contractId}/cancel`);
      // Update local state
      setContracts(prev => prev.map(c => c.id === contractId ? {
        ...c,
        status: 'cancelled'
      } : c));
      setMyContracts(prev => prev.map(c => c.id === contractId ? {
        ...c,
        status: 'cancelled'
      } : c));
    } catch (error) {
      console.error('Failed to cancel contract:', error);
      alert(error.response?.data?.detail || 'Failed to cancel contract');
    }
  };
  // Helper to get category display info

  const filteredContracts = contracts.filter(c => {
    if (filter === 'paid') return c.category !== 'LFG';
    if (filter !== 'all' && c.category !== filter) return false;
    return true;
  });
  const isMyShardContract = contract => myShard && contract.shard === myShard;
  const navigateToContract = contractId => {
    navigate(`/contracts/${contractId}`);
  };
  // Multi-role participant → poster rating pending?

  const {
    isMultiCrew,
    setIsMultiCrew,
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
    duration,
    setDuration,
    newContract,
    setNewContract,
    isLfg,
    isMedical,
    isFuture,
    showPaymentField,
    isMultiJoin,
    isContractValid,
    handleCreateContract
  } = useCreateContract({
    myShard,
    setContracts,
    setShowCreate
  });
  const {
    showReview,
    setShowReview,
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    multiRating,
    setMultiRating,
    _openMultiRatingIfNeeded,
    submitParticipantRating,
    handleSubmitReview,
    isMultiParticipantPending
  } = useContractRatings({
    user,
    fetchContracts,
    fetchMyContracts
  });
  return {
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
  };
};
