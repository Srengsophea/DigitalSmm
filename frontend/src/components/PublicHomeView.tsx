import React from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe2,
  Users,
  Smartphone,
  Star,
} from 'lucide-react';
import { PlatformPillsBar } from './PlatformPillsBar';

interface PublicHomeViewProps {
  onExploreServices: () => void;
  onSignUp: () => void;
  onSelectPlatform: (platform: string) => void;
  selectedPlatform: string;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  onExploreServices,
  onSignUp,
  onSelectPlatform,
  selectedPlatform,
}) => {
  return (
    <div>
      {/* 1. Hero Banner */}
      <section className="public-hero-section">
        <div className="public-hero-container">
          <div className="public-hero-badge">
            <span className="public-hero-pulse" />
            <span>SMMFollows Direct Provider Infrastructure · Live & Ready</span>
            <Sparkles size={14} color="#0284c7" />
          </div>

          <h1 className="public-hero-title">
            Scale Your Social Presence With <br />
            <span className="gradient-text">Autonomous Automated SMM</span>
          </h1>

          <p className="public-hero-subtitle">
            Connect directly to over 7,500+ verified social media marketing services with instant automated dispatch,
            live retention monitoring, wholesale pricing, and Cambodian Bakong KHQR wallet top-ups.
          </p>

          <div className="public-hero-actions">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={onSignUp}
            >
              <DollarSign size={18} />
              Claim $10 Free Welcome Bonus →
            </button>

            <button
              type="button"
              className="btn-hero-secondary"
              onClick={onExploreServices}
            >
              <Layers size={18} color="#162399" />
              Browse 7,500+ Services & Rates
            </button>
          </div>

          {/* Public Hero Stats Grid */}
          <div className="public-stats-grid">
            <div className="public-stat-card">
              <Zap size={22} color="#162399" />
              <div className="public-stat-value">7,568+</div>
              <div className="public-stat-label">Active Provider Services</div>
            </div>

            <div className="public-stat-card">
              <Clock size={22} color="#0284c7" />
              <div className="public-stat-value">&lt; 60s</div>
              <div className="public-stat-label">Average Automated Dispatch</div>
            </div>

            <div className="public-stat-card">
              <Lock size={22} color="#16a34a" />
              <div className="public-stat-value">AES-256</div>
              <div className="public-stat-label">Encrypted Data & Ledger</div>
            </div>

            <div className="public-stat-card">
              <ShieldCheck size={22} color="#d97706" />
              <div className="public-stat-value">99.98%</div>
              <div className="public-stat-label">API Automation Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Supported Platforms Showcase with Enlarged PlatformPillsBar */}
      <section style={{ maxWidth: 1380, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Supported Networks & Platforms
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.94rem' }}>
            Select any platform below to instantly filter all active wholesale services and pricing.
          </p>
        </div>

        <PlatformPillsBar
          selectedPlatform={selectedPlatform}
          onSelectPlatform={(plat) => {
            onSelectPlatform(plat);
            onExploreServices();
          }}
        />
      </section>

      {/* 3. Three-Step Quick How It Works */}
      <section style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#162399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              HOW IT WORKS
            </span>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 0 0' }}>
              Start Growing in 3 Simple Steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28, position: 'relative' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#162399', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', marginBottom: 18 }}>
                1
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Create Free Account
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Sign up in under 30 seconds with Google or email. Receive an automatic <strong>$10.00 free welcome credit</strong> to try any service immediately.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28, position: 'relative' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', marginBottom: 18 }}>
                2
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Select Service & Target Link
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Browse our catalog of 7,500+ services. Enter your public profile link and desired quantity. No passwords ever required.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28, position: 'relative' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', marginBottom: 18 }}>
                3
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Automated High-Speed Delivery
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Our automated SMMFollows provider engine dispatches your order in seconds. Track live progress, delivery speed, and refills in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom High-Converting CTA Banner */}
      <section style={{ maxWidth: 1180, margin: '60px auto', padding: '0 24px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #162399 0%, #0c1666 100%)',
            borderRadius: 20,
            padding: '48px 40px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 24,
            boxShadow: '0 16px 36px rgba(22, 35, 153, 0.28)',
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <span className="badge-bonus-pill" style={{ display: 'inline-block', marginBottom: 12 }}>
              INSTANT $10 FREE TRIAL BONUS
            </span>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', margin: '0 0 10px 0' }}>
              Ready to Accelerate Your Social Growth?
            </h2>
            <p style={{ fontSize: '0.98rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              Join over 50,000+ creators, agencies, and resellers worldwide. Claim your $10 free welcome balance today with no deposit required.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-hero-primary"
              style={{ background: '#ffffff', color: '#162399', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              onClick={onSignUp}
            >
              Get Started with $10 Bonus →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

function Clock(props: any) {
  return <TrendingUp {...props} />;
}
