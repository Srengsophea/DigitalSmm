import React from 'react';
import { Shield, Zap, Sparkles, TrendingUp, Lock } from 'lucide-react';

interface HeroProps {
  totalServices: number;
  onExplore: () => void;
}

export const Hero: React.FC<HeroProps> = ({ totalServices, onExplore }) => {
  return (
    <section className="hero-section">
      <div className="container">
        {/* Glow badge */}
        <div className="hero-tagline">
          <span className="pulse-dot" />
          <span>High-Speed Provider Nodes Connected & Live</span>
          <Shield size={14} style={{ marginLeft: 4 }} />
        </div>

        {/* Headline */}
        <h1 className="hero-title">
          Scale Social Presence with{' '}
          <span className="hero-gradient-text">Automated High-Speed Delivery</span>
        </h1>

        <p className="hero-subtitle">
          DigitalSMM connects directly to Tier-1 provider infrastructure. Enjoy enterprise-grade
          order dispatch, AES-256 encrypted credentials, and automated refill tracking at wholesale resale pricing.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={onExplore}>
            <Sparkles size={18} />
            Explore 7,500+ Services
          </button>
          <a
            href="#platform-filters"
            className="btn btn-secondary btn-lg"
            onClick={(e) => {
              e.preventDefault();
              onExplore();
            }}
          >
            <TrendingUp size={18} />
            View Resale Rates
          </a>
        </div>

        {/* Stats Grid */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <Zap size={22} color="var(--primary-light)" />
            <div className="stat-value">{totalServices.toLocaleString() || '7,568+'}</div>
            <div className="stat-label">Active Provider Services</div>
          </div>

          <div className="stat-card">
            <TrendingUp size={22} color="var(--cyan-light)" />
            <div className="stat-value">&lt; 60s</div>
            <div className="stat-label">Average Dispatch Start</div>
          </div>

          <div className="stat-card">
            <Lock size={22} color="var(--success-light)" />
            <div className="stat-value">AES-256-GCM</div>
            <div className="stat-label">Encrypted Data & Ledger</div>
          </div>

          <div className="stat-card">
            <Shield size={22} color="var(--warning)" />
            <div className="stat-value">99.98%</div>
            <div className="stat-label">API Automation Uptime</div>
          </div>
        </div>
      </div>
    </section>
  );
};
