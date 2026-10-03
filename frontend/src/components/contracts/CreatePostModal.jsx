import { X, Users, ToggleRight, ToggleLeft } from 'lucide-react';
import { PostBasicsFields } from './PostBasicsFields.jsx';
import { ScheduleFields } from './ScheduleFields.jsx';
import { RescueFields } from './RescueFields.jsx';
import { MeetingPaymentFields } from './MeetingPaymentFields.jsx';
import { GroupSizeFields } from './GroupSizeFields.jsx';
import { MultiCrewStepper } from './MultiCrewStepper.jsx';

export const CreatePostModal = ({
  showCreate,
  setShowCreate,
  isLfg,
  setNewContract,
  setIsMultiCrew,
  newContract,
  isFuture,
  isMedical,
  isMultiCrew,
  crewRoles,
  setCrewRoles,
  crewPayTotal,
  setCrewPayTotal,
  totalSeats,
  perSeatPayout,
  showPaymentField,
  duration,
  setDuration,
  isMultiJoin,
  handleCreateContract,
  isContractValid
}) => {
  if (!showCreate) return null;

  const multiCrewToggle = !isLfg && !isMedical ? (
    <div className="scgf-wrap" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px',
      background: 'rgba(0, 240, 255, 0.05)',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      marginBottom: '20px',
      marginTop: isMultiCrew ? '20px' : 0
    }}>
      <div className="scgf-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '14px' }}>
        <Users size={18} color="var(--nc-cyan)" />
        <span data-testid="create-post-modal-span">MULTI-CREW CONTRACT</span>
      </div>
      <button
        type="button"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={() => setIsMultiCrew(!isMultiCrew)}
        data-testid="multi-crew-toggle"
      >
        {isMultiCrew ? <ToggleRight size={32} color="var(--nc-cyan)" /> : <ToggleLeft size={32} color="rgba(255,255,255,0.4)" />}
      </button>
    </div>
  ) : null;

  return (
    <div data-testid="create-post-modal-set-show-create" className="mission-modal-overlay" onClick={() => setShowCreate(false)}>
      <div
        data-testid="create-post-modal-mission-modal"
        role="dialog"
        aria-modal="true"
        className="mission-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="mission-modal-header">
          <div>
            <div className="mission-type-badge">// POST_JOB</div>
            <h2 data-testid="create-post-modal-mission-title" className="mission-title">
              {isMultiCrew ? 'Post Multi-Crew Job' : 'Post Job / Group'}
            </h2>
          </div>
          <button data-testid="create-post-modal-set-show-create-2" className="mission-modal-close" onClick={() => setShowCreate(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="mission-modal-content">
          {isMultiCrew ? (
            <MultiCrewStepper
              newContract={newContract}
              setNewContract={setNewContract}
              isFuture={isFuture}
              duration={duration}
              setDuration={setDuration}
              crewRoles={crewRoles}
              setCrewRoles={setCrewRoles}
              crewPayTotal={crewPayTotal}
              setCrewPayTotal={setCrewPayTotal}
              totalSeats={totalSeats}
              perSeatPayout={perSeatPayout}
              handleCreateContract={handleCreateContract}
              isContractValid={isContractValid}
              toggleNode={multiCrewToggle}
            />
          ) : (
            <>
              <PostBasicsFields isLfg={isLfg} setNewContract={setNewContract} setIsMultiCrew={setIsMultiCrew} newContract={newContract} />
              <ScheduleFields isFuture={isFuture} setNewContract={setNewContract} newContract={newContract} />
              <RescueFields isMedical={isMedical} newContract={newContract} setNewContract={setNewContract} />
              {multiCrewToggle}
              <MeetingPaymentFields isMultiCrew={false} isMedical={isMedical} newContract={newContract} setNewContract={setNewContract} isLfg={isLfg} showPaymentField={showPaymentField} />
              {!isFuture && !isMedical && (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label data-testid="create-post-modal-nc-label-2" className="nc-label">LISTING DURATION</label>
                  <select className="nc-input" value={duration} onChange={e => setDuration(parseInt(e.target.value))} data-testid="duration-select">
                    <option value={30}>🚨 Distress (30 Minutes)</option>
                    <option value={60}>⚡ Standard (1 Hour)</option>
                    <option value={240}>📋 Operation (4 Hours)</option>
                    <option value={1440}>📅 Scheduled (24 Hours)</option>
                  </select>
                </div>
              )}
              <GroupSizeFields isMultiCrew={false} isMedical={isMedical} setNewContract={setNewContract} isMultiJoin={isMultiJoin} newContract={newContract} isLfg={isLfg} isFuture={isFuture} />
              <button
                className="nc-btn nc-btn-primary"
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleCreateContract}
                disabled={!isContractValid()}
                data-testid="post-contract-btn"
              >
                POST {isLfg ? 'LFG / GROUP UP' : 'JOB'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
