import { TIMEZONES } from './contractHelpers.js';
export const ScheduleFields = ({
  isFuture,
  setNewContract,
  newContract
}) => {
  return <>{/* Timing — Looking Now vs Scheduled Future */}
              <div className="form-group">
                <label data-testid="schedule-fields-nc-label" className="nc-label">TIMING</label>
                <div className="scgf-wrap" style={{
        display: 'flex',
        gap: 8
      }} data-testid="timing-toggle">
                  <button type="button" className={`nc-toggle ${!isFuture ? 'active' : ''}`} onClick={() => setNewContract(prev => ({
          ...prev,
          timing_type: 'now'
        }))} style={{
          flex: 1,
          padding: '10px 12px'
        }} data-testid="timing-now-btn">
                    🚨 Looking Now
                  </button>
                  <button type="button" className={`nc-toggle ${isFuture ? 'active' : ''}`} onClick={() => setNewContract(prev => ({
          ...prev,
          timing_type: 'future'
        }))} style={{
          flex: 1,
          padding: '10px 12px'
        }} data-testid="timing-future-btn">
                    📅 Future Time
                  </button>
                </div>
                {isFuture && <div className="scgf-form-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        marginTop: 10
      }}>
                    <input type="date" className="nc-input" value={newContract.scheduled_date} onChange={e => setNewContract(prev => ({
          ...prev,
          scheduled_date: e.target.value
        }))} data-testid="scheduled-date-input" />
                    <input type="time" className="nc-input" value={newContract.scheduled_time} onChange={e => setNewContract(prev => ({
          ...prev,
          scheduled_time: e.target.value
        }))} data-testid="scheduled-time-input" />
                    <select className="nc-input" value={newContract.scheduled_timezone} onChange={e => setNewContract(prev => ({
          ...prev,
          scheduled_timezone: e.target.value
        }))} data-testid="scheduled-timezone-select">
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>}
              </div>

              </>;
};
