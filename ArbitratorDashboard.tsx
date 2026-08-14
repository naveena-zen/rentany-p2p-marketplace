import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle, RefreshCw, AlertOctagon } from 'lucide-react';
import { api } from '../api/client';
import { Dispute, DisputeResolution } from '../types';
import { TrustBadge } from '../components/TrustBadge';

export const ArbitratorDashboard: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  // Resolution form state
  const [resolution, setResolution] = useState<DisputeResolution>('SPLIT');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/disputes');
      setDisputes(res.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleStartReview = async (disputeId: string) => {
    try {
      await api.patch(`/disputes/${disputeId}/status`, { status: 'UNDER_REVIEW' });
      loadDisputes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update dispute status');
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    setSubmitting(true);
    try {
      await api.post(`/disputes/${selectedDispute.id}/resolve`, {
        resolution,
        resolutionNotes,
      });
      setSelectedDispute(null);
      loadDisputes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Scale size={28} /> Arbitrator Resolution Court
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review submitted evidence, conduct binding arbitration, and execute smart escrow fund distribution.</p>
      </div>

      {loading ? (
        <p>Loading open disputes...</p>
      ) : disputes.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle size={48} color="var(--success)" style={{ marginBottom: '1rem' }} />
          <h3>No Open Disputes</h3>
          <p style={{ color: 'var(--text-secondary)' }}>All rental escrow transactions are currently operating smoothly.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDispute ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* Dispute List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {disputes.map((d) => (
              <div
                key={d.id}
                className="glass-card"
                style={{
                  borderColor: selectedDispute?.id === d.id ? 'var(--accent-primary)' : undefined,
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedDispute(d)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className={`badge badge-${d.status === 'OPEN' ? 'disputed' : d.status === 'RESOLVED' ? 'completed' : 'pending'}`}>
                    {d.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{d.agreement?.item?.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Raised by: <strong>{d.raisedBy?.name}</strong>
                </p>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: '#fca5a5' }}>
                  Reason: "{d.reason}"
                </div>

                {d.status === 'OPEN' && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.85rem', padding: '0.4rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartReview(d.id);
                    }}
                  >
                    Move to UNDER_REVIEW
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Dispute Inspector & Resolution Panel */}
          {selectedDispute && (
            <div className="glass-card" style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Arbitration Inspector</h3>
                <button className="close-btn" onClick={() => setSelectedDispute(null)}>&times;</button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Agreement & Escrow Value</h4>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  ${selectedDispute.agreement?.totalAmount.toFixed(2)} USD
                </div>
              </div>

              {/* Party Trust Scores */}
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RENTER</span>
                  <div style={{ fontWeight: 600 }}>{selectedDispute.agreement?.renter?.name}</div>
                  <TrustBadge score={selectedDispute.agreement?.renter?.trustScore || 50} userId={selectedDispute.agreement?.renterId} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OWNER</span>
                  <div style={{ fontWeight: 600 }}>{selectedDispute.agreement?.owner?.name}</div>
                  <TrustBadge score={selectedDispute.agreement?.owner?.trustScore || 50} userId={selectedDispute.agreement?.ownerId} />
                </div>
              </div>

              {/* Evidence Log */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Submitted Evidence</h4>
                <div style={{ background: '#080c14', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: '#c7d2fe', fontFamily: 'monospace' }}>
                  {Array.isArray(selectedDispute.evidence) && selectedDispute.evidence.map((ev, idx) => (
                    <div key={idx} style={{ marginBottom: '0.3rem' }}>[{idx + 1}] {ev}</div>
                  ))}
                </div>
              </div>

              {/* Resolution Form */}
              {selectedDispute.status !== 'RESOLVED' ? (
                <form onSubmit={handleResolveDispute}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f59e0b' }}>
                    Execute Binding Arbitrated Decision
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Escrow Settlement Distribution</label>
                    <select className="form-control" value={resolution} onChange={(e) => setResolution(e.target.value as DisputeResolution)}>
                      <option value="REFUND_RENTER">REFUND_RENTER (100% Refund to Renter)</option>
                      <option value="PAY_OWNER">PAY_OWNER (100% Escrow Release to Owner)</option>
                      <option value="SPLIT">SPLIT (50% Renter Refund / 50% Owner Payout)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Arbitrator Ruling Notes</label>
                    <textarea
                      className="form-control"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Explain legal and evidence grounds for ruling..."
                      rows={3}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                    {submitting ? 'Executing Ruling...' : 'Issue Final Binding Ruling & Distribute Escrow'}
                  </button>
                </form>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '1rem', borderRadius: 'var(--radius-sm)', color: '#6ee7b7' }}>
                  <strong>RESOLVED ({selectedDispute.resolution}):</strong> {selectedDispute.resolutionNotes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
