import { useState } from 'react';
import axios from 'axios';
import { Star, Clock } from 'lucide-react';
import { useAuth, API } from '../App';
import { usePendingRatings } from '../hooks/usePendingRatings';
import { OrgTag } from '../components/OrgTag';

const daysLeft = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso) - new Date();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
};

const closedAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(0, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const RatingRow = ({ item, onDone }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    setError('');
    try {
      const cid = item.contract_id;
      if (item.kind === 'poster_to_player') {
        if (item.is_multi) {
          await axios.post(`${API}/contracts/${cid}/rate-participant`, {
            participant_user_id: item.ratee_id, rating, comment: comment || null,
          });
        } else {
          await axios.post(`${API}/contracts/${cid}/review`, {
            contract_id: cid, rating, comment: comment || null, review_type: 'client_to_merc',
          });
        }
      } else if (item.is_multi) {
        await axios.post(`${API}/contracts/${cid}/rate-poster`, { rating, comment: comment || null });
      } else {
        await axios.post(`${API}/contracts/${cid}/review`, {
          contract_id: cid, rating, comment: comment || null, review_type: 'merc_to_client',
        });
      }
      onDone();
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not submit rating');
    } finally {
      setBusy(false);
    }
  };

  const remaining = daysLeft(item.expires_at);

  return (
    <div
      data-testid={`pending-rating-${item.id}`}
      style={{
        background: 'rgba(2, 11, 20, 0.85)',
        border: '1px solid var(--nc-border)',
        borderLeft: '3px solid var(--nc-gold)',
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16, color: 'var(--nc-text-primary)' }}>
            {item.contract_title || 'Completed job'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--nc-text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>
              Rate <strong style={{ color: 'var(--nc-cyan)' }}>{item.ratee_handle || 'player'}</strong>
            </span>
            <OrgTag tag={item.ratee_org_tag} orgId={item.ratee_org_id} />
            {item.slot_role && <span style={{ color: 'var(--nc-text-muted)' }}>· {item.slot_role}</span>}
            <span style={{ color: 'var(--nc-text-muted)' }}>· closed {closedAgo(item.closed_at)}</span>
          </div>
        </div>
        <div
          style={{ fontSize: 11, fontFamily: 'var(--nc-font-mono)', color: remaining !== null && remaining <= 3 ? '#ff9900' : 'var(--nc-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}
          data-testid={`pending-rating-expiry-${item.id}`}
        >
          <Clock size={12} /> {remaining === 0 ? 'expires today' : `${remaining}d left`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            data-testid={`pending-rating-star-${item.id}-${n}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'transform .15s' }}
          >
            <Star size={22} fill={n <= rating ? '#FFD700' : 'none'} color={n <= rating ? '#FFD700' : 'rgba(255,255,255,0.3)'} />
          </button>
        ))}
      </div>

      <textarea
        className="nc-input"
        rows={2}
        placeholder="Optional note"
        value={comment}
        onChange={e => setComment(e.target.value)}
        style={{ marginTop: 12, width: '100%' }}
        data-testid={`pending-rating-comment-${item.id}`}
      />

      {error && <div style={{ color: '#ff4d4d', fontSize: 12, marginTop: 8 }} data-testid={`pending-rating-error-${item.id}`}>{error}</div>}

      <button
        className="nc-btn nc-btn-primary"
        style={{ marginTop: 12 }}
        disabled={!rating || busy}
        onClick={submit}
        data-testid={`pending-rating-submit-${item.id}`}
      >
        {busy ? 'SUBMITTING…' : 'SUBMIT RATING'}
      </button>
    </div>
  );
};

export default function PendingRatings() {
  const { user } = useAuth();
  const { items, loading, refresh } = usePendingRatings(Boolean(user));

  return (
    <div className="nc-page" data-testid="pending-ratings-page" style={{ padding: '24px 20px', maxWidth: 820, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-label">// REPUTATION</div>
        <h1 className="page-title">Ratings Pending</h1>
      </div>
      <p style={{ color: 'var(--nc-text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
        Every rating you still owe. These stay here until you give them — your rating and theirs
        stay hidden from each other until both are in, and anything left for 14 days is marked not rated.
      </p>

      {loading && items.length === 0 && (
        <div style={{ color: 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)', fontSize: 12 }}>LOADING…</div>
      )}

      {!loading && items.length === 0 && (
        <div
          data-testid="pending-ratings-empty"
          style={{ border: '1px dashed var(--nc-border)', padding: 32, textAlign: 'center', color: 'var(--nc-text-muted)' }}
        >
          Nothing owed. You're all square.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map(item => (
          <RatingRow key={item.id} item={item} onDone={refresh} />
        ))}
      </div>
    </div>
  );
}
