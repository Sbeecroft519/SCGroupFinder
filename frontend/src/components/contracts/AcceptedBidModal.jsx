import { Copy } from 'lucide-react';
export const AcceptedBidModal = ({
  acceptedBidNotification,
  handleCopyHandle,
  acknowledgeAcceptedBid
}) => {
  return <>{/* Applicant Accepted Notification Modal */}
      {acceptedBidNotification && <div className="mission-modal-overlay">
          <div data-testid="accepted-bid-modal-mission-modal" role="dialog" aria-modal="true" className="mission-modal" style={{
        maxWidth: 480,
        textAlign: 'center'
      }}>
            <div className="mission-modal-header" style={{
          justifyContent: 'center',
          background: 'rgba(0, 255, 136, 0.1)'
        }}>
              <div>
                <div className="mission-type-badge" style={{
              color: 'var(--nc-green)'
            }}>// APPLICATION_ACCEPTED</div>
                <h2 data-testid="accepted-bid-modal-mission-title" className="mission-title" style={{
              color: 'var(--nc-green)'
            }}>You've Been Hired!</h2>
              </div>
            </div>
            <div className="mission-modal-content">
              <div className="accepted-notification-icon">✓</div>
              <p data-testid="accepted-bid-modal-p" style={{
            color: 'var(--nc-text-secondary)',
            marginBottom: 16,
            fontSize: 15
          }}>
                Your application for <strong data-testid="accepted-bid-modal-strong" style={{
              color: 'var(--nc-cyan)'
            }}>{acceptedBidNotification.contract?.title}</strong> has been accepted.
              </p>
              <p data-testid="accepted-bid-modal-p-2" style={{
            color: 'var(--nc-text-muted)',
            marginBottom: 24,
            fontSize: 13
          }}>
                Add the poster to your party in Star Citizen immediately. For rescue missions, they may be incapacitated and unable to invite you.
              </p>
              <div className="client-handle-box">
                <span data-testid="accepted-bid-modal-label" className="label">POSTER RSI HANDLE</span>
                <div className="client-info">
                  {acceptedBidNotification.client_avatar && <img src={acceptedBidNotification.client_avatar} alt="" className="client-avatar" />}
                  <span data-testid="accepted-bid-modal-handle" className="handle">{acceptedBidNotification.client_handle || 'Unknown'}</span>
                </div>
                <button data-testid="accepted-bid-modal-handle-copy-handle" className="nc-btn nc-btn-primary" onClick={() => handleCopyHandle(acceptedBidNotification.client_handle)} style={{
              marginTop: 12
            }}>
                  <Copy size={14} /> Copy Handle
                </button>
              </div>
              <div style={{
            marginTop: 24,
            padding: 12,
            background: 'rgba(255, 153, 0, 0.1)',
            border: '1px solid rgba(255, 153, 0, 0.3)'
          }}>
                <p data-testid="accepted-bid-modal-p-3" style={{
              color: '#ff9900',
              fontSize: 12,
              fontFamily: 'var(--nc-font-mono)',
              margin: 0
            }}>
                  ⚠️ IMPORTANT: Write down this handle before closing! The poster may be unable to look you up if incapacitated.
                </p>
              </div>
              <button data-testid="accepted-bid-modal-nc-btn" className="nc-btn nc-btn-secondary" onClick={() => acknowledgeAcceptedBid(acceptedBidNotification.bid_id)} style={{
            width: '100%',
            marginTop: 24
          }}>
                I've Copied the Handle - Close
              </button>
            </div>
          </div>
        </div>}

      </>;
};
