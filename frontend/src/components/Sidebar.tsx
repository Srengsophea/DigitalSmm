import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  openTicketModal: () => void;
  onNavigate?: (path: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  openTicketModal,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const username = user?.username || 'Guest';

  const [internalCollapsed, setInternalCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  const handleNav = (page: string, path: string) => {
    setActivePage(page);
    if (onNavigate) {
      onNavigate(path);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const iconColor = (page: string) => (activePage === page ? '#ffffff' : isDark ? '#94a3b8' : '#64748b');

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Top Logo */}
      <div className="sidebar-header">
        <div
          className="sidebar-logo"
          onClick={() => handleNav('services', '/services')}
          title="DigitalSMM Home"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img
            src="/logo.png"
            alt="DigitalSMM"
            style={{ width: '30px', height: '30px', objectFit: 'contain', flexShrink: 0 }}
          />
          <span className="sidebar-logo-text" style={{ color: isDark ? '#ffffff' : '#162399', fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1.15rem' }}>
            DIGITAL<span style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>SMM</span>
          </span>
        </div>
        
        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            type="button"
            className="sidebar-close-mobile-btn"
            onClick={onCloseMobile}
            title="Close menu"
          >
            <X size={18} />
          </button>
        )}

        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={handleToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={16}
            style={{
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </div>

      {/* User Avatar & Welcome */}
      <div className="sidebar-user-card">
        <div className="user-avatar-circle" title={user ? `Signed in as ${username}` : 'Guest'}>
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
          <div className="sidebar-guest-actions" style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/login')}
              style={{
                background: isDark ? '#2563eb' : '#162399',
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
                background: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(22, 35, 153, 0.08)',
                border: `1px solid ${isDark ? '#38bdf8' : '#162399'}`,
                color: isDark ? '#38bdf8' : '#162399',
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
          type="button"
          className={`nav-item ${activePage === 'new-order' ? 'active' : ''}`}
          onClick={() => handleNav('new-order', '/new-order')}
          title="New order"
        >
          <Box size={18} color={iconColor('new-order')} />
          <span>New order</span>
        </button>

        {/* Mass Order */}
        <button
          type="button"
          className={`nav-item ${activePage === 'mass-order' ? 'active' : ''}`}
          onClick={() => handleNav('mass-order', '/mass-order')}
          title="Mass order"
        >
          <Layers size={18} color={iconColor('mass-order')} />
          <span>Mass order</span>
        </button>

        {/* Services */}
        <button
          type="button"
          className={`nav-item ${activePage === 'services' ? 'active' : ''}`}
          onClick={() => handleNav('services', '/services')}
          title="Services"
        >
          <Heart size={18} color={iconColor('services')} />
          <span>Services</span>
        </button>

        {/* Orders */}
        <button
          type="button"
          className={`nav-item ${activePage === 'orders' ? 'active' : ''}`}
          onClick={() => handleNav('orders', '/orders')}
          title="Orders"
        >
          <ClipboardList size={18} color={iconColor('orders')} />
          <span>Orders</span>
        </button>

        {/* Add funds */}
        <button
          type="button"
          className={`nav-item ${activePage === 'add-funds' ? 'active' : ''}`}
          onClick={() => handleNav('add-funds', '/add-funds')}
          title="Add funds"
        >
          <CreditCard size={18} color={iconColor('add-funds')} />
          <span>Add funds</span>
        </button>

        {/* FAQ */}
        <button
          type="button"
          className={`nav-item ${activePage === 'faq' ? 'active' : ''}`}
          onClick={() => handleNav('faq', '/faq')}
          title="FAQ"
        >
          <HelpCircle size={18} color={iconColor('faq')} />
          <span>FAQ</span>
        </button>

        {/* API */}
        <button
          type="button"
          className={`nav-item ${activePage === 'api' ? 'active' : ''}`}
          onClick={() => handleNav('api', '/api')}
          title="API"
        >
          <Code2 size={18} color={iconColor('api')} />
          <span>API</span>
        </button>

        {/* Tickets */}
        <button
          type="button"
          className={`nav-item ${activePage === 'tickets' ? 'active' : ''}`}
          onClick={() => handleNav('tickets', '/tickets')}
          title="Tickets"
        >
          <Ticket size={18} color={iconColor('tickets')} />
          <span>Tickets</span>
          <span className="ticket-badge">1</span>
        </button>

        {/* Terms */}
        <button
          type="button"
          className={`nav-item ${activePage === 'terms' ? 'active' : ''}`}
          onClick={() => handleNav('terms', '/terms')}
          title="Terms"
        >
          <FileText size={18} color={iconColor('terms')} />
          <span>Terms</span>
        </button>

        {/* Affiliates */}
        <button
          type="button"
          className={`nav-item ${activePage === 'affiliates' ? 'active' : ''}`}
          onClick={() => handleNav('affiliates', '/affiliates')}
          title="Affiliates (Earn money with digitalsmm)"
        >
          <DollarSign size={18} color={iconColor('affiliates')} />
          <span>Affiliates(Earn money with digitalsmm)</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
          onClick={() => handleNav('settings', '/settings')}
          title="Settings"
        >
          <Settings size={18} color={iconColor('settings')} />
          <span>Settings</span>
        </button>

        {/* Admin Center (ONLY for authorized admins) */}
        {isAdmin && (
          <button
            type="button"
            className={`nav-item admin-nav-item ${activePage === 'admin' ? 'active' : ''}`}
            onClick={() => handleNav('admin', '/admin')}
            title="Admin Center"
            style={{ marginTop: 12, borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9', paddingTop: 14 }}
          >
            <ShieldCheck size={18} color={isDark ? '#38bdf8' : '#0284c7'} />
            <span style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700 }}>Admin Center</span>
          </button>
        )}
      </nav>
    </aside>
  );
};
