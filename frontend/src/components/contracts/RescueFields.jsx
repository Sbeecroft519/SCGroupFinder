export const RescueFields = ({
  isMedical,
  newContract,
  setNewContract
}) => {
  return <>{/* Medical / Rescue specifics */}
              {isMedical && <div style={{
      background: 'rgba(255, 0, 68, 0.05)',
      border: '1px solid rgba(255,0,68,0.3)',
      padding: 16,
      marginBottom: 16
    }}>
                  <div style={{
        color: '#ff4466',
        fontSize: 12,
        fontFamily: 'var(--nc-font-mono)',
        letterSpacing: 1,
        marginBottom: 12
      }}>
                    🏥 // MEDICAL_RESCUE_DETAILS (PUBLIC)
                  </div>
                  <div className="form-group">
                    <label data-testid="rescue-fields-nc-label" className="nc-label">BLEED-OUT / FULL DEATH MINUTES REMAINING</label>
                    <input type="number" className="nc-input" min="1" max="600" value={newContract.rescue_bleedout_minutes} onChange={e => setNewContract(prev => ({
          ...prev,
          rescue_bleedout_minutes: e.target.value.replace(/\D/g, '')
        }))} data-testid="rescue-bleedout-input" />
                  </div>
                  <div className="scgf-form-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12
      }}>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-2" className="nc-label">INJURY TIER</label>
                      <select className="nc-input" value={newContract.rescue_injury_tier} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_injury_tier: e.target.value
          }))} data-testid="rescue-tier-select">
                        <option>Unknown</option><option>T1</option><option>T2</option><option>T3</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-3" className="nc-label">PVP AREA?</label>
                      <select className="nc-input" value={newContract.rescue_pvp_area} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_pvp_area: e.target.value
          }))} data-testid="rescue-pvp-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-4" className="nc-label">HOSTILE NPCs ACTIVE?</label>
                      <select className="nc-input" value={newContract.rescue_hostile_npcs} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_hostile_npcs: e.target.value
          }))} data-testid="rescue-npcs-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-5" className="nc-label">AA TURRETS NEAR LZ?</label>
                      <select className="nc-input" value={newContract.rescue_aa_turrets} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_aa_turrets: e.target.value
          }))} data-testid="rescue-aa-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-6" className="nc-label">NEEDS HYDRATION/FOOD?</label>
                      <select className="nc-input" value={newContract.rescue_needs_food_hydration} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_needs_food_hydration: e.target.value
          }))} data-testid="rescue-food-select">
                        <option>Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                  </div>

                  <div style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px dashed rgba(255,0,68,0.4)'
      }}>
                    <div style={{
          color: '#ff4466',
          fontSize: 12,
          fontFamily: 'var(--nc-font-mono)',
          letterSpacing: 1,
          marginBottom: 8
        }}>
                      🔒 // PRIVATE_RESCUE_DETAILS
                    </div>
                    <p data-testid="rescue-fields-p" style={{
          color: 'var(--nc-text-muted)',
          fontSize: 12,
          marginBottom: 12
        }}>
                      Exact rescue details are private and will only be shown to the accepted rescuer after you approve them.
                    </p>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-7" className="nc-label">EXACT LANDMARK / POI / AREA</label>
                      <input className="nc-input" placeholder="e.g., Shubin SM0-10, Daymar bunker entrance" value={newContract.rescue_exact_location} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_exact_location: e.target.value
          }))} data-testid="rescue-exact-input" />
                    </div>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-8" className="nc-label">APPROXIMATE BODY LOCATION (OPTIONAL)</label>
                      <input className="nc-input" placeholder="e.g., Inside main building, top floor" value={newContract.rescue_body_location} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_body_location: e.target.value
          }))} data-testid="rescue-body-input" />
                    </div>
                    <div className="form-group">
                      <label data-testid="rescue-fields-nc-label-9" className="nc-label">ADDITIONAL PRIVATE NOTES (OPTIONAL)</label>
                      <textarea className="nc-input" style={{
            minHeight: 50
          }} placeholder="Codes, hazards, anything else for the rescuer" value={newContract.rescue_private_notes} onChange={e => setNewContract(prev => ({
            ...prev,
            rescue_private_notes: e.target.value
          }))} data-testid="rescue-notes-input" />
                    </div>
                  </div>
                </div>}

              </>;
};
