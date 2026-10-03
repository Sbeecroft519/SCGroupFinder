import { Plus, Users } from 'lucide-react';
import { CONTRACT_CATEGORIES } from '../../constants/badges';
export const ContractToolbar = ({
  myShard,
  setMyShard,
  setShowCreate,
  viewMode,
  setViewMode,
  myContracts,
  user,
  filter,
  setFilter
}) => {
  return <>{/* Page Header */}
      <div className="page-header scgf-wrap" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }}>
        <div>
          <div className="page-label">// GROUP_FINDER</div>
          <h1 data-testid="contract-toolbar-page-title" className="page-title">Job Board</h1>
          <p data-testid="contract-toolbar-page-subtitle" className="page-subtitle">Post jobs, apply to missions, crew up — choose teammates by reputation.</p>
        </div>
        <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center'
      }}>
          <div className="scgf-wrap" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
            <span data-testid="contract-toolbar-font-mono" className="font-mono text-muted" style={{
            fontSize: 11
          }}>MY REGION:</span>
            <select className="nc-input" value={myShard} onChange={e => setMyShard(e.target.value)} style={{
            width: 140,
            padding: '8px 12px'
          }} data-testid="region-input">
              <option value="">All</option>
              <option value="USA">USA</option>
              <option value="Europe">Europe</option>
              <option value="Australia">Australia</option>
              <option value="Asia">Asia</option>
            </select>
          </div>
          <button className="nc-btn nc-btn-primary" onClick={() => setShowCreate(true)} data-testid="create-contract-btn">
            <Plus size={16} />
            POST JOB / GROUP
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{
      marginBottom: 16
    }}>
        <div className="nc-toggle-group" data-testid="view-mode-toggle">
          <button data-testid="contract-toolbar-set-view-mode" className={`nc-toggle ${viewMode === 'feed' ? 'active' : ''}`} onClick={() => setViewMode('feed')}>
            Contract Feed
          </button>
          <button data-testid="contract-toolbar-set-view-mode-2" className={`nc-toggle ${viewMode === 'my' ? 'active' : ''}`} onClick={() => setViewMode('my')}>
            My Contracts {myContracts.filter(c => c.status === 'completed' && c.poster_id === user?.id && !c.client_review || c.status === 'completed' && c.accepted_by?.id === user?.id && !c.merc_review).length > 0 && <span data-testid="contract-toolbar-pending-rating-badge" className="pending-rating-badge">!</span>}
          </button>
        </div>
      </div>

      {/* Filter Tabs - Only show on Feed view */}
      {viewMode === 'feed' && <div style={{
      marginBottom: 24
    }}>
        <div className="nc-toggle-group" data-testid="contract-filter" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
          <button className={`nc-toggle ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')} data-testid="filter-all">
            All
          </button>
          <button className={`nc-toggle ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')} data-testid="filter-paid">
            💰 Paid Jobs
          </button>
          {CONTRACT_CATEGORIES.map(cat => <button key={cat.id} className={`nc-toggle ${filter === cat.id ? 'active' : ''}`} onClick={() => setFilter(cat.id)} data-testid={`filter-${cat.id.toLowerCase()}`}>
              {cat.icon} {cat.id === 'LFG' ? 'LFG / Group Up' : cat.shortLabel}
            </button>)}
        </div>
      </div>}

      {/* Legend - Only show on Feed view */}
      {viewMode === 'feed' && <div className="scgf-wrap" style={{
      display: 'flex',
      gap: 24,
      marginBottom: 16
    }}>
        <div className="scgf-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
          <div style={{
          width: 12,
          height: 12,
          background: 'var(--nc-red)',
          borderRadius: 2
        }} />
          <span data-testid="contract-toolbar-font-mono-2" className="font-mono text-muted" style={{
          fontSize: 11
        }}>MY REGION</span>
        </div>
        <div className="scgf-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
          <div style={{
          width: 12,
          height: 12,
          background: 'var(--nc-orange)',
          borderRadius: 2
        }} />
          <span data-testid="contract-toolbar-font-mono-3" className="font-mono text-muted" style={{
          fontSize: 11
        }}>GLOBAL</span>
        </div>
        <div className="scgf-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
          <Users size={12} color="var(--nc-cyan)" />
          <span data-testid="contract-toolbar-font-mono-4" className="font-mono text-muted" style={{
          fontSize: 11
        }}>MULTI-CREW</span>
        </div>
      </div>}

      </>;
};
