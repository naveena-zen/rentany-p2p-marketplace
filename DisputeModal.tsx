import React, { useState } from 'react';
import { AlertTriangle, Upload, Send } from 'lucide-react';
import { api } from '../api/client';

interface DisputeModalProps {
  agreementId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({ agreementId, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.length < 10) {
      setError('Please enter a detailed dispute reason (at least 10 characters)');
      return;
    }

    const evidenceList = evidenceText.split('\n').filter((item) => item.trim().length > 0);
    if (evidenceList.length === 0) {
      evidenceList.push('Initial dispute report provided by user.');
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/disputes', {
        agreementId,
        reason,
        evidence: evidenceList,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
            <AlertTriangle size={24} />
            <h3 className="modal-title" style={{ color: '#ef4444' }}>Raise Escrow Dispute</h3>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#fca5a5', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Reason for Dispute</label>
            <textarea
              className="form-control"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue in detail (e.g., item arrived damaged, missing accessories, non-performance of service)..."
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Evidence & Documentation (URLs or Descriptions, one per line)</label>
            <textarea
              className="form-control"
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              placeholder="https://example.com/photos/damage1.jpg&#10;Photo taken at 2:00 PM showing cracked display..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              <Send size={16} /> {submitting ? 'Submitting Dispute...' : 'Submit to Arbitrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
