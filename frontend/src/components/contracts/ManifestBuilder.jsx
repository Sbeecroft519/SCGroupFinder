import { useState } from 'react';
import { PRESET_ROLES } from './presets.js';
import { Users, Plus, X } from 'lucide-react';
export const ManifestBuilder = ({
  manifest,
  onChange,
  basePayout,
  onBasePayoutChange
}) => {
  const [selectedRole, setSelectedRole] = useState(PRESET_ROLES[0]);
  const [quickFillCount, setQuickFillCount] = useState(1);
  const addRoles = () => {
    const newSlots = Array.from({
      length: quickFillCount
    }, () => ({
      role: selectedRole,
      payout: basePayout,
      status: 'OPEN',
      applicant_id: null,
      bids: []
    }));
    onChange([...manifest, ...newSlots]);
    setQuickFillCount(1);
  };
  const removeSlot = index => {
    onChange(manifest.filter((_, i) => i !== index));
  };
  const updateSlotPayout = (index, newPayout) => {
    const updated = manifest.map((slot, i) => i === index ? {
      ...slot,
      payout: parseInt(newPayout) || 0
    } : slot);
    onChange(updated);
  };
  const totalPayout = manifest.reduce((sum, slot) => sum + slot.payout, 0);
  return <div style={{
    background: 'rgba(0, 240, 255, 0.03)',
    border: '1px solid rgba(0, 240, 255, 0.2)',
    padding: '20px',
    marginTop: '10px'
  }}>
      <div className="scgf-wrap" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '15px'
    }}>
        <Users size={18} color="var(--nc-cyan)" />
        <span data-testid="manifest-builder-span" style={{
        color: 'var(--nc-cyan)',
        fontSize: '14px',
        fontWeight: 'bold',
        letterSpacing: '2px'
      }}>
          CREW MANIFEST BUILDER
        </span>
      </div>

      <div className="form-group">
        <label data-testid="manifest-builder-nc-label" className="nc-label">BASE PAYOUT PER MEMBER (aUEC)</label>
        <input data-testid="manifest-builder-on-base-payout-change" type="number" value={basePayout} onChange={e => onBasePayoutChange(parseInt(e.target.value) || 0)} className="nc-input" style={{
        width: '200px'
      }} />
      </div>

      <div style={{
      display: 'flex',
      gap: '10px',
      marginBottom: '15px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
        <select data-testid="manifest-builder-set-selected-role" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="nc-input" style={{
        width: '180px'
      }}>
          {PRESET_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
        </select>

        <div className="scgf-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
          <span data-testid="manifest-builder-span-2" style={{
          color: 'rgba(255,255,255,0.6)'
        }}>×</span>
          <input data-testid="manifest-builder-set-quick-fill-count" type="number" min="1" max="20" value={quickFillCount} onChange={e => setQuickFillCount(Math.max(1, parseInt(e.target.value) || 1))} className="nc-input" style={{
          width: '60px',
          textAlign: 'center'
        }} />
        </div>

        <button data-testid="manifest-builder-button" type="button" onClick={addRoles} className="nc-btn nc-btn-primary" style={{
        padding: '10px 16px',
        fontSize: '12px'
      }}>
          <Plus size={14} />
          ADD ROLE{quickFillCount > 1 ? 'S' : ''}
        </button>
      </div>

      {manifest.length > 0 && <>
          <div style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: '11px',
        letterSpacing: '1px',
        marginBottom: '10px'
      }}>
            CREW ROSTER ({manifest.length} SLOTS)
          </div>
          <div className="scgf-wrap" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '250px',
        overflowY: 'auto'
      }}>
            {manifest.map((slot, index) => <div className="scgf-wrap" key={index} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 15px',
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.15)'
        }}>
                <span data-testid={`manifest-builder-span-3-${index}`} style={{
            color: 'var(--nc-cyan)',
            fontWeight: 'bold'
          }}>{slot.role}</span>
                <div className="scgf-wrap" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
                  <input data-testid={`manifest-builder-update-slot-payout-${index}`} type="number" value={slot.payout} onChange={e => updateSlotPayout(index, e.target.value)} className="nc-input" style={{
              width: '100px',
              textAlign: 'right',
              padding: '6px 10px'
            }} />
                  <span data-testid={`manifest-builder-span-4-${index}`} style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '12px'
            }}>aUEC</span>
                  <button data-testid={`manifest-builder-remove-slot-${index}`} type="button" onClick={() => removeSlot(index)} style={{
              background: 'rgba(255, 77, 77, 0.2)',
              border: '1px solid rgba(255, 77, 77, 0.5)',
              color: '#ff4d4d',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                    <X size={14} />
                  </button>
                </div>
              </div>)}
          </div>
          <div className="scgf-wrap" style={{
        marginTop: '15px',
        padding: '10px 15px',
        background: 'rgba(0, 240, 255, 0.05)',
        borderTop: '1px solid rgba(0, 240, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '13px'
      }}>
            <span data-testid="manifest-builder-span-5">TOTAL CREW: {manifest.length}</span>
            <span data-testid="manifest-builder-span-6" style={{
          color: 'var(--nc-gold)'
        }}>TOTAL PAYOUT: {totalPayout.toLocaleString()} aUEC</span>
          </div>
        </>}

      {manifest.length === 0 && <div style={{
      color: 'rgba(255,255,255,0.4)',
      textAlign: 'center',
      padding: '30px',
      fontSize: '13px'
    }}>
          No crew slots defined. Select a role and click ADD to build your manifest.
        </div>}
    </div>;
};
