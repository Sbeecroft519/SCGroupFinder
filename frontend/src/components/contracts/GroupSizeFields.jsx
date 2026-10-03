export const GroupSizeFields = ({
  isMultiCrew,
  isMedical,
  setNewContract,
  isMultiJoin,
  newContract,
  isLfg,
  isFuture
}) => {
  return <>{/* Crew / Group Size — multi-join events vs single-slot jobs */}
              {!isMultiCrew && !isMedical && <div className="form-group" style={{
      marginTop: 16
    }} data-testid="join-mode-section">
                <label data-testid="group-size-fields-nc-label" className="nc-label">CREW / GROUP SIZE</label>
                <div className="scgf-form-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8
      }}>
                  <button type="button" onClick={() => setNewContract(prev => ({
          ...prev,
          join_mode: 'single'
        }))} className="nc-btn" style={{
          background: !isMultiJoin ? 'var(--nc-cyan)' : 'transparent',
          color: !isMultiJoin ? 'var(--nc-bg-primary)' : 'var(--nc-text-primary)',
          border: `1px solid ${!isMultiJoin ? 'var(--nc-cyan)' : 'var(--nc-border)'}`,
          padding: '10px 14px'
        }} data-testid="join-mode-single">
                    👤 Single Person
                  </button>
                  <button type="button" onClick={() => setNewContract(prev => ({
          ...prev,
          join_mode: 'multi'
        }))} className="nc-btn" style={{
          background: isMultiJoin ? 'var(--nc-cyan)' : 'transparent',
          color: isMultiJoin ? 'var(--nc-bg-primary)' : 'var(--nc-text-primary)',
          border: `1px solid ${isMultiJoin ? 'var(--nc-cyan)' : 'var(--nc-border)'}`,
          padding: '10px 14px'
        }} data-testid="join-mode-multi">
                    👥 Multiple People
                  </button>
                </div>
                {isMultiJoin && <div style={{
        marginTop: 12
      }}>
                    <label data-testid="group-size-fields-nc-label-2" className="nc-label" style={{
          fontSize: 11
        }}>MAX PARTICIPANTS</label>
                    <input type="number" min={2} max={50} className="nc-input" value={newContract.max_participants} onChange={e => setNewContract(prev => ({
          ...prev,
          max_participants: Math.max(2, Math.min(50, parseInt(e.target.value) || 2))
        }))} data-testid="max-participants-input" />
                    <div style={{
          fontSize: 11,
          color: 'var(--nc-text-muted)',
          marginTop: 6,
          fontFamily: 'var(--nc-font-mono)'
        }}>
                      People can keep joining until the group is full or the listing expires.
                    </div>
                  </div>}
                {(isLfg || isFuture) && !newContract.join_mode && <div style={{
        fontSize: 11,
        color: 'var(--nc-cyan)',
        marginTop: 6,
        fontFamily: 'var(--nc-font-mono)'
      }}>
                    Defaulted to Multiple People for {isLfg ? 'LFG' : 'Future Time'} posts.
                  </div>}
              </div>}

  </>;
};
