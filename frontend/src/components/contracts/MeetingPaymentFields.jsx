import { MAJOR_LOCATIONS } from './contractHelpers.js';
export const MeetingPaymentFields = ({
  isMultiCrew,
  isMedical,
  newContract,
  setNewContract,
  isLfg,
  showPaymentField
}) => {
  return <>{/* Single-crew fields only show when not multi-crew */}
              {!isMultiCrew && <>
                  {/* Simplified Meeting Location */}
                  <div className="form-group">
                    <label data-testid="meeting-payment-fields-nc-label" className="nc-label">MEETING LOCATION</label>
                    <div className="scgf-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: isMedical ? '1fr' : '1fr 1fr',
          gap: 12
        }}>
                      {!isMedical && <select className="nc-input" value={newContract.meeting_visibility} onChange={e => setNewContract(prev => ({
            ...prev,
            meeting_visibility: e.target.value,
            meeting_system: e.target.value === 'disclosed_on_acceptance' ? '' : prev.meeting_system,
            meeting_major_location: e.target.value === 'disclosed_on_acceptance' ? '' : prev.meeting_major_location
          }))} data-testid="meeting-visibility-select">
                          <option value="public">Show System Publicly</option>
                          <option value="disclosed_on_acceptance">Disclosed on Acceptance</option>
                        </select>}
                      {(isMedical || newContract.meeting_visibility === 'public') && <select className="nc-input" value={newContract.meeting_system} onChange={e => setNewContract(prev => ({
            ...prev,
            meeting_system: e.target.value,
            meeting_major_location: ''
          }))} data-testid="meeting-system-select">
                          <option value="">{isMedical ? 'Patient is in...' : 'System...'}</option>
                          <option value="Stanton">Stanton</option>
                          <option value="Pyro">Pyro</option>
                          <option value="Nyx">Nyx</option>
                        </select>}
                    </div>
                    {!isMedical && newContract.meeting_visibility === 'public' && newContract.meeting_system && <select className="nc-input" style={{
          marginTop: 8
        }} value={newContract.meeting_major_location} onChange={e => setNewContract(prev => ({
          ...prev,
          meeting_major_location: e.target.value
        }))} data-testid="meeting-major-location-select">
                        <option value="">Major port / city / station...</option>
                        {(MAJOR_LOCATIONS[newContract.meeting_system] || []).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>}
                    {isMedical && <p data-testid="meeting-payment-fields-p" style={{
          color: 'var(--nc-text-muted)',
          fontSize: 12,
          marginTop: 6,
          fontFamily: 'var(--nc-font-mono)'
        }}>
                        Only the system is visible publicly. Exact rescue location is private.
                      </p>}
                  </div>

                  {/* Split Profits Checkbox - hidden for LFG and Medical */}
                  {!isLfg && !isMedical && <div className="form-group">
                    <div className="scgf-wrap" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
                      <input type="checkbox" id="splitProfits" checked={newContract.split_profits} onChange={e => setNewContract(prev => ({
            ...prev,
            split_profits: e.target.checked,
            payment_amount: e.target.checked ? '0' : prev.payment_amount
          }))} style={{
            width: 18,
            height: 18,
            accentColor: 'var(--nc-cyan)'
          }} data-testid="split-profits-checkbox" />
                      <label data-testid="meeting-payment-fields-label" htmlFor="splitProfits" style={{
            color: 'var(--nc-text-secondary)',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
                        💰 Split Profits (no fixed payout)
                      </label>
                    </div>
                  </div>}

                  {/* Payment Amount - shown for normal flat-fee or for medical (always required) */}
                  {(showPaymentField || isMedical) && <div className="form-group">
                      <label data-testid="meeting-payment-fields-nc-label-2" className="nc-label">{isMedical ? 'RESCUE PAYOUT (aUEC)' : 'CONTRACT PAYOUT (aUEC)'}</label>
                      <input type="number" className="nc-input" placeholder="e.g., 50000" value={newContract.payment_amount} onChange={e => setNewContract(prev => ({
          ...prev,
          payment_amount: e.target.value.replace(/\D/g, '')
        }))} min="0" style={{
          fontFamily: 'var(--nc-font-mono)',
          fontSize: 18,
          color: 'var(--nc-green)'
        }} data-testid="payment-amount-input" />
                    </div>}
                </>}

              </>;
};
