import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, DollarSign, Users, Target, X, Check, RefreshCw, Activity } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';

export default function Admin() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('goals');
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', target_amount: 100 });
  const [lastReset, setLastReset] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user?.is_admin) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [goalsRes, contribRes, usersRes, resetRes] = await Promise.all([
        axios.get(`${API}/admin/goals`),
        axios.get(`${API}/admin/contributions`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/last-reset`).catch(() => ({ data: { last_reset: null } }))
      ]);
      setGoals(goalsRes.data || []);
      setContributions(contribRes.data || []);
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

  const handleCreateGoal = async () => {
    try {
      if (editingGoal) {
        await axios.put(`${API}/admin/goals/${editingGoal.id}`, goalForm);
      } else {
        await axios.post(`${API}/admin/goals`, goalForm);
      }
      setShowGoalModal(false);
      setEditingGoal(null);
      setGoalForm({ title: '', description: '', target_amount: 100 });
      fetchData();
    } catch (error) {
      console.error('Goal save error:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await axios.delete(`${API}/admin/goals/${goalId}`);
      fetchData();
    } catch (error) {
      console.error('Goal delete error:', error);
    }
  };

  const openEditGoal = (goal) => {
    setEditingGoal(goal);
    setGoalForm({ title: goal.title, description: goal.description, target_amount: goal.target_amount });
    setShowGoalModal(true);
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

  const totalContributions = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalBackers = new Set(contributions.map(c => c.user_id)).size;

  return (
    <div className="navcom-page" data-testid="admin-page">
      <div className="page-header">
        <div className="page-label">// ADMIN_PANEL</div>
        <h1 className="page-title">Administration</h1>
      </div>

      {/* Reset Reports Section */}
      <div className="nc-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="nc-stat-card">
          <div className="nc-stat-value">{goals.length}</div>
          <div className="nc-stat-label">GOALS</div>
        </div>
        <div className="nc-stat-card">
          <div className="nc-stat-value">${totalContributions}</div>
          <div className="nc-stat-label">TOTAL RAISED</div>
        </div>
        <div className="nc-stat-card">
          <div className="nc-stat-value">{totalBackers}</div>
          <div className="nc-stat-label">UNIQUE BACKERS</div>
        </div>
        <div className="nc-stat-card">
          <div className="nc-stat-value">{users.length}</div>
          <div className="nc-stat-label">USERS</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="nc-toggle-group" style={{ marginBottom: 24 }}>
        {[
          { id: 'goals', label: 'Goals', icon: Target },
          { id: 'contributions', label: 'Contributions', icon: DollarSign },
          { id: 'users', label: 'Users', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            className={`nc-toggle ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="nc-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)' }}>
              Roadmap Goals
            </h3>
            <button className="nc-btn nc-btn-primary" onClick={() => { setEditingGoal(null); setGoalForm({ title: '', description: '', target_amount: 100 }); setShowGoalModal(true); }}>
              <Plus size={14} /> New Goal
            </button>
          </div>
          
          {goals.map(goal => (
            <div key={goal.id} className="admin-goal-row">
              <div className="admin-goal-info">
                <h4>{goal.title}</h4>
                <p>{goal.description}</p>
                <div className="admin-goal-meta">
                  <span>${goal.current_amount} / ${goal.target_amount}</span>
                  <span>{goal.backers} backers</span>
                  <span className={`status-badge ${goal.status}`}>{goal.status}</span>
                </div>
              </div>
              <div className="admin-goal-actions">
                <button className="nc-btn nc-btn-secondary" onClick={() => openEditGoal(goal)}>
                  <Edit2 size={14} />
                </button>
                <button className="nc-btn nc-btn-danger" onClick={() => handleDeleteGoal(goal.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contributions Tab */}
      {activeTab === 'contributions' && (
        <div className="nc-card">
          <h3 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', marginBottom: 24 }}>
            Recent Contributions
          </h3>
          {contributions.length === 0 ? (
            <p style={{ color: 'var(--nc-text-muted)', textAlign: 'center', padding: 40 }}>No contributions yet</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Goal</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map(c => (
                  <tr key={c.id}>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>{c.user_id?.slice(0, 8)}...</td>
                    <td>{goals.find(g => g.id === c.goal_id)?.title || c.goal_id}</td>
                    <td className="text-green">${c.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="nc-card">
          <h3 style={{ fontFamily: 'var(--nc-font-display)', color: 'var(--nc-text-primary)', marginBottom: 24 }}>
            Registered Users
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Email</th>
                <th>Verified</th>
                <th>Badges</th>
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
                    {(u.badges || []).filter(b => b.startsWith('SUPPORTER')).map(b => (
                      <span key={b} style={{ marginRight: 4 }}>
                        {b === 'SUPPORTER_GOLD' ? '🥇' : b === 'SUPPORTER_SILVER' ? '🥈' : '🥉'}
                      </span>
                    ))}
                  </td>
                  <td>
                    <select 
                      className="nc-input" 
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      onChange={(e) => handleAssignBadge(u.id, e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Assign...</option>
                      <option value="SUPPORTER_BRONZE">🥉 Bronze</option>
                      <option value="SUPPORTER_SILVER">🥈 Silver</option>
                      <option value="SUPPORTER_GOLD">🥇 Gold</option>
                      <option value="REMOVE_SUPPORTER">Remove</option>
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="mission-modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// {editingGoal ? 'EDIT' : 'CREATE'}_GOAL</div>
                <h2 className="mission-title">{editingGoal ? 'Edit Goal' : 'New Goal'}</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowGoalModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              <div className="form-group">
                <label className="nc-label">TITLE</label>
                <input
                  type="text"
                  className="nc-input"
                  value={goalForm.title}
                  onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Goal title"
                />
              </div>
              <div className="form-group">
                <label className="nc-label">DESCRIPTION</label>
                <textarea
                  className="nc-input"
                  rows={3}
                  value={goalForm.description}
                  onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Goal description"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label className="nc-label">TARGET AMOUNT ($)</label>
                <input
                  type="number"
                  className="nc-input"
                  value={goalForm.target_amount}
                  onChange={e => setGoalForm(f => ({ ...f, target_amount: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </div>
              <button className="nc-btn nc-btn-primary" style={{ width: '100%' }} onClick={handleCreateGoal}>
                {editingGoal ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-goal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          margin-bottom: 12px;
        }
        .admin-goal-info h4 {
          font-family: var(--nc-font-display);
          font-size: 16px;
          color: var(--nc-text-primary);
          margin-bottom: 4px;
        }
        .admin-goal-info p {
          font-size: 13px;
          color: var(--nc-text-secondary);
          margin-bottom: 8px;
        }
        .admin-goal-meta {
          display: flex;
          gap: 16px;
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
        }
        .admin-goal-actions {
          display: flex;
          gap: 8px;
        }
        .status-badge {
          padding: 2px 8px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .status-badge.active { background: rgba(0, 255, 136, 0.2); color: var(--nc-green); }
        .status-badge.planned { background: rgba(0, 240, 255, 0.2); color: var(--nc-cyan); }
        .status-badge.completed { background: rgba(255, 215, 0, 0.2); color: var(--nc-gold); }
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
        .text-gold { color: var(--nc-gold); }
        .text-muted { color: var(--nc-text-muted); }
      `}</style>
    </div>
  );
}
