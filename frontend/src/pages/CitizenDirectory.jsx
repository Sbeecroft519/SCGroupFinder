import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Search, ChevronUp, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const CitizenDirectory = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rank');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users/directory`);
      setUsers(res.data);
    } catch (e) {
      console.error('Failed to fetch directory:', e);
    }
    setLoading(false);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const filtered = users
    .filter(u => u.rsi_handle?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'rank') {
        aVal = a.rank_points || 0;
        bVal = b.rank_points || 0;
      } else if (sortBy === 'rating') {
        aVal = a.reputation?.average || 0;
        bVal = b.reputation?.average || 0;
      } else if (sortBy === 'jobs') {
        aVal = a.reputation?.total_reviews || 0;
        bVal = b.reputation?.total_reviews || 0;
      } else {
        aVal = a.rsi_handle?.toLowerCase() || '';
        bVal = b.rsi_handle?.toLowerCase() || '';
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const SortHeader = ({ field, label }) => (
    <th 
      onClick={() => handleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortBy === field && (sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
      </div>
    </th>
  );

  const getRankTitle = (points) => {
    if (points >= 5000) return 'Admiral';
    if (points >= 2500) return 'Captain';
    if (points >= 1000) return 'Commander';
    if (points >= 500) return 'Lieutenant';
    if (points >= 100) return 'Ensign';
    return 'Recruit';
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          size={14} 
          fill={i <= rating ? 'var(--nc-gold)' : 'transparent'}
          style={{ color: i <= rating ? 'var(--nc-gold)' : 'var(--nc-text-muted)' }}
        />
      );
    }
    return <div style={{ display: 'flex', gap: 2 }}>{stars}</div>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Citizen Directory</h1>
        <p className="page-subtitle">Browse registered pilots and mercenaries</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--nc-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="nc-input"
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--nc-text-muted)' }}>Loading...</div>
      ) : (
        <div className="nc-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nc-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontFamily: 'var(--nc-font-display)', fontSize: 12, color: 'var(--nc-text-muted)' }}>CITIZEN</th>
                <SortHeader field="rank" label="RANK" />
                <SortHeader field="rating" label="RATING" />
                <SortHeader field="jobs" label="JOBS" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr 
                  key={user.id}
                  onClick={() => navigate(`/profile/${user.id}`)}
                  style={{ 
                    borderBottom: '1px solid var(--nc-border)', 
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--nc-bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img 
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.rsi_handle}&background=0a1520&color=00f0ff`}
                        alt=""
                        style={{ width: 40, height: 40, borderRadius: 4, border: '1px solid var(--nc-border)' }}
                      />
                      <div>
                        <div style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-cyan)' }}>{user.rsi_handle}</div>
                        {user.supporter_tier && user.supporter_tier !== 'NONE' && (
                          <span style={{ fontSize: 10, color: 'var(--nc-gold)' }}>⭐ {user.supporter_tier}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 13 }}>
                      {getRankTitle(user.rank_points)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {renderStars(Math.round(user.reputation?.average || 0))}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--nc-text-secondary)' }}>
                    {user.reputation?.total_reviews || 0}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--nc-text-muted)' }}>
                    No citizens found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CitizenDirectory;
