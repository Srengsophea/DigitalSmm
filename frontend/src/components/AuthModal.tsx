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
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { GoogleAccountPickerModal } from './GoogleAccountPickerModal';
import { hasGoogleClientId, requestGoogleAccessToken } from '../services/googleAuth';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, sendSignupOtp, verifySignupOtp, resendSignupOtp, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [registerStep, setRegisterStep] = useState<'details' | 'otp'>('details');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [is2FAPrompt, setIs2FAPrompt] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'success'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google sign in modal state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Forgot password timer
  React.useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setErrorMessage('Please enter your email/username and password.');
          setIsLoading(false);
          return;
        }

        if (is2FAPrompt && (!twoFactorCode.trim() || twoFactorCode.trim().length < 6)) {
          setErrorMessage('Please enter the 6-digit authenticator code.');
          setIsLoading(false);
          return;
        }

        const res = await login(
          email.trim(),
          password,
          is2FAPrompt ? twoFactorCode.trim() : undefined
        );

        if (res.requires2FA) {
          setIs2FAPrompt(true);
          setErrorMessage(null);
          setSuccessMessage('Two-Factor Authentication required. Enter code from your authenticator app.');
          return;
        }

        if (res.user) {
          onClose();
        }
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

  // Forgot password handlers
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = forgotEmail.trim();
    if (!query) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.auth.forgotPassword(query);
      setForgotStep('otp');
      setForgotCooldown(60);
      setSuccessMessage(res.message || `Verification code dispatched to ${res.email || query}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (forgotCooldown > 0 || isLoading) return;
    const query = forgotEmail.trim();
    if (!query) return;

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await api.auth.forgotPassword(query);
      setForgotCooldown(60);
      setSuccessMessage(res.message || 'A new verification code has been dispatched.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = forgotEmail.trim();
    const otp = forgotOtp.trim();

    if (!otp || otp.length < 4) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.auth.resetPassword(query, otp, forgotNewPassword);
      setForgotStep('success');
      setSuccessMessage(res.message || 'Password successfully reset!');
      setEmail(query);
      setPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWithGoogle = async () => {
    setErrorMessage(null);
    if (hasGoogleClientId()) {
      setIsLoading(true);
      try {
        const googleRes = await requestGoogleAccessToken();
        await loginWithGoogle({
          email: googleRes.email,
          name: googleRes.name,
          accessToken: googleRes.accessToken,
          credential: googleRes.credential,
        });
        onClose();
      } catch (err: any) {
        if (err.message !== 'GOOGLE_CLIENT_ID_NOT_CONFIGURED') {
          setErrorMessage(err.message || 'Google sign-in was cancelled.');
        } else {
          setIsGoogleModalOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsGoogleModalOpen(true);
    }
  };

  const handleGoogleConfigured = async () => {
    setIsGoogleModalOpen(false);
    await handleConnectWithGoogle();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        {/* Header Tabs */}
        <div className="modal-header">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {mode === 'forgot' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 700, fontSize: '0.95rem' }}>
                <KeyRound size={16} color="#0284c7" />
                <span>Password Recovery</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={`chip-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('login');
                    setRegisterStep('details');
                    setIs2FAPrompt(false);
                    setTwoFactorCode('');
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
                    setIs2FAPrompt(false);
                    setTwoFactorCode('');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  <UserPlus size={14} /> Sign Up
                </button>
              </>
            )}
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Google Sign In Button */}
          {mode !== 'forgot' && registerStep !== 'otp' && !is2FAPrompt && (
            <>
              <button
                type="button"
                className="google-auth-btn"
                onClick={handleConnectWithGoogle}
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
                ) : mode === 'login' ? (
                  /* Login Mode */
                  is2FAPrompt ? (
                    <div style={{ animation: 'fadeIn 0.25s ease' }}>
                      <div
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: 10,
                          padding: '16px',
                          marginBottom: 16,
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: '#162399',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 8px',
                          }}
                        >
                          <Shield size={22} />
                        </div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', color: '#0f172a' }}>2FA Verification</h4>
                        <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b' }}>
                          Enter 6-digit code for <strong>{email}</strong>
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
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isLoading || twoFactorCode.length < 6}
                        style={{ padding: '12px', fontSize: '0.95rem' }}
                      >
                        {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIs2FAPrompt(false);
                            setTwoFactorCode('');
                            setErrorMessage(null);
                          }}
                          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.80rem', cursor: 'pointer' }}
                        >
                          Back to credentials
                        </button>
                      </div>
                    </div>
                  ) : (
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label className="form-label" style={{ margin: 0 }}>Password</label>
                          <button
                            type="button"
                            onClick={() => {
                              setMode('forgot');
                              setForgotStep('email');
                              setForgotEmail(email);
                              setForgotOtp('');
                              setForgotNewPassword('');
                              setForgotConfirmPassword('');
                              setErrorMessage(null);
                              setSuccessMessage(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0284c7',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Forgot password?
                          </button>
                        </div>
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
                  )
                ) : (
                  /* Forgot Password Mode */
                  forgotStep === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          background: '#dcfce7',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 14px',
                        }}
                      >
                        <CheckCircle2 size={32} />
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                        Password Updated!
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                        Your password has been changed. You can now sign in using your new credentials.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        onClick={() => {
                          setMode('login');
                          setErrorMessage(null);
                          setSuccessMessage('Password reset successfully! Please sign in with your new password.');
                        }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  ) : forgotStep === 'otp' ? (
                    <div>
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '10px 12px',
                          marginBottom: 14,
                          fontSize: '0.80rem',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <MailCheck size={18} color="#0284c7" />
                        <div>Code sent to <strong>{forgotEmail}</strong></div>
                      </div>

                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label className="form-label" style={{ margin: 0 }}>Verification Code</label>
                          <button
                            type="button"
                            onClick={handleForgotResendOtp}
                            disabled={forgotCooldown > 0 || isLoading}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: forgotCooldown > 0 ? '#94a3b8' : '#0284c7',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: forgotCooldown > 0 ? 'default' : 'pointer',
                            }}
                          >
                            {forgotCooldown > 0 ? `Resend (${forgotCooldown}s)` : 'Resend'}
                          </button>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          className="form-input"
                          style={{
                            textAlign: 'center',
                            fontSize: '1.25rem',
                            letterSpacing: '6px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                          }}
                          placeholder="••••••"
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showForgotNewPass ? 'text' : 'password'}
                            className="form-input"
                            style={{ paddingRight: 36 }}
                            placeholder="At least 6 characters"
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                            }}
                          >
                            {showForgotNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showForgotConfirmPass ? 'text' : 'password'}
                            className="form-input"
                            style={{ paddingRight: 36 }}
                            placeholder="Re-type new password"
                            value={forgotConfirmPassword}
                            onChange={(e) => setForgotConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                            }}
                          >
                            {showForgotConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        disabled={isLoading || forgotOtp.length < 4}
                        onClick={handleForgotResetPassword}
                        style={{ padding: '12px', fontSize: '0.95rem' }}
                      >
                        {isLoading ? 'Updating Password...' : 'Update Password'}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotStep('email');
                            setErrorMessage(null);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '0.80rem',
                            cursor: 'pointer',
                          }}
                        >
                          ← Change email or username
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                        Enter your registered email address or username and we'll dispatch a 6-digit reset code.
                      </p>
                      <div className="form-group">
                        <label className="form-label">Email or Username</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="user@example.com or username"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        disabled={isLoading || !forgotEmail.trim()}
                        onClick={handleForgotSendOtp}
                        style={{ padding: '12px', fontSize: '0.95rem' }}
                      >
                        {isLoading ? 'Dispatching Code...' : 'Send Verification Code'}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('login');
                            setErrorMessage(null);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '0.80rem',
                            cursor: 'pointer',
                          }}
                        >
                          Remember your password? <strong>Sign in</strong>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </form>
            </div>
          </div>

          <GoogleAccountPickerModal
            isOpen={isGoogleModalOpen}
            onClose={() => setIsGoogleModalOpen(false)}
            onConfigured={handleGoogleConfigured}
            isLoading={isLoading}
          />
        </div>
      );
    };
