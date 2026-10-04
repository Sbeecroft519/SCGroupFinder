import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const styles = {
  container: { background: 'rgba(2, 11, 20, 0.85)', border: '1px solid var(--nc-border)', marginTop: 16 },
  dropdown: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', cursor: 'pointer', color: 'var(--nc-text-primary)',
    fontSize: 14, borderBottom: '1px solid var(--nc-border)',
  },
  content: { padding: '14px 18px', borderBottom: '1px solid var(--nc-border)' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: 'var(--nc-text-secondary)' },
  chip: {
    fontSize: 11, padding: '3px 9px', fontFamily: 'var(--nc-font-mono)',
    color: 'var(--nc-gold, #FFD700)', background: 'rgba(255,215,0,0.08)',
    border: '1px solid rgba(255,215,0,0.3)',
  },
};

const ago = (iso) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d > 30) return `${Math.floor(d / 30)}mo ago`;
  return d > 0 ? `${d}d ago` : 'today';
};

export default function ProfileExtras({ userId }) {
  const [commendations, setCommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState({ commendations: false, history: false });

  useEffect(() => {
    if (!userId) return;
    axios.get(`${API}/users/${userId}/praise`).then(r => setCommendations(r.data?.praise || [])).catch(() => {});
    axios.get(`${API}/users/${userId}/rating-history?limit=5`).then(r => setHistory(r.data?.ratings || [])).catch(() => {});
  }, [userId]);

  const toggle = (k) => setOpen(p => ({ ...p, [k]: !p[k] }));
  const total = commendations.reduce((s, c) => s + c.count, 0);

  return (
    <div style={styles.container} data-testid="profile-extras">
      <div style={styles.dropdown} onClick={() => toggle('commendations')} data-testid="commendations-toggle">
        <span>Commendations{total > 0 ? ` (${total})` : ''}</span>
        {open.commendations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      {open.commendations && (
        <div style={styles.content} data-testid="commendations-content">
          {commendations.length === 0 ? (
            <div style={{ color: 'var(--nc-text-muted)', fontSize: 13 }}>No commendations yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {commendations.map(c => (
                <span key={c.tag} style={styles.chip} data-testid={`commendation-${c.tag.replace(/\s+/g, '-').toLowerCase()}`}>
                  {c.tag} ×{c.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.dropdown} onClick={() => toggle('history')} data-testid="rating-history-toggle">
        <span>Rating History</span>
        {open.history ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      {open.history && (
        <div style={styles.content} data-testid="rating-history-content">
          {history.length === 0 ? (
            <div style={{ color: 'var(--nc-text-muted)', fontSize: 13 }}>No ratings received yet.</div>
          ) : history.map((r, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < history.length - 1 ? '1px solid var(--nc-border)' : 'none' }} data-testid={`rating-history-entry-${i}`}>
              <div style={styles.row}>
                <span style={{ color: 'var(--nc-text-primary)' }}>{r.contract_title || 'Completed job'}</span>
                <span style={{ color: 'var(--nc-gold, #FFD700)', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--nc-font-mono)' }}>
                  <Star size={12} fill="#FFD700" /> {r.rating}/5
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)' }}>
                {r.reviewer_handle || 'A player'} · {ago(r.created_at)}
              </div>
              {r.comment && (
                <p style={{ fontSize: 13, color: 'var(--nc-text-secondary)', lineHeight: 1.5, margin: '6px 0 0', fontStyle: 'italic' }}>
                  “{r.comment}”
                </p>
              )}
              {(r.tags || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {r.tags.map(t => <span key={t} style={styles.chip}>{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
