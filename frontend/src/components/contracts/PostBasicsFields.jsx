import { CONTRACT_CATEGORIES } from '../../constants/badges';
export const PostBasicsFields = ({
  isLfg,
  setNewContract,
  setIsMultiCrew,
  newContract
}) => {
  return <>{/* Post Mode: Paid vs LFG */}
              <div className="form-group">
                <label data-testid="post-basics-fields-nc-label" className="nc-label">POST MODE</label>
                <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 8
      }} data-testid="post-mode-toggle">
                  <button type="button" className={`nc-toggle ${!isLfg ? 'active' : ''}`} onClick={() => setNewContract(prev => ({
          ...prev,
          category: prev.category === 'LFG' ? 'COMBAT' : prev.category,
          compensation_type: 'Flat Fee'
        }))} style={{
          flex: 1,
          padding: '10px 12px'
        }} data-testid="mode-paid-btn">
                    💰 Paid Job / Contract
                  </button>
                  <button type="button" className={`nc-toggle ${isLfg ? 'active' : ''}`} onClick={() => {
          setIsMultiCrew(false);
          setNewContract(prev => ({
            ...prev,
            category: 'LFG',
            compensation_type: 'LFG'
          }));
        }} style={{
          flex: 1,
          padding: '10px 12px'
        }} data-testid="mode-lfg-btn">
                    👥 LFG / Group Up
                  </button>
                </div>
                {isLfg && <p data-testid="post-basics-fields-p" style={{
        color: 'var(--nc-text-muted)',
        fontSize: 12,
        marginTop: 6,
        fontFamily: 'var(--nc-font-mono)'
      }}>
                    No payout, coordination only. Find players for a session, crew, party, or casual activity.
                  </p>}
              </div>

              {/* Activity Type — only for paid jobs */}
              {!isLfg && <div className="form-group">
                  <label data-testid="post-basics-fields-nc-label-2" className="nc-label">ACTIVITY TYPE</label>
                  <select className="nc-input" value={newContract.category} onChange={e => {
        const category = e.target.value;
        if (category === 'MEDICAL') setIsMultiCrew(false);
        setNewContract(prev => ({ ...prev, category }));
      }} data-testid="category-select" style={{
        fontSize: 14
      }}>
                    {CONTRACT_CATEGORIES.filter(c => c.id !== 'LFG').map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                </div>}

              {/* Job Title */}
              <div className="form-group">
                <label data-testid="post-basics-fields-nc-label-3" className="nc-label">POST TITLE</label>
                <input className="nc-input" type="text" placeholder={isLfg ? 'e.g., Looking for bunker team, Need Reclaimer crew' : 'e.g., Escort from Lorville to Orison'} value={newContract.title} onChange={e => setNewContract(prev => ({
        ...prev,
        title: e.target.value
      }))} data-testid="contract-title-input" />
              </div>

              {/* Contract Description (Optional) */}
              <div className="form-group">
                <label data-testid="post-basics-fields-nc-label-4" className="nc-label">DESCRIPTION (OPTIONAL)</label>
                <textarea className="nc-input" placeholder="Add any additional details..." value={newContract.description} onChange={e => setNewContract(prev => ({
        ...prev,
        description: e.target.value
      }))} style={{
        minHeight: 60,
        resize: 'vertical'
      }} data-testid="contract-description-input" />
              </div>

              </>;
};
