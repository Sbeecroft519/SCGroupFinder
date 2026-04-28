import { useState, useEffect } from 'react';
import { Shield, Users, X, Check, RefreshCw, Activity, Map, Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';

const ROADMAP_STATUSES = ['STABLE', 'IN_PROGRESS', 'PLANNED', 'BACKLOG'];
const STATUS_COLORS = {
  STABLE: '#00ff88',
  IN_PROGRESS: '#00f0ff',
  PLANNED: '#ffd700',
  BACKLOG: '#888'
};

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastReset, setLastReset] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [demoStats, setDemoStats] = useState(null);
  const [wipingDemo, setWipingDemo] = useState(false);
  
  // Roadmap state
  const [roadmapItems, setRoadmapItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ title: '', description: '', status: 'PLANNED' });

  useEffect(() => {
    if (user?.is_admin) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, resetRes, roadmapRes, demoRes] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/last-reset`).catch(() => ({ data: { last_reset: null } })),
        axios.get(`${API}/admin/roadmap`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/demo/stats`).catch(() => ({ data: null })),
      ]);
      setUsers(usersRes.data || []);
      setLastReset(resetRes.data?.last_reset);
      setRoadmapItems(roadmapRes.data || []);
      setDemoStats(demoRes.data);
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

  const handleDeleteUser = async (u) => {
    const ok = window.prompt(
      `Type the user's RSI handle "${u.rsi_handle}" to permanently delete this account and all of their contracts/bids. This cannot be undone.`
    );
    if (ok !== u.rsi_handle) return;
    try {
      await axios.delete(`${API}/admin/users/${u.id}`);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Delete failed');
    }
  };

  const handleWipeDemo = async () => {
    const ok = window.confirm(
      'Wipe ALL demo accounts, demo contracts, and demo bids?\n\nThis is irreversible. The next demo login will reseed fresh sample content.'
    );
    if (!ok) return;
    setWipingDemo(true);
    try {
      const r = await axios.post(`${API}/admin/demo/wipe`);
      alert(`Wiped: ${r.data.users_deleted} users, ${r.data.contracts_deleted} contracts, ${r.data.bids_deleted} bids.`);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Wipe failed');
    } finally {
      setWipingDemo(false);
    }
  };

  // Roadmap handlers
  const handleSaveRoadmapItem = async () => {
    try {
      if (editingItem) {
        await axios.put(`${API}/admin/roadmap/${editingItem.id}`, newItem);
      } else {
        await axios.post(`${API}/admin/roadmap`, newItem);
      }
      setNewItem({ title: '', description: '', status: 'PLANNED' });
      setEditingItem(null);
      fetchData();
    } catch (e) {
      alert('Failed to save roadmap item');
    }
  };

  const handleDeleteRoadmapItem = async (id) => {
    if (!window.confirm('Delete this roadmap item?')) return;
    try {
      await axios.delete(`${API}/admin/roadmap/${id}`);
      fetchData();
    } catch (e) {
      alert('Failed to delete item');
    }
  };

  const startEditItem = (item) => {
    setEditingItem(item);
    setNewItem({ title: item.title, description: item.description, status: item.status });
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

      {/* Tab Navigation */}
      <div className="nc-toggle-group" style={{ marginBottom: 24 }}>
        <button className={`nc-toggle ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={14} /> Users
        </button>
        <button className={`nc-toggle ${activeTab === 'roadmap' ? 'active' : ''}`} onClick={() => setActiveTab('roadmap')}>
          <Map size={14} /> Roadmap
        </button>
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

      {/* Users Tab */}
      {activeTab === 'users' && (
      <div className="nc-card">
        <h3 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={18} className="text-cyan" /> User Management
        </h3>

        {/* Demo Mode panel */}
        {demoStats && (
          <div data-testid="demo-mode-panel" style={{
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            padding: '12px 16px', marginBottom: 20,
            background: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderLeft: `3px solid ${demoStats.enabled ? 'var(--nc-cyan)' : '#888'}`,
          }}>
            <span style={{
              fontFamily: 'var(--nc-font-mono)', fontSize: 11, letterSpacing: 1,
              color: demoStats.enabled ? 'var(--nc-cyan)' : '#888',
              padding: '3px 8px', border: `1px solid ${demoStats.enabled ? 'var(--nc-cyan)' : '#888'}`,
            }} data-testid="demo-mode-pill">
              👁 DEMO MODE · {demoStats.enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <span style={{ fontFamily: 'var(--nc-font-mono)', fontSize: 12, color: 'var(--nc-text-secondary)' }}>
              <strong style={{ color: 'var(--nc-text-primary)' }} data-testid="demo-users-count">{demoStats.demo_users}</strong> demo accounts ·{' '}
              <strong style={{ color: 'var(--nc-text-primary)' }}>{demoStats.demo_contracts}</strong> contracts ·{' '}
              <strong style={{ color: 'var(--nc-text-primary)' }}>{demoStats.demo_bids}</strong> bids
            </span>
            <button
              type="button"
              onClick={handleWipeDemo}
              disabled={wipingDemo || demoStats.demo_users === 0}
              style={{
                marginLeft: 'auto', background: 'transparent',
                border: '1px solid #ff4466', color: '#ff4466',
                padding: '6px 14px', fontSize: 11, letterSpacing: 1,
                fontFamily: 'var(--nc-font-mono)', cursor: 'pointer',
                opacity: (wipingDemo || demoStats.demo_users === 0) ? 0.5 : 1,
              }}
              data-testid="wipe-demo-btn"
            >
              🧹 {wipingDemo ? 'WIPING...' : 'WIPE DEMO DATA'}
            </button>
          </div>
        )}

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
                <th>Actions</th>
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
                  <td>
                    {u.is_admin ? (
                      <span style={{ color: 'var(--nc-text-muted)', fontSize: 11 }}>—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        style={{ background: 'transparent', border: '1px solid #ff4466', color: '#ff4466', padding: '4px 10px', fontSize: 11, fontFamily: 'var(--nc-font-mono)', cursor: 'pointer', letterSpacing: 1 }}
                        data-testid={`delete-user-${u.id}`}
                      >
                        🗑 DELETE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Roadmap Tab */}
      {activeTab === 'roadmap' && (
      <div className="nc-card">
        <h3 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Map size={18} className="text-cyan" /> Roadmap Management
        </h3>
        
        {/* Add/Edit Form */}
        <div style={{ background: 'var(--nc-bg-secondary)', padding: 20, marginBottom: 24, border: '1px solid var(--nc-border)' }}>
          <h4 style={{ color: 'var(--nc-cyan)', fontSize: 12, letterSpacing: 1, marginBottom: 16 }}>
            {editingItem ? '// EDIT_ITEM' : '// ADD_NEW_ITEM'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              placeholder="Feature Title"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              className="nc-input"
              style={{ padding: '12px 16px' }}
              data-testid="roadmap-title-input"
            />
            <textarea
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="nc-input"
              style={{ padding: '12px 16px', minHeight: 80, resize: 'vertical' }}
              data-testid="roadmap-description-input"
            />
            <select
              value={newItem.status}
              onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
              className="nc-input"
              style={{ padding: '12px 16px' }}
              data-testid="roadmap-status-select"
            >
              {ROADMAP_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="nc-btn nc-btn-primary" 
                onClick={handleSaveRoadmapItem}
                disabled={!newItem.title.trim()}
                data-testid="roadmap-save-btn"
              >
                {editingItem ? 'Update' : 'Add'} Item
              </button>
              {editingItem && (
                <button 
                  className="nc-btn nc-btn-secondary"
                  onClick={() => {
                    setEditingItem(null);
                    setNewItem({ title: '', description: '', status: 'PLANNED' });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {roadmapItems.length === 0 && (
            <p style={{ color: 'var(--nc-text-muted)', textAlign: 'center', padding: 32 }}>
              No roadmap items yet. Add one above.
            </p>
          )}
          {roadmapItems.map(item => (
            <div key={item.id} style={{ 
              padding: 16, 
              background: 'var(--nc-bg-secondary)', 
              border: '1px solid var(--nc-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ 
                    fontSize: 11, 
                    padding: '4px 8px', 
                    background: `${STATUS_COLORS[item.status]}20`,
                    border: `1px solid ${STATUS_COLORS[item.status]}`,
                    color: STATUS_COLORS[item.status],
                    letterSpacing: 1
                  }}>
                    {item.status}
                  </span>
                  <h4 style={{ color: 'var(--nc-text-primary)', fontSize: 15, margin: 0 }}>
                    {item.title}
                  </h4>
                </div>
                <p style={{ color: 'var(--nc-text-muted)', fontSize: 13, margin: 0 }}>
                  {item.description}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="nc-btn nc-btn-secondary"
                  onClick={() => startEditItem(item)}
                  style={{ padding: '8px 12px' }}
                  data-testid={`edit-roadmap-${item.id}`}
                >
                  <Edit size={14} />
                </button>
                <button 
                  className="nc-btn nc-btn-danger"
                  onClick={() => handleDeleteRoadmapItem(item.id)}
                  style={{ padding: '8px 12px' }}
                  data-testid={`delete-roadmap-${item.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

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
