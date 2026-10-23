import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
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
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

interface PublicNavbarProps {
  activePage: string;
  onNavigate: (path: string) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  activePage,
  onNavigate,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="public-navbar">
        <div className="public-navbar-inner">
          {/* Brand Logo */}
          <div
            className="public-brand"
            onClick={() => handleNav('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleNav('/');
            }}
          >
            <div className="public-brand-icon">
              <img src="/logo.png" alt="DigitalSMM Logo" className="public-brand-logo-img" />
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
          <nav className="public-nav-menu" aria-label="Desktop Navigation">
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
              className="topbar-circle-btn theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              onClick={toggleTheme}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? (
                <Moon size={16} style={{ color: '#38bdf8' }} />
              ) : (
                <Sun size={16} style={{ color: '#f59e0b' }} />
              )}
            </button>

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
            </button>

            {/* Mobile Menu Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`mobile-hamburger-btn ${mobileMenuOpen ? 'active' : ''}`}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="public-mobile-drawer" role="dialog" aria-modal="true">
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-badge">
                <Sparkles size={13} /> SMM Provider Direct Network
              </span>
            </div>

            <nav className="mobile-drawer-nav" aria-label="Mobile Navigation">
              <button
                type="button"
                className={`mobile-drawer-link ${activePage === 'home' || activePage === '/' ? 'active' : ''}`}
                onClick={() => handleNav('/')}
              >
                <div className="mobile-drawer-link-left">
                  <div className="mobile-drawer-link-icon">
                    <Home size={16} />
                  </div>
                  <span>Home</span>
                </div>
                <ChevronRight size={16} className="mobile-drawer-chevron" />
              </button>

              <button
                type="button"
                className={`mobile-drawer-link ${activePage === 'services' ? 'active' : ''}`}
                onClick={() => handleNav('/services')}
              >
                <div className="mobile-drawer-link-left">
                  <div className="mobile-drawer-link-icon">
                    <Layers size={16} />
                  </div>
                  <span>Services</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="public-nav-badge">7,500+</span>
                  <ChevronRight size={16} className="mobile-drawer-chevron" />
                </div>
              </button>

              <button
                type="button"
                className={`mobile-drawer-link ${activePage === 'api' ? 'active' : ''}`}
                onClick={() => handleNav('/api')}
              >
                <div className="mobile-drawer-link-left">
                  <div className="mobile-drawer-link-icon">
                    <Code2 size={16} />
                  </div>
                  <span>Reseller API</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="mobile-drawer-api-tag">REST v2</span>
                  <ChevronRight size={16} className="mobile-drawer-chevron" />
                </div>
              </button>

              <button
                type="button"
                className={`mobile-drawer-link ${activePage === 'faq' ? 'active' : ''}`}
                onClick={() => handleNav('/faq')}
              >
                <div className="mobile-drawer-link-left">
                  <div className="mobile-drawer-link-icon">
                    <HelpCircle size={16} />
                  </div>
                  <span>FAQ</span>
                </div>
                <ChevronRight size={16} className="mobile-drawer-chevron" />
              </button>

              <button
                type="button"
                className={`mobile-drawer-link ${activePage === 'terms' ? 'active' : ''}`}
                onClick={() => handleNav('/terms')}
              >
                <div className="mobile-drawer-link-left">
                  <div className="mobile-drawer-link-icon">
                    <FileText size={16} />
                  </div>
                  <span>Terms of Service</span>
                </div>
                <ChevronRight size={16} className="mobile-drawer-chevron" />
              </button>
            </nav>

            {/* Mobile Auth Actions */}
            <div className="mobile-drawer-actions">
              <button
                type="button"
                className="btn-mobile-signup"
                onClick={() => handleNav('/signup')}
              >
                <UserPlus size={16} />
                <span>Create Free Account</span>
              </button>

              <button
                type="button"
                className="btn-mobile-signin"
                onClick={() => handleNav('/login')}
              >
                <LogIn size={16} />
                <span>Sign In to Dashboard</span>
              </button>

              <div className="mobile-drawer-footer">
                <ShieldCheck size={14} style={{ color: '#16a34a' }} />
                <span>Instant Automated Delivery · 24/7 Monitoring</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="public-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};
