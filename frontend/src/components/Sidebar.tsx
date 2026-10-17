import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Layers,
  Heart,
  ClipboardList,
  CreditCard,
  HelpCircle,
  Code2,
  Ticket,
  FileText,
  DollarSign,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  openTicketModal: () => void;
  onNavigate?: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  openTicketModal,
  onNavigate,
}) => {
  const { user, isAdmin } = useAuth();
  const username = user?.username || 'Guest';

  const handleNav = (page: string, path: string) => {
    setActivePage(page);
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <aside className="sidebar">
      {/* Top Logo */}
      <div className="sidebar-header">
        <div
          className="sidebar-logo"
          onClick={() => handleNav('services', '/services')}
          style={{ cursor: 'pointer' }}
        >
          <span style={{ color: '#162399', fontWeight: 900 }}>DIGITALSMM</span>
        </div>
        <button className="sidebar-collapse-btn" title="Collapse sidebar">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* User Avatar & Welcome */}
      <div className="sidebar-user-card">
        <div className="user-avatar-circle">
          {/* Blue illustrated avatar character */}
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="18" r="10" fill="#3b82f6" />
            <path
              d="M10 40C10 32.268 16.268 26 24 26C31.732 26 38 32.268 38 40"
              fill="#1d4ed8"
            />
            <path
              d="M20 28L24 35L28 28"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="user-welcome-text">
          Welcome {username}
        </div>
        {!user && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/login')}
              style={{
                background: '#162399',
                border: 'none',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/signup')}
              style={{
                background: 'rgba(22, 35, 153, 0.08)',
                border: '1px solid #162399',
                color: '#162399',
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Sign Up
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links matching SMMFollows screenshot */}
      <nav className="sidebar-nav">
        {/* New Order */}
        <button
          className={`nav-item ${activePage === 'new-order' ? 'active' : ''}`}
          onClick={() => handleNav('new-order', '/new-order')}
        >
          <Box size={18} color={activePage === 'new-order' ? '#ffffff' : '#64748b'} />
          <span>New order</span>
        </button>

        {/* Mass Order */}
        <button
          className={`nav-item ${activePage === 'mass-order' ? 'active' : ''}`}
          onClick={() => handleNav('mass-order', '/mass-order')}
        >
          <Layers size={18} color={activePage === 'mass-order' ? '#ffffff' : '#64748b'} />
          <span>Mass order</span>
        </button>

        {/* Services */}
        <button
          className={`nav-item ${activePage === 'services' ? 'active' : ''}`}
          onClick={() => handleNav('services', '/services')}
        >
          <Heart size={18} color={activePage === 'services' ? '#ffffff' : '#64748b'} />
          <span>Services</span>
        </button>

        {/* Orders */}
        <button
          className={`nav-item ${activePage === 'orders' ? 'active' : ''}`}
          onClick={() => handleNav('orders', '/orders')}
        >
          <ClipboardList size={18} color={activePage === 'orders' ? '#ffffff' : '#64748b'} />
          <span>Orders</span>
        </button>

        {/* Add funds */}
        <button
          className={`nav-item ${activePage === 'add-funds' ? 'active' : ''}`}
          onClick={() => handleNav('add-funds', '/add-funds')}
        >
          <CreditCard size={18} color={activePage === 'add-funds' ? '#ffffff' : '#64748b'} />
          <span>Add funds</span>
        </button>

        {/* FAQ */}
        <button
          className={`nav-item ${activePage === 'faq' ? 'active' : ''}`}
          onClick={() => handleNav('faq', '/faq')}
        >
          <HelpCircle size={18} color={activePage === 'faq' ? '#ffffff' : '#64748b'} />
          <span>FAQ</span>
        </button>

        {/* API */}
        <button
          className={`nav-item ${activePage === 'api' ? 'active' : ''}`}
          onClick={() => handleNav('api', '/api')}
        >
          <Code2 size={18} color={activePage === 'api' ? '#ffffff' : '#64748b'} />
          <span>API</span>
        </button>

        {/* Tickets */}
        <button
          className={`nav-item ${activePage === 'tickets' ? 'active' : ''}`}
          onClick={() => handleNav('tickets', '/tickets')}
        >
          <Ticket size={18} color={activePage === 'tickets' ? '#ffffff' : '#64748b'} />
          <span>Tickets</span>
          <span className="ticket-badge">1</span>
        </button>

        {/* Terms */}
        <button
          className={`nav-item ${activePage === 'terms' ? 'active' : ''}`}
          onClick={() => handleNav('terms', '/terms')}
        >
          <FileText size={18} color={activePage === 'terms' ? '#ffffff' : '#64748b'} />
          <span>Terms</span>
        </button>

        {/* Affiliates */}
        <button
          className={`nav-item ${activePage === 'affiliates' ? 'active' : ''}`}
          onClick={() => handleNav('affiliates', '/affiliates')}
        >
          <DollarSign size={18} color={activePage === 'affiliates' ? '#ffffff' : '#64748b'} />
          <span>Affiliates(Earn money with digitalsmm)</span>
        </button>

        {/* Admin Center (ONLY for authorized admins) */}
        {isAdmin && (
          <button
            className={`nav-item ${activePage === 'admin' ? 'active' : ''}`}
            onClick={() => handleNav('admin', '/admin')}
            style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}
          >
            <ShieldCheck size={18} color="#0284c7" />
            <span style={{ color: '#0284c7', fontWeight: 700 }}>Admin Center</span>
          </button>
        )}
      </nav>
    </aside>
  );
};
