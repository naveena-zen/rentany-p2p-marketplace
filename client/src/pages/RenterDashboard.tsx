import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, AlertTriangle, Star } from 'lucide-react';
import { api } from '../api/client';
import { Agreement } from '../types';
import { ContractModal } from '../components/ContractModal';
import { DisputeModal } from '../components/DisputeModal';

export const RenterDashboard: React.FC = () => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedContractAgreementId, setSelectedContractAgreementId] = useState<string | null>(null);
  const [selectedDisputeAgreementId, setSelectedDisputeAgreementId] = useState<string | null>(null);

  // Review modal state
  const [reviewAgreementId, setReviewAgreementId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadAgreements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/agreements?role=renter');
      setAgreements(res.data);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreements();
  }, []);

  const handleConfirmCompletion = async (agreementId: string) => {
    try {
      await api.post(`/agreements/${agreementId}/confirm`);
      loadAgreements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm completion');
    }
  };

  const handleAcceptAgreement = async (agreementId: string) => {
    try {
      await api.post(`/agreements/${agreementId}/accept`);
      loadAgreements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept agreement');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAgreementId) return;

    try {
      await api.post(`/agreements/${reviewAgreementId}/reviews`, {
        rating: Number(rating),
        comment,
      });
      setReviewAgreementId(null);
      loadAgreements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit review');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Renter Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track active bookings, view frozen contract snapshots, confirm completion, or raise escrow disputes.</p>
      </div>

      {loading ? (
        <p>Loading your rental agreements...</p>
      ) : agreements.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Rental Agreements Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Explore the marketplace to request your first rental.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {agreements.map((agr) => (
            <div key={agr.id} className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className={`badge badge-${agr.status.toLowerCase()}`}>
                    Status: {agr.status}
                  </span>
                  <span className={`badge badge-${agr.escrowState.toLowerCase()}`}>
                    Escrow: {agr.escrowState}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{agr.item?.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Dates: {new Date(agr.startDate).toLocaleDateString()} &rarr; {new Date(agr.endDate).toLocaleDateString()}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  Total Escrow Value: ${agr.totalAmount.toFixed(2)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedContractAgreementId(agr.id)}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                >
                  <FileText size={15} /> View Contract Snapshot
                </button>

                {agr.status === 'PENDING_ACCEPTANCE' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAcceptAgreement(agr.id)}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                  >
                    Accept & Lock Escrow
                  </button>
                )}

                {agr.status === 'ACTIVE' && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => handleConfirmCompletion(agr.id)}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                    >
                      <CheckCircle2 size={15} /> Confirm Completion (Release Escrow)
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => setSelectedDisputeAgreementId(agr.id)}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                    >
                      <AlertTriangle size={15} /> Raise Dispute
                    </button>
                  </>
                )}

                {agr.status === 'COMPLETED' && !agr.review && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setReviewAgreementId(agr.id)}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                  >
                    <Star size={15} color="#f59e0b" /> Leave Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contract Viewer Modal */}
      {selectedContractAgreementId && (
        <ContractModal
          agreementId={selectedContractAgreementId}
          onClose={() => setSelectedContractAgreementId(null)}
        />
      )}

      {/* Dispute Modal */}
      {selectedDisputeAgreementId && (
        <DisputeModal
          agreementId={selectedDisputeAgreementId}
          onClose={() => setSelectedDisputeAgreementId(null)}
          onSuccess={() => {
            setSelectedDisputeAgreementId(null);
            loadAgreements();
          }}
        />
      )}

      {/* Review Modal */}
      {reviewAgreementId && (
        <div className="modal-overlay" onClick={() => setReviewAgreementId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Review Owner & Rental</h3>
              <button className="close-btn" onClick={() => setReviewAgreementId(null)}>&times;</button>
            </div>
            <form onSubmit={handleReviewSubmit}>
              <div className="form-group">
                <label className="form-label">Rating (1 to 5 Stars)</label>
                <select className="form-control" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                  <option value={3}>⭐⭐⭐ (3 - Average)</option>
                  <option value={2}>⭐⭐ (2 - Below Expectation)</option>
                  <option value={1}>⭐ (1 - Poor)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Written Feedback</label>
                <textarea
                  className="form-control"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your rental experience..."
                  rows={3}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReviewAgreementId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
