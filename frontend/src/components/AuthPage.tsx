import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Globe2,
  DollarSign,
  Gift,
  HelpCircle,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
  RotateCw,
  MailCheck,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { PublicNavbar } from './PublicNavbar';
import { GoogleAccountPickerModal } from './GoogleAccountPickerModal';
import { hasGoogleClientId, requestGoogleAccessToken, initGoogleIdentityServices } from '../services/googleAuth';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onNavigate,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { login, sendSignupOtp, verifySignupOtp, resendSignupOtp, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Signup step: 'details' -> 'otp'
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');

  // Form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // 2FA TOTP verification state during login
  const [is2FAPrompt, setIs2FAPrompt] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Resend OTP Countdown timer
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google sign in modal state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'success'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  useEffect(() => {
    setMode(initialMode);
    setSignupStep('details');
    setIs2FAPrompt(false);
    setTwoFactorCode('');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [initialMode]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Forgot password cooldown timer effect
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  // Open Forgot Password modal with clean state
  const handleOpenForgotModal = () => {
    setIsForgotModalOpen(true);
    setForgotStep('email');
    setForgotEmail(loginIdentifier.trim());
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setShowForgotNewPass(false);
    setShowForgotConfirmPass(false);
    setForgotError(null);
    setForgotSuccessMsg(null);
  };

  // Step 1: Request Password Reset OTP
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = forgotEmail.trim();
    if (!query) {
      setForgotError('Please enter your account email address or username.');
      return;
    }
    setForgotError(null);
    setForgotSuccessMsg(null);
    setForgotLoading(true);

    try {
      const res = await api.auth.forgotPassword(query);
      setForgotStep('otp');
      setForgotCooldown(60);
      setForgotSuccessMsg(res.message || `A verification code has been dispatched to ${res.email || query}.`);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to dispatch verification code. Please verify your email.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Resend OTP during reset process
  const handleForgotResendOtp = async () => {
    if (forgotCooldown > 0 || forgotLoading) return;
    const query = forgotEmail.trim();
    if (!query) return;

    setForgotError(null);
    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(query);
      setForgotCooldown(60);
      setForgotSuccessMsg(res.message || 'A fresh verification code has been dispatched.');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to resend verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP and apply new password
  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = forgotEmail.trim();
    const otp = forgotOtp.trim();

    if (!otp || otp.length < 4) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please verify your new password.');
      return;
    }

    setForgotError(null);
    setForgotSuccessMsg(null);
    setForgotLoading(true);

    try {
      const res = await api.auth.resetPassword(query, otp, forgotNewPassword);
      setForgotStep('success');
      setForgotSuccessMsg(res.message || 'Your password has been successfully reset.');
      setLoginIdentifier(query);
      setPassword('');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password. Please verify your code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Login or Step 1 Signup Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'signup') {
      if (signupStep === 'details') {
        if (!username.trim() || !email.trim() || !password) {
          setErrorMessage('All fields are required.');
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          return;
        }
        if (!agreeTerms) {
          setErrorMessage('You must agree to the Terms of Service & Privacy Policy.');
          return;
        }

        setIsLoading(true);
        try {
          const res = await sendSignupOtp(username.trim(), email.trim(), password);
          setSignupStep('otp');
          setResendCooldown(60);
          setSuccessMessage(res.message || `Verification code sent to ${email.trim()}`);
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to dispatch verification code. Please check your email.');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Step 2: Verify OTP
        if (!otpCode.trim() || otpCode.trim().length < 6) {
          setErrorMessage('Please enter the 6-digit verification code.');
          return;
        }

        setIsLoading(true);
        try {
          const user = await verifySignupOtp(email.trim(), otpCode.trim());
          setSuccessMessage(`Account verified! Welcome, ${user.username}. Redirecting...`);
          setTimeout(() => {
            onNavigate('/new-order');
          }, 600);
        } catch (err: any) {
          setErrorMessage(err.message || 'Verification failed. Please check the code.');
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      // User / Password Login & 2FA Challenge
      if (!loginIdentifier.trim() || !password) {
        setErrorMessage('Please enter your username/email and password.');
        return;
      }

      if (is2FAPrompt && (!twoFactorCode.trim() || twoFactorCode.trim().length < 6)) {
        setErrorMessage('Please enter the 6-digit authenticator code.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await login(
          loginIdentifier.trim(),
          password,
          is2FAPrompt ? twoFactorCode.trim() : undefined
        );

        if (res.requires2FA) {
          setIs2FAPrompt(true);
          setErrorMessage(null);
          setSuccessMessage('Two-Factor Authentication is active. Enter the 6-digit code from your authenticator app.');
          return;
        }

        if (res.user) {
          setSuccessMessage(`Welcome back, ${res.user.username}! Redirecting...`);
          setTimeout(() => {
            if (res.user?.role === 'ADMIN') {
              onNavigate('/admin');
            } else {
              onNavigate('/new-order');
            }
          }, 600);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid credentials. Please verify your username and password.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await resendSignupOtp(email.trim());
      setResendCooldown(60);
      setSuccessMessage(res.message || 'New verification code dispatched.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
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
        const user = await loginWithGoogle({
          email: googleRes.email,
          name: googleRes.name,
          picture: googleRes.picture,
          accessToken: googleRes.accessToken,
          credential: googleRes.credential,
        });
        setSuccessMessage(`Welcome ${user.username}! Signed in with Google.`);
        setTimeout(() => {
          onNavigate('/new-order');
        }, 600);
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

  // Initialize Google One Tap if client ID is configured
  useEffect(() => {
    if (hasGoogleClientId()) {
      initGoogleIdentityServices(async (credential) => {
        setIsLoading(true);
        try {
          const user = await loginWithGoogle({ credential });
          setSuccessMessage(`Welcome ${user.username}! Signed in with Google.`);
          setTimeout(() => {
            onNavigate('/new-order');
          }, 600);
        } catch (err: any) {
          setErrorMessage(err.message || 'Google One Tap sign-in failed');
        } finally {
          setIsLoading(false);
        }
      });
    }
  }, []);

  const handleGoogleConfigured = async () => {
    setIsGoogleModalOpen(false);
    await handleConnectWithGoogle();
  };

  return (
    <div className="public-layout-root">
      {/* 1. Public Top Navigation Bar */}
      <PublicNavbar
        activePage={mode === 'signup' ? 'signup' : 'login'}
        onNavigate={onNavigate}
      />

      {/* 2. Main SMM Panel Auth Card */}
      <div className="auth-page-wrapper">
        <div className="auth-panel-card">
          {/* Left Feature & Bonus Showcase */}
          <div className="auth-panel-left">
            <div>
              <div className="auth-left-brand">
                <img
                  src="/logo.png"
                  alt="DigitalSMM"
                  style={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }}
                />
                <div className="auth-left-brand-title">DIGITALSMM</div>
              </div>

              <div className="auth-left-bonus-badge">
                <Shield size={14} />
                <span>Official Direct Provider Platform</span>
              </div>

              <h2 className="auth-left-heading">
                Scale Your Social Presence With Autonomous SMM.
              </h2>

              <p className="auth-left-desc">
                Connect to over 7,500+ verified social media marketing services with automated instant dispatch,
                live retention monitoring, and Bakong KHQR wallet top-ups.
              </p>

              {/* Feature Highlights List */}
              <div className="auth-feature-list">
                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <Zap size={16} color="#38bdf8" />
                  </div>
                  <div>
                    <div className="auth-feature-title">Instant Automated Start</div>
                    <div className="auth-feature-sub">Orders begin processing in 0 to 5 minutes via high-speed API.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <Globe2 size={16} color="#4ade80" />
                  </div>
                  <div>
                    <div className="auth-feature-title">11 Supported Platforms</div>
                    <div className="auth-feature-sub">Instagram, Telegram, TikTok, YouTube, Twitter/X, Facebook & more.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <Shield size={16} color="#facc15" />
                  </div>
                  <div>
                    <div className="auth-feature-title">Safe & Privacy Preserving</div>
                    <div className="auth-feature-sub">Never asks for passwords or sensitive credentials. 100% compliant.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <MailCheck size={16} color="#a855f7" />
                  </div>
                  <div>
                    <div className="auth-feature-title">Verified Email Security</div>
                    <div className="auth-feature-sub">Secure 6-digit OTP email verification for safe, verified accounts.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-left-footer">
              ⚡ Over 1,200,000+ orders processed safely across 80+ countries.
            </div>
          </div>

          {/* Right Form Container */}
          <div className="auth-panel-right">
            {/* Mobile-only Brand Header */}
            <div className="auth-mobile-brand">
              <img src="/logo.png" alt="DigitalSMM" className="auth-mobile-logo-img" />
              <div className="auth-mobile-brand-title">
                DIGITAL<span>SMM</span>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="auth-tab-switch">
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login');
                  setSignupStep('details');
                  setIs2FAPrompt(false);
                  setTwoFactorCode('');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setSignupStep('details');
                  setIs2FAPrompt(false);
                  setTwoFactorCode('');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                <UserPlus size={15} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Google / Gmail 1-Click SSO Button */}
            {signupStep !== 'otp' && !is2FAPrompt && (
              <>
                <button
                  type="button"
                  className="btn-google-sso"
                  onClick={handleConnectWithGoogle}
                  disabled={isLoading}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                  </svg>
                  <span>Continue with Google / Gmail</span>
                </button>

                {/* Divider */}
                <div className="auth-divider">
                  <span>OR WITH {mode === 'signup' ? 'EMAIL VERIFICATION' : 'ACCOUNT CREDENTIALS'}</span>
                </div>
              </>
            )}

            {/* Error & Success Messages */}
            {errorMessage && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
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
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {mode === 'signup' ? (
                signupStep === 'details' ? (
                  <>
                    {/* Username */}
                    <div className="auth-form-group">
                      <label className="auth-form-label">Username</label>
                      <div className="auth-input-wrapper">
                        <User size={16} className="auth-input-icon" />
                        <input
                          type="text"
                          className="auth-form-input"
                          placeholder="e.g. your_username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="auth-form-group">
                      <label className="auth-form-label">Email Address (OTP will be sent here)</label>
                      <div className="auth-input-wrapper">
                        <Mail size={16} className="auth-input-icon" />
                        <input
                          type="email"
                          className="auth-form-input"
                          placeholder="name@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="auth-form-group">
                      <label className="auth-form-label">Password</label>
                      <div className="auth-input-wrapper">
                        <Lock size={16} className="auth-input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="auth-form-input"
                          placeholder="Minimum 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="auth-toggle-pwd"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="auth-form-group">
                      <label className="auth-form-label">Confirm Password</label>
                      <div className="auth-input-wrapper">
                        <Lock size={16} className="auth-input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="auth-form-input"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Terms */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11, fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                      <input
                        type="checkbox"
                        id="terms-checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: isDark ? '#38bdf8' : '#162399', width: 14, height: 14 }}
                      />
                      <label htmlFor="terms-checkbox" style={{ cursor: 'pointer' }}>
                        I agree to the Terms of Service & Privacy Policy
                      </label>
                    </div>

                    {/* Step 1 Submit Button */}
                    <button
                      type="submit"
                      className="btn-auth-submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span>Sending verification code...</span>
                      ) : (
                        <>
                          <span>Verify Email & Continue</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* Step 2: OTP Code Verification */
                  <div style={{ animation: 'fadeIn 0.25s ease' }}>
                    <div
                      style={{
                        background: isDark ? '#111827' : '#f0f9ff',
                        border: isDark ? '1px solid #1e3a5f' : '1px solid #bae6fd',
                        borderRadius: 12,
                        padding: '16px',
                        marginBottom: 20,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#0284c7',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 10px',
                        }}
                      >
                        <MailCheck size={24} />
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.02rem', color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 700 }}>
                        Verify Your Email
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.5 }}>
                        We sent a 6-digit verification code to <br />
                        <strong style={{ color: '#38bdf8' }}>{email}</strong>
                      </p>
                    </div>

                    {/* OTP Input */}
                    <div className="auth-form-group">
                      <label className="auth-form-label" style={{ textAlign: 'center', display: 'block' }}>
                        Enter 6-Digit Verification Code
                      </label>
                      <div style={{ position: 'relative' }}>
                        <KeyRound size={18} className="auth-input-icon" />
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          className="auth-form-input"
                          style={{
                            textAlign: 'center',
                            fontSize: '1.4rem',
                            letterSpacing: '8px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            paddingLeft: 42,
                          }}
                          placeholder="••••••"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          required
                        />
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Valid for 10 minutes. Check your inbox and spam folder.
                      </div>
                    </div>

                    {/* Complete Signup Button */}
                    <button
                      type="submit"
                      className="btn-auth-submit"
                      disabled={isLoading || otpCode.length < 6}
                    >
                      {isLoading ? (
                        <span>Verifying account...</span>
                      ) : (
                        <>
                          <span>Verify & Create Account</span>
                          <CheckCircle2 size={16} />
                        </>
                      )}
                    </button>

                    {/* Resend Code / Back Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupStep('details');
                          setErrorMessage(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '0.80rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ArrowLeft size={14} />
                        <span>Change Email</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0 || isLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: resendCooldown > 0 ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#38bdf8' : '#0284c7'),
                          fontSize: '0.80rem',
                          fontWeight: 600,
                          cursor: resendCooldown > 0 ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <RotateCw size={13} className={isLoading ? 'spin' : ''} />
                        <span>
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* Login Mode */
                is2FAPrompt ? (
                  <div style={{ animation: 'fadeIn 0.25s ease' }}>
                    <div
                      style={{
                        background: isDark ? '#111827' : '#eff6ff',
                        border: isDark ? '1px solid #1e3a5f' : '1px solid #bfdbfe',
                        borderRadius: 12,
                        padding: '18px 16px',
                        marginBottom: 20,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: isDark ? '#2563eb' : '#162399',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 10px',
                          boxShadow: '0 4px 12px rgba(22, 35, 153, 0.2)',
                        }}
                      >
                        <Shield size={26} />
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 700 }}>
                        Two-Factor Authentication
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.5 }}>
                        Enter the 6-digit verification code from your authenticator app for <strong style={{ color: isDark ? '#38bdf8' : '#162399' }}>{loginIdentifier}</strong>
                      </p>
                    </div>

                    {/* 2FA Code Input */}
                    <div className="auth-form-group">
                      <label className="auth-form-label" style={{ textAlign: 'center', display: 'block' }}>
                        6-Digit Authenticator Code
                      </label>
                      <div style={{ position: 'relative' }}>
                        <KeyRound size={18} className="auth-input-icon" />
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          className="auth-form-input"
                          style={{
                            textAlign: 'center',
                            fontSize: '1.4rem',
                            letterSpacing: '8px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            paddingLeft: 42,
                          }}
                          placeholder="••••••"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          required
                        />
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Open Google Authenticator, 2FA.cn, or Microsoft Authenticator
                      </div>
                    </div>

                    {/* Verify & Sign In Button */}
                    <button
                      type="submit"
                      className="btn-auth-submit"
                      disabled={isLoading || twoFactorCode.length < 6}
                    >
                      {isLoading ? (
                        <span>Verifying security code...</span>
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <CheckCircle2 size={16} />
                        </>
                      )}
                    </button>

                    {/* Cancel / Back Button */}
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIs2FAPrompt(false);
                          setTwoFactorCode('');
                          setErrorMessage(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 500,
                        }}
                      >
                        <ArrowLeft size={14} />
                        <span>Back to username & password</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Login Identifier */}
                    <div className="auth-form-group">
                      <label className="auth-form-label">Username or Email</label>
                      <div className="auth-input-wrapper">
                        <Mail size={16} className="auth-input-icon" />
                        <input
                          type="text"
                          className="auth-form-input"
                          placeholder="your_username or email"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="auth-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="auth-form-label" style={{ margin: 0 }}>Password</label>
                        <button
                          type="button"
                          onClick={handleOpenForgotModal}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isDark ? '#38bdf8' : '#0284c7',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>

                      <div className="auth-input-wrapper">
                        <Lock size={16} className="auth-input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="auth-form-input"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="auth-toggle-pwd"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11, fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                      <input
                        type="checkbox"
                        id="remember-checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: isDark ? '#38bdf8' : '#162399', width: 14, height: 14 }}
                      />
                      <label htmlFor="remember-checkbox" style={{ cursor: 'pointer' }}>
                        Remember me for 30 days
                      </label>
                    </div>

                    {/* Submit CTA Button */}
                    <button
                      type="submit"
                      className="btn-auth-submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span>Signing in...</span>
                      ) : (
                        <>
                          <span>Sign In to Account</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </>
                )
              )}

              {/* Toggle Mode Footer Link */}
              <div style={{ textAlign: 'center', marginTop: 14, fontSize: '0.80rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                {mode === 'login' ? (
                  !is2FAPrompt && (
                    <>
                      Don't have an account?{' '}
                      <span
                        onClick={() => {
                          setMode('signup');
                          setSignupStep('details');
                          setIs2FAPrompt(false);
                          setTwoFactorCode('');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Sign up for free
                      </span>
                    </>
                  )
                ) : (
                  <>
                    Already have an account?{' '}
                    <span
                      onClick={() => {
                        setMode('login');
                        setSignupStep('details');
                        setIs2FAPrompt(false);
                        setTwoFactorCode('');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Sign in here
                    </span>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ================= MODAL: GOOGLE ACCOUNT CONNECT ================= */}
      <GoogleAccountPickerModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onConfigured={handleGoogleConfigured}
        isLoading={isLoading}
      />

      {/* ================= MODAL: FORGOT PASSWORD ================= */}
      {isForgotModalOpen && (
        <div className="service-details-backdrop" onClick={() => setIsForgotModalOpen(false)}>
          <div
            className="service-details-card"
            style={{
              maxWidth: 460,
              borderRadius: 16,
              overflow: 'hidden',
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              boxShadow: isDark ? '0 24px 60px rgba(0, 0, 0, 0.7)' : '0 24px 48px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="service-details-header"
              style={{
                padding: '18px 24px',
                borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
                background: isDark ? '#0b0f19' : '#fafcff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isDark ? '#1e293b' : 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#38bdf8' : '#0284c7',
                    border: isDark ? '1px solid #334155' : 'none',
                  }}
                >
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {forgotStep === 'success'
                      ? 'Password Reset Complete'
                      : forgotStep === 'otp'
                      ? 'Set New Password'
                      : 'Recover Account Password'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                    {forgotStep === 'success'
                      ? 'Account successfully secured'
                      : forgotStep === 'otp'
                      ? 'Step 2 of 2: Code Verification'
                      : 'Step 1 of 2: Identity Verification'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#94a3b8' : '#64748b',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="service-details-body" style={{ padding: '24px', background: isDark ? '#0f172a' : '#ffffff' }}>
              {/* Error Alert */}
              {forgotError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '12px 14px',
                    borderRadius: 10,
                    color: '#b91c1c',
                    fontSize: '0.85rem',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ lineHeight: 1.4 }}>{forgotError}</span>
                </div>
              )}

              {/* Success / Info Message */}
              {forgotSuccessMsg && forgotStep !== 'success' && (
                <div
                  style={{
                    background: isDark ? 'rgba(21, 128, 61, 0.2)' : '#f0fdf4',
                    border: isDark ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid #bbf7d0',
                    padding: '12px 14px',
                    borderRadius: 10,
                    color: isDark ? '#4ade80' : '#15803d',
                    fontSize: '0.85rem',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ lineHeight: 1.4 }}>{forgotSuccessMsg}</span>
                </div>
              )}

              {/* STEP 3: SUCCESS STATE */}
              {forgotStep === 'success' ? (
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: isDark ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7',
                      color: isDark ? '#4ade80' : '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      boxShadow: '0 0 20px rgba(22, 163, 74, 0.2)',
                    }}
                  >
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800 }}>
                    Password Updated!
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                    Your password has been securely reset. You can now log into your account with your new credentials.
                  </p>
                  <button
                    type="button"
                    className="btn-auth-submit"
                    style={{
                      width: '100%',
                      height: 44,
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onClick={() => {
                      setIsForgotModalOpen(false);
                      setMode('login');
                      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
                    }}
                  >
                    <LogIn size={18} />
                    <span>Proceed to Sign In</span>
                  </button>
                </div>
              ) : forgotStep === 'otp' ? (
                /* STEP 2: ENTER OTP & NEW PASSWORD */
                <form onSubmit={handleForgotResetPassword}>
                  <div
                    style={{
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginBottom: 16,
                      fontSize: '0.82rem',
                      color: isDark ? '#cbd5e1' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <MailCheck size={20} color={isDark ? '#38bdf8' : '#0284c7'} style={{ flexShrink: 0 }} />
                    <div>
                      We dispatched a 6-digit code to <strong style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{forgotEmail}</strong>.
                    </div>
                  </div>

                  {/* 6-Digit Code */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: '0.80rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155' }}>
                        Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotResendOtp}
                        disabled={forgotCooldown > 0 || forgotLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: forgotCooldown > 0 ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#38bdf8' : '#0284c7'),
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: forgotCooldown > 0 ? 'default' : 'pointer',
                        }}
                      >
                        {forgotCooldown > 0 ? `Resend code (${forgotCooldown}s)` : 'Resend code'}
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      className="form-input"
                      style={{
                        width: '100%',
                        height: 46,
                        textAlign: 'center',
                        fontSize: '1.35rem',
                        letterSpacing: '8px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        border: isDark ? '2px solid #334155' : '2px solid #cbd5e1',
                        borderRadius: 10,
                        background: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                      }}
                      placeholder="••••••"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      required
                    />
                  </div>

                  {/* New Password */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showForgotNewPass ? 'text' : 'password'}
                        className="form-input"
                        style={{
                          width: '100%',
                          height: 42,
                          padding: '8px 38px 8px 12px',
                          border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                          borderRadius: 8,
                          background: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                        }}
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
                          padding: 2,
                        }}
                      >
                        {showForgotNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                      Confirm New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showForgotConfirmPass ? 'text' : 'password'}
                        className="form-input"
                        style={{
                          width: '100%',
                          height: 42,
                          padding: '8px 38px 8px 12px',
                          border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                          borderRadius: 8,
                          background: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                        }}
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
                          padding: 2,
                        }}
                      >
                        {showForgotConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-auth-submit"
                    style={{
                      width: '100%',
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontWeight: 700,
                    }}
                    disabled={forgotLoading || forgotOtp.length < 4}
                  >
                    {forgotLoading ? (
                      <>
                        <RotateCw size={16} className="spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={16} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('email');
                        setForgotError(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Back to change email/username</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 1: ENTER EMAIL OR USERNAME */
                <form onSubmit={handleForgotSendOtp}>
                  <p style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
                    Enter your account email address or username. We will dispatch a 6-digit security code to verify your identity.
                  </p>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                      Account Email or Username
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{
                          width: '100%',
                          height: 42,
                          padding: '8px 12px 8px 38px',
                          border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                          borderRadius: 8,
                          fontSize: '0.90rem',
                          background: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                        }}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="user@example.com or username"
                        required
                        autoFocus
                      />
                      <Mail
                        size={16}
                        color="#94a3b8"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-auth-submit"
                    style={{
                      width: '100%',
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontWeight: 700,
                    }}
                    disabled={forgotLoading || !forgotEmail.trim()}
                  >
                    {forgotLoading ? (
                      <>
                        <RotateCw size={16} className="spin" />
                        <span>Dispatching Code...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight size={16} />
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      Remember your password? <strong style={{ color: isDark ? '#38bdf8' : '#162399' }}>Sign in</strong>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
