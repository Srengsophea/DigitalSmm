import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  LogIn,
  UserPlus,
  AlertCircle,
  Shield,
  CheckCircle2,
  MailCheck,
  RotateCw,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, sendSignupOtp, verifySignupOtp, resendSignupOtp, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<'details' | 'otp'>('details');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google sign in sub-state
  const [isGooglePromptOpen, setIsGooglePromptOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        onClose();
      } else {
        if (registerStep === 'details') {
          if (!username.trim() || !email.trim() || !password) {
            setErrorMessage('All fields are required.');
            setIsLoading(false);
            return;
          }
          if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters long.');
            setIsLoading(false);
            return;
          }

          const res = await sendSignupOtp(username.trim(), email.trim(), password);
          setRegisterStep('otp');
          setResendCooldown(60);
          setSuccessMessage(res.message || `Verification code dispatched to ${email.trim()}`);
        } else {
          // Verify OTP
          if (!otpCode.trim() || otpCode.trim().length < 6) {
            setErrorMessage('Please enter the 6-digit verification code.');
            setIsLoading(false);
            return;
          }

          await verifySignupOtp(email.trim(), otpCode.trim());
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await resendSignupOtp(email.trim());
      setResendCooldown(60);
      setSuccessMessage(res.message || 'New verification code sent.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput.trim()) {
      setErrorMessage('Please enter your Google / Gmail address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle({
        email: googleEmailInput.trim(),
        name: googleEmailInput.split('@')[0],
      });
      setIsGooglePromptOpen(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed');
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
                setRegisterStep('details');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              type="button"
              className={`chip-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setRegisterStep('details');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <UserPlus size={14} /> Sign Up
            </button>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {isGooglePromptOpen ? (
            <div style={{ padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsGooglePromptOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <ArrowLeft size={16} />
                </button>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                  Sign in with Google / Gmail
                </h4>
              </div>

              <form onSubmit={handleGoogleSubmit}>
                <div className="form-group">
                  <label className="form-label">Google / Gmail Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="yourname@gmail.com"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    autoFocus
                  />
                </div>

                {errorMessage && (
                  <div style={{ color: '#b91c1c', fontSize: '0.84rem', marginBottom: 12 }}>
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={isLoading}
                  style={{ padding: '11px', marginTop: 8 }}
                >
                  {isLoading ? 'Signing in...' : 'Continue with Google'}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Google Sign In Button */}
              {registerStep !== 'otp' && (
                <>
                  <button
                    type="button"
                    className="google-auth-btn"
                    onClick={() => {
                      setErrorMessage(null);
                      setIsGooglePromptOpen(true);
                    }}
                    disabled={isLoading}
                  >
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    <span>OR WITH {mode === 'register' ? 'EMAIL VERIFICATION' : 'CREDENTIALS'}</span>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  </div>
                </>
              )}

              {/* Status messages */}
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

              {successMessage && (
                <div
                  style={{
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    color: '#166534',
                    fontSize: '0.85rem',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {mode === 'register' ? (
                  registerStep === 'details' ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. social_user"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email Address (OTP sent here)</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Password (min 6 chars)</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isLoading}
                        style={{ padding: '12px', fontSize: '0.95rem' }}
                      >
                        {isLoading ? 'Sending verification code...' : 'Verify Email & Continue'}
                      </button>
                    </>
                  ) : (
                    /* Step 2: OTP */
                    <div>
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: '#0284c7',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 8px',
                          }}
                        >
                          <MailCheck size={20} />
                        </div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', color: '#0f172a' }}>Enter Verification Code</h4>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                          Code sent to <strong>{email}</strong>
                        </p>
                      </div>

                      <div className="form-group">
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          className="form-input"
                          style={{
                            textAlign: 'center',
                            fontSize: '1.3rem',
                            letterSpacing: '6px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                          }}
                          placeholder="••••••"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isLoading || otpCode.length < 6}
                        style={{ padding: '12px', fontSize: '0.95rem' }}
                      >
                        {isLoading ? 'Verifying...' : 'Verify & Create Account'}
                      </button>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setRegisterStep('details');
                            setErrorMessage(null);
                          }}
                          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.80rem', cursor: 'pointer' }}
                        >
                          Change Email
                        </button>
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={resendCooldown > 0 || isLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: resendCooldown > 0 ? '#94a3b8' : '#0284c7',
                            fontSize: '0.80rem',
                            fontWeight: 600,
                            cursor: resendCooldown > 0 ? 'default' : 'pointer',
                          }}
                        >
                          {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* Login Mode */
                  <>
                    <div className="form-group">
                      <label className="form-label">Email or Username</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter email or username"
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
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-block"
                      disabled={isLoading}
                      style={{ padding: '12px', fontSize: '0.95rem' }}
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
