import React, { useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { api } from '../api/client';
import { TrustScoreBreakdown } from '../types';

interface TrustBadgeProps {
  score: number;
  userId?: string;
  showDetailsOnClick?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ score, userId, showDetailsOnClick = true }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<TrustScoreBreakdown | null>(null);

  const getScoreColorClass = (s: number) => {
    if (s >= 85) return 'gold';
    if (s >= 65) return 'green';
    return 'red';
  };

  const handleOpen = async () => {
    if (!showDetailsOnClick || !userId) return;
    setShowModal(true);
    setLoading(true);
    try {
      const res = await api.post(`/users/${userId}/recompute-trust-score`);
      setBreakdown(res.data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span
        className={`trust-score-badge ${getScoreColorClass(score)}`}
        onClick={handleOpen}
        title="Click to view explainable trust score breakdown"
      >
        <ShieldCheck size={14} />
        <span>Trust Score: {score.toFixed(1)}</span>
        {showDetailsOnClick && <Info size={12} style={{ opacity: 0.7 }} />}
      </span>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">RentAny Trust Engine Breakdown</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            {loading ? (
              <p>Recomputing score parameters...</p>
            ) : breakdown ? (
              <div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                  {breakdown.newScore} / 100.0
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  RentAny uses a non-live-averaged, recomputable mathematical trust engine weighing review recency, reviewer trust, completed transactions, and dispute history.
                </p>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>
                  <div><strong>Base Score:</strong> +{breakdown.baseScore}</div>
                  <div><strong>Weighted Review Component:</strong> {breakdown.reviewComponent >= 0 ? `+${breakdown.reviewComponent}` : breakdown.reviewComponent} pts</div>
                  <div><strong>Transaction Volume Bonus:</strong> +{breakdown.transactionBonus} pts ({breakdown.completedAgreementsCount} completions)</div>
                  <div><strong>Dispute Penalty:</strong> -{breakdown.disputePenalty} pts ({breakdown.disputesLostCount} lost disputes)</div>
                  <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0' }} />
                  <div style={{ fontFamily: 'monospace', color: '#a5b4fc', fontSize: '0.8rem' }}>
                    {breakdown.formulaExplanation}
                  </div>
                </div>
              </div>
            ) : (
              <p>Trust Score: {score.toFixed(1)} / 100.0</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
