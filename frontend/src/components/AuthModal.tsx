import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, LogIn, UserPlus, AlertCircle, Shield, UserCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // Prompt user for their Gmail address or use Google profile
    const inputEmail = window.prompt('Enter your Gmail / Google account email:', 'demo.user@gmail.com');
    if (!inputEmail) {
      setIsLoading(false);
      return;
    }

    try {
      await loginWithGoogle({
        email: inputEmail.trim(),
        name: inputEmail.split('@')[0],
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login('user@digitalsmm.com', 'User@DigitalSMM2026!');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login('admin@digitalsmm.com', 'Admin@DigitalSMM2026!');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Admin login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        {/* Header Tabs */}
        <div className="modal-header">
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className={`chip-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              type="button"
              className={`chip-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
            >
              <UserPlus size={14} /> Sign Up (+ $10 Bonus)
            </button>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Google / Gmail Sign In Button */}
          <button
            type="button"
            className="google-auth-btn"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {/* Official Google G SVG */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>Continue with Google / Gmail</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span>OR WITH EMAIL & PASSWORD</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. social_king"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {mode === 'login' ? 'Email or Username' : 'Email Address'}
              </label>
              <input
                type={mode === 'register' ? 'email' : 'text'}
                className="form-input"
                placeholder={mode === 'login' ? 'Enter email or username' : 'name@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #f87171',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading}
              style={{ padding: '12px', fontSize: '0.95rem' }}
            >
              {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Quick 1-click test buttons */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Instant Test Credentials:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleQuickDemoLogin}
                disabled={isLoading}
              >
                <UserCheck size={13} color="#16a34a" />
                Demo User ($100)
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleQuickAdminLogin}
                disabled={isLoading}
              >
                <Shield size={13} color="#162399" />
                Admin Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
