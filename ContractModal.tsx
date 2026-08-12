import React, { useState, useEffect } from 'react';
import { FileText, Shield, CheckCircle } from 'lucide-react';
import { api } from '../api/client';

interface ContractModalProps {
  agreementId: string;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  agreementId,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await api.get(`/agreements/${agreementId}/contract`);
        setContractData(res.data);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [agreementId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText color="#6366f1" size={24} />
            <h3 className="modal-title">Compiled Contract Snapshot</h3>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <p>Compiling immutable legal contract snapshot...</p>
        ) : contractData ? (
          <div>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} />
              <span>
                <strong>IMMUTABLE SNAPSHOT:</strong> This compiled contract snapshot is frozen in time upon agreement acceptance and will never read live template changes.
              </span>
            </div>

            <pre className="contract-code-block">{contractData.formattedText}</pre>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Close View
              </button>

              {showAcceptButton && onAccept && (
                <button className="btn btn-primary" onClick={onAccept}>
                  <CheckCircle size={16} /> Accept & Lock Escrow
                </button>
              )}
            </div>
          </div>
        ) : (
          <p>Failed to load contract details.</p>
        )}
      </div>
    </div>
  );
};
