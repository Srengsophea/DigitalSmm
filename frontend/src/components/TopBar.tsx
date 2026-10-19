import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Star,
  Banknote,
  Landmark,
  Wallet,
  Plus,
  Settings,
  Sun,
  Power,
  LogIn,
  Menu,
  ShoppingBag,
} from 'lucide-react';

interface TopBarProps {
  activePage?: string;
  openAuthModal?: () => void;
  openDepositModal: () => void;
  onNavigate?: (path: string) => void;
  onNavigatePage?: (page: string, path?: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  openAuthModal,
  openDepositModal,
  onNavigate,
  onNavigatePage,
  onToggleMobileSidebar,
}) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const balance = user?.balance ?? 0;
  const spending = user?.totalSpent ?? 0;
  const totalOrders = user?.totalOrders ?? 0;

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
    if (onNavigatePage) {
      if (isAdmin) {
        onNavigatePage('admin', '/admin');
      } else {
        onNavigatePage('admin-login', '/admin/login');
      }
    } else if (onNavigate) {
      if (isAdmin) {
        onNavigate('/admin');
      } else {
        onNavigate('/admin/login');
      }
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left-wrapper">
        {/* Mobile Hamburger Menu Toggle Button */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            className="mobile-menu-toggle-btn"
            onClick={onToggleMobileSidebar}
            title="Open Menu"
            aria-label="Open Menu"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Top Bar Left Stats - Modern Card Pills */}
        <div className="topbar-stats">
        {/* Status */}
        <div className="topbar-stat-card stat-card-status">
          <div className="stat-card-icon status-icon-bg">
            <User size={15} />
            <span className="status-online-dot" />
          </div>
          <div className="stat-card-text">
            <span className="stat-card-label">Status</span>
            <span className="stat-card-val status-val">
              {isAdmin ? 'VIP Admin' : isAuthenticated ? 'Active User' : 'Guest'}
            </span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="topbar-stat-card stat-card-orders">
          <div className="stat-card-icon orders-icon-bg">
            <ShoppingBag size={15} />
          </div>
          <div className="stat-card-text">
            <span className="stat-card-label">Total Orders</span>
            <span className="stat-card-val">{totalOrders}</span>
          </div>
        </div>

        {/* Account Points */}
        <div className="topbar-stat-card stat-card-points">
          <div className="stat-card-icon points-icon-bg">
            <Star size={15} fill="#f59e0b" />
          </div>
          <div className="stat-card-text">
            <span className="stat-card-label">Account Points</span>
            <span className="stat-card-val">0 = 0.000$</span>
          </div>
        </div>

        {/* Account Spending */}
        <div className="topbar-stat-card stat-card-spending">
          <div className="stat-card-icon spending-icon-bg">
            <Banknote size={15} />
          </div>
          <div className="stat-card-text">
            <span className="stat-card-label">Account Spending</span>
            <span className="stat-card-val">${spending.toFixed(3)}</span>
          </div>
        </div>

        {/* Account Balance (Interactive Card) */}
        <div
          className="topbar-stat-card stat-card-balance"
          onClick={openDepositModal}
          title="Click to Add Funds via Bakong KHQR"
          role="button"
          tabIndex={0}
        >
          <div className="stat-card-icon balance-icon-bg">
            <Wallet size={15} />
          </div>
          <div className="stat-card-text">
            <span className="stat-card-label">Account Balance</span>
            <span className="stat-card-val balance-val">${balance.toFixed(3)}</span>
          </div>
          <button
            type="button"
            className="stat-card-topup-btn"
            onClick={(e) => {
              e.stopPropagation();
              openDepositModal();
            }}
          >
            <Plus size={12} strokeWidth={3} />
            <span>Top-up</span>
          </button>
        </div>
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

        {/* Account Settings */}
        {isAuthenticated && (
          <button
            className={`topbar-circle-btn ${activePage === 'settings' ? 'active' : ''}`}
            title="Settings"
            onClick={() => {
              if (onNavigatePage) {
                onNavigatePage('settings', '/settings');
              } else if (onNavigate) {
                onNavigate('/settings');
              }
            }}
            style={{
              color: activePage === 'settings' ? '#162399' : '#475569',
              background: activePage === 'settings' ? '#e0e7ff' : undefined,
            }}
          >
            <Settings size={15} />
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
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
