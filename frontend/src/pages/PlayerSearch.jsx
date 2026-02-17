import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Star } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

export default function PlayerSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const response = await axios.get(`${API}/users/search`, {
        params: { q: searchQuery }
      });
      setResults(response.data.users || []);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="navcom-page" data-testid="player-search-page">
      <div className="page-header">
        <div className="page-label">// CITIZEN_LOOKUP</div>
        <h1 className="page-title">Player Search</h1>
        <p className="page-subtitle">Find and view other pilots' profiles</p>
      </div>

      <div className="nc-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            placeholder="Search by RSI handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="nc-input"
            style={{ flex: 1, padding: '14px 16px' }}
            data-testid="player-search-input"
          />
          <button 
            className="nc-btn nc-btn-primary"
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            data-testid="player-search-btn"
            style={{ padding: '14px 24px' }}
          >
            <Search size={16} />
            SEARCH
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--nc-text-muted)' }}>
          Searching...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="nc-card" style={{ textAlign: 'center', padding: 48 }}>
          <User size={48} style={{ color: 'var(--nc-text-muted)', opacity: 0.5, marginBottom: 16 }} />
          <p style={{ color: 'var(--nc-text-muted)' }}>No pilots found matching "{searchQuery}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map(user => (
            <Link 
              key={user.id} 
              to={`/profile/${user.id}`}
              className="nc-card"
              style={{ 
                padding: 16, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                textDecoration: 'none',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              data-testid={`search-result-${user.id}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid var(--nc-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--nc-cyan)'
                }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ color: 'var(--nc-text-primary)', fontFamily: 'var(--nc-font-display)', fontSize: 16, letterSpacing: 1 }}>
                    {user.handle}
                  </div>
                  <div style={{ color: 'var(--nc-text-muted)', fontSize: 12, marginTop: 4 }}>
                    {user.rank}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nc-gold)' }}>
                <Star size={14} fill="currentColor" />
                <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 14 }}>{user.reputation?.toFixed(1) || '5.0'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
