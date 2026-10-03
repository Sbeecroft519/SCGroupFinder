import { X, Star } from 'lucide-react';
export const CrewRatingModal = ({
  multiRating,
  setMultiRating,
  submitParticipantRating
}) => {
  return <>{/* Multi-role Rating Prompt */}
      {multiRating && <div data-testid="crew-rating-modal-set-multi-rating" className="mission-modal-overlay" onClick={() => setMultiRating(null)}>
          <div role="dialog" aria-modal="true" className="mission-modal" onClick={e => e.stopPropagation()} style={{
        maxWidth: 520,
        maxHeight: '85vh',
        overflow: 'auto'
      }} data-testid="multi-rating-modal">
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// RATE_CREW</div>
                <h2 data-testid="crew-rating-modal-mission-title" className="mission-title">Rate Your Crew</h2>
                <div style={{
              fontSize: 12,
              color: 'var(--nc-text-muted)',
              marginTop: 4
            }}>{multiRating.contractTitle}</div>
              </div>
              <button className="mission-modal-close" onClick={() => setMultiRating(null)} data-testid="multi-rating-close">
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content scgf-wrap" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}>
              {multiRating.participants.length === 0 && <div style={{
            color: 'var(--nc-text-muted)',
            fontSize: 13
          }}>No crew members to rate.</div>}
              {multiRating.participants.map((p, idx) => <div key={p.id} data-testid={`multi-rating-row-${p.id}`} style={{
            padding: 12,
            border: '1px solid rgba(0,240,255,0.2)',
            background: p.submitted ? 'rgba(0,240,255,0.06)' : 'transparent',
            opacity: p.submitted ? 0.7 : 1
          }}>
                  <div className="scgf-wrap" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8
            }}>
                    <div>
                      <strong data-testid={`crew-rating-modal-strong-${idx}`} style={{
                  color: 'var(--nc-cyan)',
                  fontFamily: 'var(--nc-font-mono)'
                }}>{p.handle || 'Unknown'}</strong>
                      {p.slot && <span data-testid={`crew-rating-modal-span-${idx}`} style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: 'var(--nc-text-muted)'
                }}>· {p.slot}</span>}
                    </div>
                    {p.submitted && <span data-testid={`crew-rating-modal-span-2-${idx}`} style={{
                color: 'var(--nc-success, #6bff9e)',
                fontSize: 11
              }}>✓ Rated</span>}
                  </div>
                  {!p.submitted && <>
                      <div className="rating-stars" style={{
                marginBottom: 8
              }}>
                        {[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => setMultiRating(prev => ({
                  ...prev,
                  participants: prev.participants.map((x, i) => i === idx ? {
                    ...x,
                    rating: star
                  } : x)
                }))} className={`star-btn ${star <= p.rating ? 'active' : ''}`} data-testid={`multi-rating-star-${p.id}-${star}`}>
                            <Star size={22} fill={star <= p.rating ? '#FFD700' : 'none'} />
                          </button>)}
                      </div>
                      <textarea className="nc-input" rows={2} placeholder="Optional comment..." value={p.comment} onChange={e => setMultiRating(prev => ({
                ...prev,
                participants: prev.participants.map((x, i) => i === idx ? {
                  ...x,
                  comment: e.target.value
                } : x)
              }))} data-testid={`multi-rating-comment-${p.id}`} />
                      <button className="nc-btn nc-btn-primary" style={{
                width: '100%',
                marginTop: 8
              }} disabled={!p.rating} onClick={() => submitParticipantRating(p.id)} data-testid={`multi-rating-submit-${p.id}`}>
                        SUBMIT RATING
                      </button>
                    </>}
                </div>)}
              <button className="nc-btn" style={{
            width: '100%',
            marginTop: 4
          }} onClick={() => setMultiRating(null)} data-testid="multi-rating-done">
                {multiRating.participants.every(p => p.submitted) ? 'DONE' : 'FINISH LATER'}
              </button>
            </div>
          </div>
        </div>}

      </>;
};
