import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ShieldCheck, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Item, ContractTemplate } from '../types';
import { useAuth } from '../context/AuthContext';
import { TrustBadge } from '../components/TrustBadge';

export const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadItem() {
      try {
        const res = await api.get(`/items/${id}`);
        setItem(res.data);

        // Set default start/end dates (tomorrow to 3 days later)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const threeDays = new Date();
        threeDays.setDate(threeDays.getDate() + 4);

        setStartDate(tomorrow.toISOString().split('T')[0]);
        setEndDate(threeDays.toISOString().split('T')[0]);
      } catch {
        setError('Item not found');
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  const calculateTotal = () => {
    if (!item || !startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

    const diffHours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
    let units = diffHours;
    if (item.pricingUnit === 'DAY') units = Math.ceil(diffHours / 24);
    else if (item.pricingUnit === 'WEEK') units = Math.ceil(diffHours / (24 * 7));
    else if (item.pricingUnit === 'USE') units = 1;

    return item.basePrice * units;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select valid start and end dates');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/agreements', {
        itemId: item?.id,
        templateId: selectedTemplateId || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });

      // Redirect to Renter Dashboard to view request & accept
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('CONCURRENCY LOCK REJECTION: This item is already booked for the requested date range!');
      } else {
        setError(err.response?.data?.error || 'Failed to submit booking request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: '3rem' }}>Loading rental item details...</p>;
  if (!item) return <p style={{ textAlign: 'center', padding: '3rem' }}>Item not found.</p>;

  const totalAmount = calculateTotal();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
      {/* Left Column - Details */}
      <div>
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="badge badge-property">{item.category}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MapPin size={16} /> {item.location}
            </span>
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            {item.title}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', whiteSpace: 'pre-line', marginBottom: '2rem' }}>
            {item.description}
          </p>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Category Specifications</h3>
          <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(item.attributes || {}).map(([key, val]) => (
              <div key={key}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>{key}</span>
                <span style={{ fontWeight: 600, color: '#c7d2fe' }}>{String(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Owner Info */}
        {item.owner && (
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Listed by Verified Owner</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.owner.name}</h3>
            </div>
            <TrustBadge score={item.owner.trustScore} userId={item.owner.id} />
          </div>
        )}
      </div>

      {/* Right Column - Booking Form */}
      <div>
        <div className="glass-card" style={{ position: 'sticky', top: '100px' }}>
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              ${item.basePrice}
            </span>
            <span style={{ color: 'var(--text-muted)' }}> / {item.pricingUnit.toLowerCase()}</span>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#fca5a5', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleBookingSubmit}>
            <div className="form-group">
              <label className="form-label">Rental Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rental End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {/* Total Price Summary */}
            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', margin: '1.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Base Rate:</span>
                <span>${item.basePrice} x duration</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Platform Escrow Fee:</span>
                <span style={{ color: 'var(--success)' }}>Included (5%)</span>
              </div>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                <span>Total Payable:</span>
                <span style={{ color: 'var(--accent-primary)' }}>${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              <CheckCircle size={18} /> {submitting ? 'Locking Reservation...' : 'Request Booking & Review Contract'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            🔒 Concurrency-Safe Lock Guarantee: Funds held in PENDING escrow until completion.
          </p>
        </div>
      </div>
    </div>
  );
};
