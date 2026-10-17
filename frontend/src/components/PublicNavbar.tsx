import React, { useState } from 'react';
import {
  Zap,
  Layers,
  Code2,
  HelpCircle,
  FileText,
  LogIn,
  UserPlus,
  Home,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface PublicNavbarProps {
  activePage: string;
  onNavigate: (path: string) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  activePage,
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="public-navbar">
      <div className="public-navbar-inner">
        {/* Brand Logo */}
        <div className="public-brand" onClick={() => handleNav('/')}>
          <div className="public-brand-icon">
            <Zap size={22} fill="#ffffff" />
          </div>
          <div className="public-brand-text">
            <div className="public-brand-name">
              DIGITAL<span>SMM</span>
            </div>
            <div className="public-brand-tagline">
              AUTOMATED SMM INFRASTRUCTURE
            </div>
          </div>
        </div>

        {/* Desktop Nav Menu Links */}
        <nav className="public-nav-menu">
          <button
            type="button"
            className={`public-nav-link ${activePage === 'home' || activePage === '/' ? 'active' : ''}`}
            onClick={() => handleNav('/')}
          >
            <Home size={15} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`public-nav-link ${activePage === 'services' ? 'active' : ''}`}
            onClick={() => handleNav('/services')}
          >
            <Layers size={15} />
            <span>Services</span>
            <span className="public-nav-badge">7,500+</span>
          </button>

          <button
            type="button"
            className={`public-nav-link ${activePage === 'api' ? 'active' : ''}`}
            onClick={() => handleNav('/api')}
          >
            <Code2 size={15} />
            <span>Reseller API</span>
          </button>

          <button
            type="button"
            className={`public-nav-link ${activePage === 'faq' ? 'active' : ''}`}
            onClick={() => handleNav('/faq')}
          >
            <HelpCircle size={15} />
            <span>FAQ</span>
          </button>

          <button
            type="button"
            className={`public-nav-link ${activePage === 'terms' ? 'active' : ''}`}
            onClick={() => handleNav('/terms')}
          >
            <FileText size={15} />
            <span>Terms</span>
          </button>
        </nav>

        {/* Right Action Buttons */}
        <div className="public-nav-actions">
          <button
            type="button"
            className="btn-public-signin"
            onClick={() => handleNav('/login')}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            className="btn-public-signup"
            onClick={() => handleNav('/signup')}
          >
            <UserPlus size={15} />
            <span>Sign Up</span>
            <span className="badge-bonus-pill">$10 BONUS</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#334155',
              padding: 4,
            }}
            className="mobile-hamburger-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <button
            type="button"
            className={`public-nav-link ${activePage === 'home' || activePage === '/' ? 'active' : ''}`}
            onClick={() => handleNav('/')}
          >
            <Home size={16} /> Home
          </button>
          <button
            type="button"
            className={`public-nav-link ${activePage === 'services' ? 'active' : ''}`}
            onClick={() => handleNav('/services')}
          >
            <Layers size={16} /> Services (7,500+)
          </button>
          <button
            type="button"
            className={`public-nav-link ${activePage === 'api' ? 'active' : ''}`}
            onClick={() => handleNav('/api')}
          >
            <Code2 size={16} /> Reseller API
          </button>
          <button
            type="button"
            className={`public-nav-link ${activePage === 'faq' ? 'active' : ''}`}
            onClick={() => handleNav('/faq')}
          >
            <HelpCircle size={16} /> FAQ
          </button>
          <button
            type="button"
            className={`public-nav-link ${activePage === 'terms' ? 'active' : ''}`}
            onClick={() => handleNav('/terms')}
          >
            <FileText size={16} /> Terms
          </button>
        </div>
      )}
    </header>
  );
};
