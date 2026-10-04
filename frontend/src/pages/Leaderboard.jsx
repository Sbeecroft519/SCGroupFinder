import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy } from 'lucide-react';
import { API } from '../App';
import { OrgTag } from '../components/OrgTag';

const MEDALS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function Leaderboard() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/leaderboard/commendations?month=${month}`)
      .then(res => setBoards(res.data?.boards || []))
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  }, [month]);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  return (
    <div className="nc-page" data-testid="leaderboard-page" style={{ padding: '24px 20px', maxWidth: 980, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-label">// RECOGNITION</div>
        <h1 className="page-title">Commendations Leaderboard</h1>
      </div>
      <p style={{ color: 'var(--nc-text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
        The crew your fellow players called out most this month — best pilots, gunners, medics and more.
      </p>

      <select
        className="nc-input"
        value={month}
        onChange={e => setMonth(e.target.value)}
        style={{ maxWidth: 220, marginBottom: 24 }}
        data-testid="leaderboard-month-select"
      >
        {months.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      {loading && <div style={{ color: 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)', fontSize: 12 }}>LOADING…</div>}

      {!loading && boards.length === 0 && (
        <div style={{ border: '1px dashed var(--nc-border)', padding: 32, textAlign: 'center', color: 'var(--nc-text-muted)' }} data-testid="leaderboard-empty">
          No commendations handed out this month yet. Rate your crew and they'll show up here.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {boards.map(b => (
          <div key={b.tag} data-testid={`leaderboard-board-${b.tag.replace(/\s+/g, '-').toLowerCase()}`} style={{ border: '1px solid var(--nc-border)', borderLeft: '3px solid var(--nc-gold, #FFD700)', background: 'rgba(2,11,20,0.85)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, color: 'var(--nc-gold, #FFD700)', fontFamily: 'var(--nc-font-mono)', fontSize: 12, letterSpacing: 1 }}>
              <Trophy size={14} /> {b.tag.toUpperCase()}
            </div>
            {b.leaders.map((l, i) => (
              <div key={l.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
                <span style={{ width: 18, color: MEDALS[i] || 'var(--nc-text-muted)', fontFamily: 'var(--nc-font-mono)' }}>{i + 1}</span>
                <Link to={`/profile/${l.user_id}`} style={{ color: 'var(--nc-text-primary)', textDecoration: 'none' }}>{l.handle}</Link>
                <OrgTag tag={l.org_tag} orgId={l.org_id} verified={l.org_verified} />
                <span style={{ marginLeft: 'auto', color: 'var(--nc-gold, #FFD700)', fontFamily: 'var(--nc-font-mono)' }}>×{l.count}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
