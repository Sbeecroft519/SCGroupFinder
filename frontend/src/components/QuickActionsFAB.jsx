import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, AlertTriangle, FileText } from 'lucide-react';

export const QuickActionsFAB = ({ onReportIssue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handlePostContract = () => {
    setIsOpen(false);
    navigate('/contracts?action=create');
  };

  const handleReportIssue = () => {
    setIsOpen(false);
    if (onReportIssue) {
      onReportIssue();
    } else {
      navigate('/signals?action=report');
    }
  };

  return (
    <div className="quick-actions-fab" data-testid="quick-actions-fab">
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fab-backdrop" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Buttons */}
      <div className={`fab-actions ${isOpen ? 'open' : ''}`}>
        <button 
          className="fab-action-btn report"
          onClick={handleReportIssue}
          data-testid="fab-report-issue"
        >
          <AlertTriangle size={18} />
          <span>Report Issue</span>
        </button>
        <button 
          className="fab-action-btn contract"
          onClick={handlePostContract}
          data-testid="fab-post-contract"
        >
          <FileText size={18} />
          <span>Post Contract</span>
        </button>
      </div>

      {/* Main FAB Button */}
      <button 
        className={`fab-main ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="fab-toggle"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>

      <style>{`
        .quick-actions-fab {
          display: none;
          position: fixed;
          bottom: 80px;
          right: 16px;
          z-index: 999;
        }

        @media (max-width: 768px) {
          .quick-actions-fab {
            display: block;
          }
        }

        .fab-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(2, 11, 20, 0.7);
          z-index: -1;
        }

        .fab-main {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--nc-cyan) 0%, #0088aa 100%);
          border: none;
          color: #020b14;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 240, 255, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fab-main:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 24px rgba(0, 240, 255, 0.5);
        }

        .fab-main:active {
          transform: scale(0.95);
        }

        .fab-main.open {
          background: var(--nc-bg-secondary);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-primary);
          transform: rotate(45deg);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .fab-main.open:hover {
          transform: rotate(45deg) scale(1.05);
        }

        .fab-actions {
          position: absolute;
          bottom: 64px;
          right: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px) scale(0.8);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fab-actions.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .fab-action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          color: var(--nc-text-primary);
          font-family: var(--nc-font-display);
          font-size: 13px;
          letter-spacing: 0.5px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          min-width: 160px;
        }

        .fab-action-btn:hover {
          border-color: var(--nc-cyan-dim);
          background: var(--nc-bg-secondary);
        }

        .fab-action-btn.report {
          border-left: 3px solid #ffcc00;
        }

        .fab-action-btn.report:hover {
          border-left-color: #ffcc00;
          box-shadow: 0 0 12px rgba(255, 204, 0, 0.2);
        }

        .fab-action-btn.report svg {
          color: #ffcc00;
        }

        .fab-action-btn.contract {
          border-left: 3px solid var(--nc-cyan);
        }

        .fab-action-btn.contract:hover {
          border-left-color: var(--nc-cyan);
          box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
        }

        .fab-action-btn.contract svg {
          color: var(--nc-cyan);
        }
      `}</style>
    </div>
  );
};

export default QuickActionsFAB;
