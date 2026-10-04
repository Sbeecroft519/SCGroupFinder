import { useState } from 'react';
import axios from 'axios';
import { Star, Clock } from 'lucide-react';
import { useAuth, API } from '../App';
import { usePendingRatings } from '../hooks/usePendingRatings';
import { OrgTag } from '../components/OrgTag';
import { PRAISE_TAGS } from '../constants/praise';

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
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (t) => {
    setTags(prev => prev.includes(t)
      ? prev.filter(x => x !== t)
      : (prev.length >= 3 ? prev : [...prev, t]));
  };

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    setError('');
    try {
      await axios.post(`${API}/ratings/pending/${item.id}`, {
        rating,
        comment: comment || null,
        tags,
      });
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
            <OrgTag tag={item.ratee_org_tag} orgId={item.ratee_org_id} verified={item.ratee_org_verified} />
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

      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--nc-text-muted)', marginBottom: 8 }}>
          COMMENDATIONS (PICK UP TO 3)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRAISE_TAGS.map(t => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                data-testid={`praise-tag-${item.id}-${t.replace(/\s+/g, '-').toLowerCase()}`}
                style={{
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '4px 9px',
                  fontFamily: 'var(--nc-font-mono)',
                  color: on ? '#06131f' : 'var(--nc-text-secondary)',
                  background: on ? 'var(--nc-gold, #FFD700)' : 'rgba(0,240,255,0.05)',
                  border: `1px solid ${on ? 'var(--nc-gold, #FFD700)' : 'rgba(0,240,255,0.25)'}`,
                  transition: 'background-color .15s, color .15s, border-color .15s',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        className="nc-input"
        rows={2}
        maxLength={280}
        placeholder="Short written feedback (optional)"
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
