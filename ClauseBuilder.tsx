import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Clause } from '../types';

interface ClauseBuilderProps {
  clauses: Clause[];
  onChange: (clauses: Clause[]) => void;
}

export const ClauseBuilder: React.FC<ClauseBuilderProps> = ({ clauses, onChange }) => {
  const addClause = (type: Clause['type']) => {
    let title = 'Custom Clause';
    let params: Record<string, any> = {};

    if (type === 'DEPOSIT') {
      title = 'Security Deposit';
      params = { amountPercent: 15, refundable: true };
    } else if (type === 'LATE_FEE') {
      title = 'Late Return Surcharge';
      params = { dailyFee: 50 };
    } else if (type === 'CANCELLATION_WINDOW') {
      title = 'Cancellation Policy';
      params = { windowHours: 24, penaltyPercent: 10 };
    } else if (type === 'DAMAGE_LIABILITY') {
      title = 'Damage Liability Policy';
      params = { maxDeductible: 500 };
    } else if (type === 'REQUIRES_ARBITRATION') {
      title = 'RentAny Platform Binding Arbitration';
      params = { arbitratorRole: 'ADMIN_ARBITRATOR' };
    }

    onChange([...clauses, { type, title, params }]);
  };

  const removeClause = (index: number) => {
    onChange(clauses.filter((_, i) => i !== index));
  };

  const updateClauseParam = (index: number, paramKey: string, value: any) => {
    const updated = [...clauses];
    updated[index].params = { ...updated[index].params, [paramKey]: value };
    onChange(updated);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => addClause('DEPOSIT')}>
          <Plus size={14} /> + Security Deposit
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => addClause('LATE_FEE')}>
          <Plus size={14} /> + Late Fee
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => addClause('CANCELLATION_WINDOW')}>
          <Plus size={14} /> + Cancellation Policy
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => addClause('DAMAGE_LIABILITY')}>
          <Plus size={14} /> + Damage Liability
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => addClause('REQUIRES_ARBITRATION')}>
          <Plus size={14} /> + Binding Arbitration
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {clauses.map((clause, idx) => (
          <div key={idx} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="badge badge-property" style={{ fontSize: '0.7rem' }}>{clause.type}</span>
              <button type="button" onClick={() => removeClause(idx)} style={{ background: 'transparent', color: '#f87171' }}>
                <Trash2 size={16} />
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                value={clause.title}
                onChange={(e) => {
                  const updated = [...clauses];
                  updated[idx].title = e.target.value;
                  onChange(updated);
                }}
              />
            </div>

            {clause.type === 'DEPOSIT' && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <label>
                  Deposit %:
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '80px', display: 'inline-block', marginLeft: '0.5rem', padding: '0.2rem 0.4rem' }}
                    value={clause.params.amountPercent || 10}
                    onChange={(e) => updateClauseParam(idx, 'amountPercent', parseFloat(e.target.value))}
                  />
                </label>
              </div>
            )}

            {clause.type === 'LATE_FEE' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <label>
                  Daily Fee ($):
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '100px', display: 'inline-block', marginLeft: '0.5rem', padding: '0.2rem 0.4rem' }}
                    value={clause.params.dailyFee || 50}
                    onChange={(e) => updateClauseParam(idx, 'dailyFee', parseFloat(e.target.value))}
                  />
                </label>
              </div>
            )}

            {clause.type === 'CANCELLATION_WINDOW' && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <label>
                  Free Cancel Hours:
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '80px', display: 'inline-block', marginLeft: '0.5rem', padding: '0.2rem 0.4rem' }}
                    value={clause.params.windowHours || 24}
                    onChange={(e) => updateClauseParam(idx, 'windowHours', parseInt(e.target.value, 10))}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
