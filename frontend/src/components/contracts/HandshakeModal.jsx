import { Copy } from 'lucide-react';
export const HandshakeModal = ({
  showHandshakeModal,
  handleCopyHandle,
  setShowHandshakeModal
}) => {
  return <>{/* Handshake Modal */}
      {showHandshakeModal && <div className="mission-modal-overlay">
          <div data-testid="handshake-modal-mission-modal" role="dialog" aria-modal="true" className="mission-modal" style={{
        maxWidth: 450,
        textAlign: 'center'
      }}>
            <div className="mission-modal-header" style={{
          justifyContent: 'center'
        }}>
              <div>
                <div className="mission-type-badge">// HANDSHAKE_COMPLETE</div>
                <h2 data-testid="handshake-modal-mission-title" className="mission-title">Contract Accepted!</h2>
              </div>
            </div>
            <div className="mission-modal-content">
              <div className="handshake-icon">🤝</div>
              <p data-testid="handshake-modal-p" style={{
            color: 'var(--nc-text-secondary)',
            marginBottom: 24,
            fontSize: 15
          }}>
                {showHandshakeModal.type === 'poster' ? <>Your selected player is ready. Add them to your party in Star Citizen.</> : <>Your application was accepted! Add the poster to your party immediately.</>}
              </p>
              <div className="handshake-handle">
                <span data-testid="handshake-modal-label" className="label">RSI HANDLE</span>
                <span data-testid="handshake-modal-handle" className="handle">{showHandshakeModal.handle}</span>
                <button data-testid="handshake-modal-handle-copy-handle" className="nc-btn nc-btn-secondary" onClick={() => handleCopyHandle(showHandshakeModal.handle)} style={{
              marginTop: 12
            }}>
                  <Copy size={14} /> Copy Handle
                </button>
              </div>
              <button data-testid="handshake-modal-set-show-handshake-modal" className="nc-btn nc-btn-primary" onClick={() => setShowHandshakeModal(null)} style={{
            width: '100%',
            marginTop: 24
          }}>
                Got It
              </button>
            </div>
          </div>
        </div>}

      </>;
};
