import React from 'react';
import {
  X,
  Star,
  Zap,
  Clock,
  ShieldCheck,
  RotateCcw,
  Link2,
  DollarSign,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ServiceItem } from './ServicesTable';

interface ServiceDetailModalProps {
  service: ServiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderNow?: (service: ServiceItem) => void;
  onSignUp?: () => void;
  onSignIn?: () => void;
  isAuthenticated?: boolean;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  isOpen,
  onClose,
  onOrderNow,
  onSignUp,
  onSignIn,
  isAuthenticated = false,
}) => {
  if (!isOpen || !service) return null;

  // Extract speed, start time, refill info
  const nameLower = service.name.toLowerCase();
  const catLower = service.category.toLowerCase();

  const isInstant = nameLower.includes('instant') || catLower.includes('instant');
  const hasRefill = service.refill || nameLower.includes('refill') || nameLower.includes('30d') || nameLower.includes('non-drop');
  const isNoDrop = nameLower.includes('non drop') || nameLower.includes('non-drop') || nameLower.includes('lifetime');

  return (
    <div className="service-details-backdrop" onClick={onClose}>
      <div className="service-details-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="service-details-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: '#162399',
                background: '#e8ecfc',
                padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              #{service.externalId}
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              {service.platform} · {service.category}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="service-details-body">
          {/* Service Title */}
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.35,
              margin: '0 0 16px 0',
            }}
          >
            {service.name}
          </h3>

          {/* Quick Specifications Grid */}
          <div className="spec-grid">
            <div className="spec-box">
              <div className="spec-box-label">Rate per 1,000 units</div>
              <div className="spec-box-val" style={{ color: '#162399' }}>
                ${service.customRate.toFixed(3)}
              </div>
            </div>

            <div className="spec-box">
              <div className="spec-box-label">Min / Max Quantity</div>
              <div className="spec-box-val">
                {service.min.toLocaleString()} — {service.max.toLocaleString()}
              </div>
            </div>

            <div className="spec-box">
              <div className="spec-box-label">Start Time</div>
              <div className="spec-box-val" style={{ fontSize: '0.88rem', color: '#16a34a' }}>
                {isInstant ? '0 - 5 Minutes (Instant)' : '0 - 1 Hour'}
              </div>
            </div>

            <div className="spec-box">
              <div className="spec-box-label">Guarantee & Refill</div>
              <div className="spec-box-val" style={{ fontSize: '0.88rem', color: service.refill ? '#15803d' : '#0369a1' }}>
                {service.refill ? '♻️ Refill Guaranteed' : isNoDrop ? 'Non-Drop Lifetime' : 'Standard Retention'}
              </div>
            </div>

            <div className="spec-box">
              <div className="spec-box-label">Cancel Protection</div>
              <div className="spec-box-val" style={{ fontSize: '0.88rem', color: service.cancel ? '#b45309' : '#64748b' }}>
                {service.cancel ? '🚫 Cancel Allowed' : 'No Cancellation'}
              </div>
            </div>
          </div>

          {/* Service Details & Instructions Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 18,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={14} color="#162399" />
              SERVICE SPECIFICATIONS & GUIDELINES
            </div>

            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: '0.86rem',
                color: '#334155',
                lineHeight: 1.7,
              }}
            >
              <li>
                <strong>Quality:</strong> High retention accounts with realistic profile pictures, bio, and posts.
              </li>
              <li>
                <strong>Speed:</strong> High-speed delivery (~10k to 50k per day depending on server load).
              </li>
              <li>
                <strong>Link Format:</strong> Must be a public link (e.g.{' '}
                <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4, fontSize: '0.82rem' }}>
                  https://...
                </code>
                ). Do not submit private profiles.
              </li>
              <li>
                <strong>Account Privacy:</strong> Never submit passwords. Only public link/username required.
              </li>
              <li>
                <strong>Refill Protection:</strong>{' '}
                {service.refill
                  ? 'Automated refill guaranteed if drop occurs.'
                  : 'Stable non-drop service with organic retention.'}
              </li>
              <li>
                <strong>Cancellation:</strong>{' '}
                {service.cancel
                  ? 'Cancel button is supported by provider on eligible orders.'
                  : 'Direct automated dispatch — cannot be cancelled once processed.'}
              </li>
            </ul>
          </div>

          {/* Non-authenticated Guest Notice */}
          {!isAuthenticated && (
            <div
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
                border: '1px solid #bae6fd',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <DollarSign size={20} />
              </div>
              <div style={{ fontSize: '0.84rem', color: '#0c4a6e', lineHeight: 1.4 }}>
                <strong>Create an Account:</strong> Sign up for a free DigitalSMM account to place instant orders, track delivery status in real-time, and access API keys.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="service-details-footer">
          <button
            type="button"
            className="btn-admin-secondary"
            onClick={onClose}
          >
            Close
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              className="btn-hero-primary"
              style={{ padding: '10px 20px', fontSize: '0.90rem' }}
              onClick={() => {
                onClose();
                if (onOrderNow) onOrderNow(service);
              }}
            >
              Order Service Now →
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-public-signin"
                onClick={() => {
                  onClose();
                  if (onSignIn) onSignIn();
                }}
              >
                <LogIn size={14} />
                Sign In
              </button>
              <button
                type="button"
                className="btn-public-signup"
                onClick={() => {
                  onClose();
                  if (onSignUp) onSignUp();
                }}
              >
                <UserPlus size={14} />
                Sign Up Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
