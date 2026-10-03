import { X, Star } from 'lucide-react';
export const ReviewModal = ({
  showReview,
  setShowReview,
  setReviewRating,
  reviewRating,
  reviewComment,
  setReviewComment,
  handleSubmitReview
}) => {
  return <>{/* Review Modal */}
      {showReview && <div data-testid="review-modal-set-show-review" className="mission-modal-overlay" onClick={() => setShowReview(null)}>
          <div data-testid="review-modal-mission-modal" role="dialog" aria-modal="true" className="mission-modal" onClick={e => e.stopPropagation()} style={{
        maxWidth: 400
      }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// REVIEW</div>
                <h2 data-testid="review-modal-mission-title" className="mission-title">Rate {showReview.isClient ? 'Player' : 'Poster'}</h2>
              </div>
              <button data-testid="review-modal-set-show-review-2" className="mission-modal-close" onClick={() => setShowReview(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => <button data-testid={`review-modal-set-review-rating-${star}`} key={star} onClick={() => setReviewRating(star)} className={`star-btn ${star <= reviewRating ? 'active' : ''}`}>
                    <Star size={32} fill={star <= reviewRating ? '#FFD700' : 'none'} />
                  </button>)}
              </div>
              <textarea data-testid="review-modal-set-review-comment" className="nc-input" rows={3} placeholder="Optional comment..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} style={{
            marginTop: 16
          }} />
              <button data-testid="review-modal-handle-submit-review" className="nc-btn nc-btn-primary" style={{
            width: '100%',
            marginTop: 16
          }} onClick={handleSubmitReview}>
                SUBMIT REVIEW
              </button>
            </div>
          </div>
        </div>}

      </>;
};
