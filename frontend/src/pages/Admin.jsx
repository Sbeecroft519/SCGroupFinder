import { useState, useEffect } from 'react';
import { Shield, Users, X, Check, RefreshCw, Activity } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastReset, setLastReset] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user?.is_admin) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, resetRes] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/last-reset`).catch(() => ({ data: { last_reset: null } }))
      ]);
      setUsers(usersRes.data || []);
      setLastReset(resetRes.data?.last_reset);
    } catch (error) {
      console.error('Admin fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetReports = async () => {
    if (!window.confirm('Reset ALL reports? This cannot be undone.')) return;
    setResetting(true);
    try {
      const res = await axios.post(`${API}/admin/reset-reports`);
      setLastReset(res.data.reset_at);
      alert('Reports reset successfully');
    } catch (e) {
      alert('Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const handleAssignBadge = async (userId, badgeId) => {
    if (!badgeId) return;
    try {
      const action = badgeId === 'REMOVE_SUPPORTER' ? 'remove' : 'add';
      await axios.post(`${API}/admin/users/${userId}/badge`, { action, badge_id: badgeId });
      fetchData();
    } catch (e) {
      alert('Badge assignment failed');
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="navcom-page" data-testid="admin-denied">
        <div className="nc-card" style={{ textAlign: 'center', padding: 60 }}>
          <Shield size={64} style={{ color: 'var(--nc-red)', marginBottom: 24 }} />
          <h2 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', marginBottom: 16 }}>
            ACCESS DENIED
          </h2>
          <p style={{ color: 'var(--nc-text-muted)' }}>Administrator privileges required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="navcom-page" data-testid="admin-page">
      <div className="page-header">
        <div className="page-label">// ADMIN_PANEL</div>
        <h1 className="page-title">Administration</h1>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="nc-stat-card">
          <div className="nc-stat-value">{users.length}</div>
          <div className="nc-stat-label">TOTAL USERS</div>
        </div>
        <div className="nc-stat-card">
          <div className="nc-stat-value">{users.filter(u => u.is_verified).length}</div>
          <div className="nc-stat-label">VERIFIED</div>
        </div>
        <div className="nc-stat-card">
          <div className="nc-stat-value">{users.filter(u => u.supporter_tier && u.supporter_tier !== 'NONE').length}</div>
          <div className="nc-stat-label">SUPPORTERS</div>
        </div>
        <div className="nc-stat-card">
          <div className="nc-stat-value">{users.filter(u => u.is_admin).length}</div>
          <div className="nc-stat-label">ADMINS</div>
        </div>
      </div>

      {/* Reset Reports Section */}
      <div className="nc-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={18} className="text-cyan" /> Signals Data Reset
            </h3>
            <p style={{ fontSize: 13, color: 'var(--nc-text-muted)' }}>
              Last reset: {lastReset ? new Date(lastReset).toLocaleString() : 'Never'}
            </p>
          </div>
          <button className="nc-btn nc-btn-danger" onClick={handleResetReports} disabled={resetting}>
            <RefreshCw size={14} className={resetting ? 'spin' : ''} />
            {resetting ? 'Resetting...' : 'Reset All Reports'}
          </button>
        </div>
      </div>

      {/* Users Management */}
      <div className="nc-card">
        <h3 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={18} className="text-cyan" /> User Management
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Email</th>
                <th>Verified</th>
                <th>Supporter Tier</th>
                <th>Assign Badge</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ color: 'var(--nc-cyan)' }}>{u.rsi_handle}</td>
                  <td>{u.email}</td>
                  <td>{u.is_verified ? <Check size={14} className="text-green" /> : <X size={14} className="text-red" />}</td>
                  <td>
                    {u.supporter_tier === 'GOLD' && <span style={{ color: '#ffd700' }}>🏆 Gold</span>}
                    {u.supporter_tier === 'SILVER' && <span style={{ color: '#c0c0c0' }}>🛡️ Silver</span>}
                    {u.supporter_tier === 'BRONZE' && <span style={{ color: '#cd7f32' }}>🪙 Bronze</span>}
                    {(!u.supporter_tier || u.supporter_tier === 'NONE') && <span style={{ color: 'var(--nc-text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <select 
                      className="nc-input" 
                      style={{ padding: '4px 8px', fontSize: 12, minWidth: 120 }}
                      onChange={(e) => handleAssignBadge(u.id, e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Assign...</option>
                      <option value="SUPPORTER_BRONZE">🪙 Bronze</option>
                      <option value="SUPPORTER_SILVER">🛡️ Silver</option>
                      <option value="SUPPORTER_GOLD">🏆 Gold</option>
                      <option value="REMOVE_SUPPORTER">❌ Remove</option>
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .nc-btn-danger {
          background: transparent;
          border: 1px solid var(--nc-red);
          color: var(--nc-red);
        }
        .nc-btn-danger:hover {
          background: rgba(255, 51, 102, 0.1);
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        .admin-table th, .admin-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--nc-border);
        }
        .admin-table th {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .admin-table td {
          font-size: 13px;
          color: var(--nc-text-secondary);
        }
        .text-green { color: var(--nc-green); }
        .text-red { color: var(--nc-red); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
