import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  Layers,
  ShoppingBag,
  History,
  Code2,
  ShieldCheck,
  PlusCircle,
  LogOut,
  User,
  LogIn,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openDepositModal: () => void;
  openAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openDepositModal,
  openAuthModal,
}) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        {/* Brand Logo */}
        <div
          className="brand-logo"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('services')}
        >
          <div className="brand-icon-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="DigitalSMM" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          </div>
          <div>
            Digital<span className="brand-highlight">SMM</span>
            <div style={{ fontSize: '0.65rem', color: 'var(--cyan-light)', fontWeight: 500, letterSpacing: '0.04em' }}>
              DIRECT PROVIDER ENGINE
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-links">
          <button
            className={`nav-link-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Layers size={16} />
            Services
          </button>

          {isAuthenticated && (
            <button
              className={`nav-link-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <History size={16} />
              My Orders
            </button>
          )}

          <button
            className={`nav-link-btn ${activeTab === 'api-docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-docs')}
          >
            <Code2 size={16} />
            Reseller API
          </button>

          {isAdmin && (
            <button
              className={`nav-link-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{ color: 'var(--cyan-light)' }}
            >
              <ShieldCheck size={16} />
              Admin Center
            </button>
          )}
        </nav>

        {/* Actions & User Section */}
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              {/* Wallet Balance Badge */}
              <div className="wallet-badge">
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Balance:</span>
                <span className="wallet-balance">${user?.balance.toFixed(3)}</span>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  onClick={openDepositModal}
                >
                  <PlusCircle size={14} />
                  Add Funds
                </button>
              </div>

              {/* User Dropdown / Menu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="badge badge-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <User size={13} />
                  {user?.username}
                  {isAdmin && <span style={{ color: 'var(--cyan-light)', marginLeft: '4px' }}>(Admin)</span>}
                </span>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={logout}
                  title="Logout"
                  style={{ padding: '6px 10px' }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={openAuthModal}>
              <LogIn size={15} />
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
