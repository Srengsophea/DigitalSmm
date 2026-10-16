import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Star,
  Banknote,
  Landmark,
  Settings,
  Sun,
  Power,
  LogIn,
} from 'lucide-react';

interface TopBarProps {
  openAuthModal?: () => void;
  openDepositModal: () => void;
  onNavigate?: (path: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ openAuthModal, openDepositModal, onNavigate }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const balance = user?.balance ?? 0;

  const handleSignIn = () => {
    if (onNavigate) {
      onNavigate('/login');
    } else if (openAuthModal) {
      openAuthModal();
    }
  };

  const handleSignUp = () => {
    if (onNavigate) {
      onNavigate('/signup');
    } else if (openAuthModal) {
      openAuthModal();
    }
  };

  const handleAdminClick = () => {
    if (onNavigate) {
      if (isAdmin) {
        onNavigate('/admin');
      } else {
        onNavigate('/admin/login');
      }
    }
  };

  return (
    <header className="topbar">
      {/* Top Bar Left Stats matching SMMFollows screenshot */}
      <div className="topbar-stats">
        {/* Status */}
        <div className="stat-item">
          <div className="stat-icon-wrapper">
            <User size={16} />
          </div>
          <span>Status</span>
          <span className="stat-value">{isAdmin ? 'VIP Admin' : isAuthenticated ? 'Active User' : 'Guest'}</span>
        </div>

        {/* Account Points */}
        <div className="stat-item">
          <div className="stat-icon-wrapper">
            <Star size={16} />
          </div>
          <span>Account Points</span>
          <span className="stat-value">0 = 0.00$</span>
        </div>

        {/* Account Spending */}
        <div className="stat-item">
          <div className="stat-icon-wrapper">
            <Banknote size={16} />
          </div>
          <span>Account Spending</span>
          <span className="stat-value">$0</span>
        </div>

        {/* Account Balance */}
        <div
          className="stat-item"
          style={{ cursor: 'pointer' }}
          onClick={openDepositModal}
          title="Click to Add Funds (KHQR Bakong)"
        >
          <div className="stat-icon-wrapper">
            <Landmark size={16} />
          </div>
          <span>Account Balance</span>
          <span className="stat-value" style={{ color: '#162399', fontSize: '0.92rem' }}>
            ${balance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Top Bar Right Actions */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Admin Center Button (ONLY shown to authenticated admins) */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleAdminClick}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.80rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
            }}
          >
            <span>Admin Center</span>
          </button>
        )}

        {/* Theme Light / Dark */}
        <button className="topbar-circle-btn" title="Toggle Theme">
          <Sun size={15} />
        </button>

        {/* Logout or Login/Signup buttons */}
        {isAuthenticated ? (
          <button
            className="topbar-circle-btn"
            title="Logout"
            onClick={logout}
            style={{ color: '#dc2626' }}
          >
            <Power size={15} />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleSignIn}
              style={{
                background: 'transparent',
                border: '1px solid #162399',
                color: '#162399',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              style={{
                background: '#162399',
                border: 'none',
                color: '#ffffff',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 35, 153, 0.25)',
              }}
            >
              Sign Up ($10)
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
