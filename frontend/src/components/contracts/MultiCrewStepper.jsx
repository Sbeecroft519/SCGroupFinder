import { useState } from 'react';
import { Plus, X, Check, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { PostBasicsFields } from './PostBasicsFields.jsx';
import { ScheduleFields } from './ScheduleFields.jsx';
import { PRESET_ROLES } from './presets.js';

const STEPS = ['Job basics', 'Crew roles', 'Pay split', 'Review'];

export const MultiCrewStepper = ({
  newContract,
  setNewContract,
  isFuture,
  duration,
  setDuration,
  crewRoles,
  setCrewRoles,
  crewPayTotal,
  setCrewPayTotal,
  totalSeats,
  perSeatPayout,
  handleCreateContract,
  isContractValid,
  toggleNode,
}) => {
  const [step, setStep] = useState(0);

  const updateRole = (index, patch) => {
    setCrewRoles(crewRoles.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRole = () => setCrewRoles([...crewRoles, { name: PRESET_ROLES[0] || 'Crew', count: 1 }]);
  const removeRole = (index) => setCrewRoles(crewRoles.filter((_, i) => i !== index));

  const rolesValid = crewRoles.length > 0
    && totalSeats > 0
    && crewRoles.every(r => String(r.name || '').trim().length > 0);

  const stepValid = (s) => {
    if (s === 0) return Boolean(String(newContract.title || '').trim());
    if (s === 1) return rolesValid;
    if (s === 2) return (parseInt(crewPayTotal) || 0) >= 0;
    return isContractValid();
  };

  const openRoleSummary = crewRoles
    .filter(r => String(r.name || '').trim())
    .map(r => `${r.count}× ${r.name}`)
    .join(' · ');

  return (
    <div data-testid="multicrew-stepper">
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i <= step && setStep(i)}
            data-testid={`stepper-step-${i}`}
            style={{
              flex: '1 1 110px',
              textAlign: 'left',
              cursor: i <= step ? 'pointer' : 'default',
              background: i === step ? 'rgba(0,240,255,0.10)' : 'transparent',
              border: '1px solid',
              borderColor: i <= step ? 'rgba(0,240,255,0.45)' : 'var(--nc-border)',
              padding: '8px 10px',
              color: i === step ? 'var(--nc-cyan)' : 'var(--nc-text-muted)',
              fontFamily: 'var(--nc-font-mono)',
              fontSize: 10,
              letterSpacing: 1,
              transition: 'border-color .2s, color .2s, background-color .2s',
            }}
          >
            <span style={{ display: 'block', opacity: 0.7 }}>STEP {i + 1}</span>
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div data-testid="stepper-panel-basics">
          <PostBasicsFields isLfg={false} setNewContract={setNewContract} setIsMultiCrew={() => {}} newContract={newContract} />
          <ScheduleFields isFuture={isFuture} setNewContract={setNewContract} newContract={newContract} />
          {!isFuture && (
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="nc-label">LISTING DURATION</label>
              <select className="nc-input" value={duration} onChange={e => setDuration(parseInt(e.target.value))} data-testid="duration-select">
                <option value={30}>🚨 Distress (30 Minutes)</option>
                <option value={60}>⚡ Standard (1 Hour)</option>
                <option value={240}>📋 Operation (4 Hours)</option>
                <option value={1440}>📅 Scheduled (24 Hours)</option>
              </select>
            </div>
          )}
          {toggleNode}
        </div>
      )}

      {step === 1 && (
        <div data-testid="stepper-panel-roles">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Users size={16} color="var(--nc-cyan)" />
            <span style={{ color: 'var(--nc-cyan)', fontSize: 12, letterSpacing: 2, fontFamily: 'var(--nc-font-mono)' }}>
              CREW ROLES &amp; SEATS
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {crewRoles.map((role, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="nc-input"
                  list="crew-role-presets"
                  value={role.name}
                  placeholder="Role name (e.g. Turret)"
                  onChange={e => updateRole(i, { name: e.target.value })}
                  style={{ flex: '1 1 160px', minWidth: 0 }}
                  data-testid={`crew-role-name-${i}`}
                />
                <input
                  className="nc-input"
                  type="number"
                  min="1"
                  max="20"
                  value={role.count}
                  onChange={e => updateRole(i, { count: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                  style={{ width: 80, textAlign: 'center' }}
                  data-testid={`crew-role-count-${i}`}
                />
                <button
                  type="button"
                  onClick={() => removeRole(i)}
                  disabled={crewRoles.length === 1}
                  data-testid={`crew-role-remove-${i}`}
                  style={{
                    background: 'rgba(255,77,77,0.15)',
                    border: '1px solid rgba(255,77,77,0.45)',
                    color: '#ff4d4d',
                    width: 34,
                    height: 34,
                    cursor: crewRoles.length === 1 ? 'not-allowed' : 'pointer',
                    opacity: crewRoles.length === 1 ? 0.4 : 1,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <datalist id="crew-role-presets">
            {(PRESET_ROLES || []).map(r => <option key={r} value={r} />)}
          </datalist>
          <button type="button" className="nc-btn nc-btn-secondary" onClick={addRole} style={{ marginTop: 14 }} data-testid="crew-role-add">
            <Plus size={14} /> ADD ROLE
          </button>
          <div style={{ marginTop: 16, color: 'var(--nc-text-muted)', fontSize: 12, fontFamily: 'var(--nc-font-mono)' }} data-testid="crew-seat-total">
            {totalSeats} SEAT{totalSeats === 1 ? '' : 'S'} — {openRoleSummary || 'no roles named yet'}
          </div>
        </div>
      )}

      {step === 2 && (
        <div data-testid="stepper-panel-pay">
          <div className="form-group">
            <label className="nc-label">TOTAL PAYOUT FOR THE CREW (aUEC)</label>
            <input
              className="nc-input"
              type="number"
              min="0"
              value={crewPayTotal}
              onChange={e => setCrewPayTotal(parseInt(e.target.value) || 0)}
              data-testid="crew-pay-total"
            />
          </div>
          <div style={{ marginTop: 18, border: '1px solid var(--nc-border)', padding: 16, background: 'rgba(0,240,255,0.03)' }}>
            <div style={{ color: 'var(--nc-text-muted)', fontSize: 10, letterSpacing: 1, fontFamily: 'var(--nc-font-mono)', marginBottom: 12 }}>
              PER-SEAT SPLIT
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crewRoles.filter(r => String(r.name || '').trim()).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--nc-text-secondary)' }} data-testid={`pay-split-row-${i}`}>
                  <span>{r.count}× {r.name}</span>
                  <span style={{ color: 'var(--nc-gold)', fontFamily: 'var(--nc-font-mono)' }}>
                    {perSeatPayout.toLocaleString()} aUEC / seat
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--nc-border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--nc-text-muted)' }}>{totalSeats} seats</span>
              <span style={{ color: 'var(--nc-gold)', fontFamily: 'var(--nc-font-mono)' }} data-testid="pay-split-total">
                {(perSeatPayout * totalSeats).toLocaleString()} aUEC total
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div data-testid="stepper-panel-review">
          <div style={{ border: '1px solid var(--nc-border)', padding: 18, background: 'var(--nc-bg-secondary)' }}>
            <div style={{ fontFamily: 'var(--nc-font-display)', fontSize: 18, color: 'var(--nc-cyan)', marginBottom: 6 }} data-testid="review-title">
              {newContract.title || 'Untitled crew job'}
            </div>
            {newContract.description && (
              <p style={{ color: 'var(--nc-text-secondary)', fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>
                {newContract.description}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--nc-text-secondary)', fontFamily: 'var(--nc-font-mono)' }}>
              <span data-testid="review-seats">SEATS: {totalSeats} — {openRoleSummary}</span>
              <span data-testid="review-pay">PAY: {(perSeatPayout * totalSeats).toLocaleString()} aUEC ({perSeatPayout.toLocaleString()} per seat)</span>
              <span>TIMING: {isFuture ? `Scheduled ${newContract.scheduled_date || ''} ${newContract.scheduled_time || ''}` : 'Looking now'}</span>
            </div>
          </div>
          <button
            className="nc-btn nc-btn-primary"
            style={{ width: '100%', marginTop: 18 }}
            onClick={handleCreateContract}
            disabled={!isContractValid()}
            data-testid="post-contract-btn"
          >
            <Check size={14} /> POST MULTI-CREW JOB
          </button>
        </div>
      )}

      {/* Step nav */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          className="nc-btn nc-btn-secondary"
          style={{ flex: 1, opacity: step === 0 ? 0.4 : 1 }}
          disabled={step === 0}
          onClick={() => setStep(s => Math.max(0, s - 1))}
          data-testid="stepper-back"
        >
          <ChevronLeft size={14} /> BACK
        </button>
        {step < STEPS.length - 1 && (
          <button
            type="button"
            className="nc-btn nc-btn-primary"
            style={{ flex: 1 }}
            disabled={!stepValid(step)}
            onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
            data-testid="stepper-next"
          >
            NEXT <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MultiCrewStepper;
