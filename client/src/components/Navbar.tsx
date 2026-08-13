import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, LogOut, PlusCircle, LayoutDashboard, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TrustBadge } from './TrustBadge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isOwner = user?.roles.includes('OWNER');
  const isArbitrator = user?.roles.includes('ADMIN_ARBITRATOR');

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="brand-logo">
          <Shield size={26} color="#6366f1" />
          <span>RentAny</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-item">Explore Marketplace</Link>

          {user ? (
            <>
              {isOwner && (
                <Link to="/owner" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <PlusCircle size={16} /> Owner Hub
                </Link>
              )}

              <Link to="/dashboard" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LayoutDashboard size={16} /> My Bookings
              </Link>

              {isArbitrator && (
                <Link to="/arbitrator" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b' }}>
                  <Scale size={16} /> Arbitrator Hub
                </Link>
              )}

              <TrustBadge score={user.trustScore} userId={user.id} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {user.name}
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <LogOut size={14} /> Exit
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary">Log In</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
