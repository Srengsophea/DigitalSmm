import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Terminal,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface AdminLoginPageProps {
  onNavigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  const { login, logout } = useAuth();
  const [adminIdentifier, setAdminIdentifier] = useState('admin@digitalsmm.com');
  const [password, setPassword] = useState('');
  const [securityPin, setSecurityPin] = useState('9901');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!adminIdentifier.trim() || !password) {
      setErrorMessage('Administrator credentials are required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(adminIdentifier.trim(), password);

      if (res.requires2FA) {
        setErrorMessage('Two-Factor Authentication is enabled for this administrator account. Please log in through the main login portal to submit your 2FA security code.');
        return;
      }

      const user = res.user;
      if (!user) {
        setErrorMessage('Authentication failed: Missing operator profile.');
        return;
      }

      // Verify that the authenticated account actually has ADMIN privileges
      if (user.role !== 'ADMIN') {
        logout(); // Disallow regular user from staying signed in via admin portal
        setErrorMessage(
          `ACCESS DENIED: Account "${user.username}" is a standard user and lacks administrative clearance. Please use the standard user login.`
        );
        return;
      }

      setSuccessMessage('Administrator clearance verified. Loading Control Center...');
      setTimeout(() => {
        onNavigate('/admin');
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your administrator username and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #070a13 70%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#f8fafc',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Cybernetic Glow Circles */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Admin Card */}
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 20,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(2, 132, 199, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 45px rgba(2, 132, 199, 0.25)',
          backdropFilter: 'blur(20px)',
          padding: '36px 32px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Top Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(14, 165, 233, 0.35))',
              border: '1px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.4)',
            }}
          >
            <ShieldAlert size={28} color="#38bdf8" />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            <Terminal size={12} />
            <span>DigitalSMM Security Gateway</span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Administrator Access Portal
          </h2>

          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Restricted administrative endpoint. Authorized operators and system engineers only.
          </p>
        </div>

        {/* Security Warning Notice */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(234, 179, 8, 0.10)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            color: '#fef08a',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={16} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Access Policy:</strong> All access attempts are recorded in the security audit ledger. Non-admin users will be rejected.
          </span>
        </div>

        {/* Error / Success message */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 20,
              lineHeight: 1.45,
            }}
          >
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#86efac',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <CheckCircle2 size={18} color="#22c55e" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAdminSubmit}>
          {/* Admin Identifier */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Administrator Identifier
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#38bdf8" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type="text"
                required
                placeholder="admin@digitalsmm.com"
                value={adminIdentifier}
                onChange={(e) => setAdminIdentifier(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(2, 132, 199, 0.4)',
                  borderRadius: 10,
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Admin Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Security Passcode
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#38bdf8" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 40px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(2, 132, 199, 0.4)',
                  borderRadius: 10,
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 11,
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Security PIN Code */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.80rem', fontWeight: 600, color: '#cbd5e1' }}>Operator Security PIN</label>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'monospace' }}>ROOT: 9901</span>
            </div>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} color="#38bdf8" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type="text"
                placeholder="9901"
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(2, 132, 199, 0.4)',
                  borderRadius: 10,
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 18px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s ease',
              marginBottom: 14,
            }}
          >
            <ShieldCheck size={18} />
            <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Admin Hub'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Links to User Login */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.80rem',
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} />
            <span>Regular User Login</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/services')}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Browse Services
          </button>
        </div>
      </div>
    </div>
  );
};
