import { useState } from 'react';
import { _collectParticipants } from './contractHelpers.js';
import axios from 'axios';
import { API } from '../../App';
export const useContractRatings = ({
  user,
  fetchContracts,
  fetchMyContracts
}) => {
  const [showReview, setShowReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [multiRating, setMultiRating] = useState(null);
  const _openMultiRatingIfNeeded = contract => {
    if (!contract || contract.poster_id !== user?.id) return false;
    const isMulti = contract.join_mode === 'multi' || contract.is_multi_crew;
    if (!isMulti) return false;
    const participants = _collectParticipants(contract);
    if (participants.length === 0) return false;
    setMultiRating({
      contractId: contract.id,
      contractTitle: contract.title,
      participants: participants.map(p => ({
        ...p,
        rating: 0,
        comment: '',
        submitted: false
      }))
    });
    return true;
  };
  const submitParticipantRating = async participantId => {
    if (!multiRating) return;
    const p = multiRating.participants.find(x => x.id === participantId);
    if (!p || p.submitted || !p.rating) return;
    try {
      await axios.post(`${API}/contracts/${multiRating.contractId}/rate-participant`, {
        participant_user_id: participantId,
        rating: p.rating,
        comment: p.comment || null
      });
      setMultiRating(prev => prev && {
        ...prev,
        participants: prev.participants.map(x => x.id === participantId ? {
          ...x,
          submitted: true
        } : x)
      });
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit rating');
    }
  };
  const handleSubmitReview = async () => {
    if (!showReview) return;
    try {
      if (showReview.isMultiRolePoster) {
        await axios.post(`${API}/contracts/${showReview.id}/rate-poster`, {
          rating: reviewRating,
          comment: reviewComment || null
        });
      } else {
        await axios.post(`${API}/contracts/${showReview.id}/review`, {
          contract_id: showReview.id,
          rating: reviewRating,
          comment: reviewComment,
          review_type: showReview.isClient ? 'client_to_merc' : 'merc_to_client'
        });
      }
      setShowReview(null);
      setReviewRating(5);
      setReviewComment('');
      fetchContracts();
      fetchMyContracts();
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert(error.response?.data?.detail || 'Failed to submit review');
    }
  };
  const isMultiParticipantPending = c => {
    if (!user || c?.status !== 'completed') return false;
    if (c.poster_id === user.id) return false;
    const isMulti = c.join_mode === 'multi' || c.is_multi_crew;
    if (!isMulti) return false;
    const inParticipants = (c.accepted_participants || []).some(p => p?.id === user.id);
    const inManifest = (c.manifest || []).some(s => s?.accepted_by?.id === user.id);
    if (!inParticipants && !inManifest) return false;
    const alreadyRated = (c.poster_ratings || []).some(r => r?.reviewer_id === user.id);
    return !alreadyRated;
  };
  return {
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
  };
};
