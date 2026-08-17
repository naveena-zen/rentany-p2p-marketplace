import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(['RENTER']);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (role: string) => {
    if (roles.includes(role)) {
      if (roles.length > 1) {
        setRoles(roles.filter((r) => r !== role));
      }
    } else {
      setRoles([...roles, role]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await register(name, email, password, roles);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '3rem auto' }}>
      <div className="glass-card">
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem' }}>
          Join RentAny Marketplace
        </h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Create an account to list items, negotiate contracts, and rent with escrow protection.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#fca5a5', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Capabilities / Roles</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['RENTER', 'OWNER', 'ADMIN_ARBITRATOR'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`pill-btn ${roles.includes(r) ? 'active' : ''}`}
                  onClick={() => toggleRole(r)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  {r === 'RENTER' ? '👤 Renter' : r === 'OWNER' ? '🏷️ Owner / Lessor' : '⚖️ Arbitrator'}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={submitting}>
            <UserPlus size={16} /> {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1.5rem' }}>
          Already registered? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};
