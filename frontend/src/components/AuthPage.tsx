import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  Zap,
  Globe2,
  DollarSign,
  Gift,
  HelpCircle,
  Eye,
  EyeOff,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Shield,
  Smartphone,
} from 'lucide-react';
import { PublicNavbar } from './PublicNavbar';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onNavigate,
}) => {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google modal simulator state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGmail, setCustomGmail] = useState('');

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'signup') {
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
        setErrorMessage('You must agree to the Terms of Service.');
        return;
      }

      setIsLoading(true);
      try {
        await register(username.trim(), email.trim(), password);
        setSuccessMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          onNavigate('/new-order');
        }, 600);
      } catch (err: any) {
        setErrorMessage(err.message || 'Registration failed. Try a different username/email.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!loginIdentifier.trim() || !password) {
        setErrorMessage('Please enter your username/email and password.');
        return;
      }

      setIsLoading(true);
      try {
        const user = await login(loginIdentifier.trim(), password);
        setSuccessMessage(`Welcome back, ${user.username}! Redirecting...`);
        setTimeout(() => {
          if (user.role === 'ADMIN') {
            onNavigate('/admin');
          } else {
            onNavigate('/new-order');
          }
        }, 600);
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid credentials. Please verify username and password.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectGoogleAccount = async (targetEmail: string, targetName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsGoogleModalOpen(false);

    try {
      const user = await loginWithGoogle({
        email: targetEmail,
        name: targetName,
      });
      setSuccessMessage(`Welcome ${user.username}! Signed in with Google.`);
      setTimeout(() => {
        onNavigate('/new-order');
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setMode('login');
    setLoginIdentifier('user@digitalsmm.com');
    setPassword('User@DigitalSMM2026!');
    setErrorMessage(null);
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
                <div className="auth-left-logo-icon">
                  <Zap size={20} fill="#ffffff" />
                </div>
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
                    <Sparkles size={16} color="#f472b6" />
                  </div>
                  <div>
                    <div className="auth-feature-title">Wholesale Reseller Rates</div>
                    <div className="auth-feature-sub">Unbeatable bulk prices starting from just $0.001 per thousand.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Footer Trust Badges */}
            <div className="auth-left-footer">
              <div style={{ display: 'flex', gap: 4 }}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{ color: '#facc15', fontSize: '1.1rem' }}>★</span>
                ))}
              </div>
              <div>
                <strong>50,000+ Active Creators</strong>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Over 1.4M automated orders delivered</div>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="auth-panel-right">
            {/* Mode Switcher Tabs */}
            <div className="auth-tab-switch">
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
              >
                Create Account
              </button>
            </div>

            {/* Google / Gmail 1-Click SSO Button */}
            <button
              type="button"
              className="btn-google-sso"
              onClick={() => setIsGoogleModalOpen(true)}
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
              <span>OR WITH {mode === 'signup' ? 'REGISTRATION' : 'ACCOUNT CREDENTIALS'}</span>
            </div>

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
                <>
                  {/* Username */}
                  <div className="auth-form-group">
                    <label className="auth-form-label">Username</label>
                    <div className="auth-input-wrapper">
                      <User size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        className="auth-form-input"
                        placeholder="e.g. alexcreator"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="auth-form-group">
                    <label className="auth-form-label">Email Address</label>
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        className="auth-form-input"
                        placeholder="alex@domain.com"
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: '0.82rem', color: '#64748b' }}>
                    <input
                      type="checkbox"
                      id="terms-checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#162399' }}
                    />
                    <label htmlFor="terms-checkbox" style={{ cursor: 'pointer' }}>
                      I agree to the Terms of Service & Privacy Policy
                    </label>
                  </div>
                </>
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
                        placeholder="user@digitalsmm.com or username"
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
                        onClick={() => {
                          setIsForgotModalOpen(true);
                          setForgotEmail(loginIdentifier);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: '0.82rem', color: '#64748b' }}>
                    <input
                      type="checkbox"
                      id="remember-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#162399' }}
                    />
                    <label htmlFor="remember-checkbox" style={{ cursor: 'pointer' }}>
                      Remember me for 30 days
                    </label>
                  </div>
                </>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                className="btn-auth-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : mode === 'signup' ? (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Quick Fill Demo User for Evaluation */}
              <button
                type="button"
                className="btn-demo-quickfill"
                onClick={handleQuickDemoFill}
              >
                <Sparkles size={13} color="#0284c7" />
                Fill Demo Account (user@digitalsmm.com)
              </button>

              {/* Toggle Mode Footer Link */}
              <div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.84rem', color: '#64748b' }}>
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <span
                      onClick={() => setMode('signup')}
                      style={{ color: '#162399', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Sign up now
                    </span>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <span
                      onClick={() => setMode('login')}
                      style={{ color: '#162399', fontWeight: 700, cursor: 'pointer' }}
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

      {/* ================= MODAL: GOOGLE SSO SIMULATOR ================= */}
      {isGoogleModalOpen && (
        <div className="service-details-backdrop" onClick={() => setIsGoogleModalOpen(false)}>
          <div className="service-details-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="service-details-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Sign in with Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="service-details-body">
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: 14 }}>
                Choose an account to continue to <strong>DigitalSMM</strong>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  onClick={() => handleSelectGoogleAccount('creator@gmail.com', 'Alex Creator')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#162399', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                    A
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Alex Creator</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>creator@gmail.com</div>
                  </div>
                </div>

                <div
                  onClick={() => handleSelectGoogleAccount('agency@gmail.com', 'SMM Pro Agency')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                    S
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>SMM Pro Agency</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>agency@gmail.com</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Or enter any Gmail address:
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="email"
                    className="form-input"
                    style={{ flex: 1, height: 38, padding: '6px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                    placeholder="yourname@gmail.com"
                    value={customGmail}
                    onChange={(e) => setCustomGmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-admin-primary"
                    style={{ padding: '0 14px', fontSize: '0.82rem' }}
                    onClick={() => {
                      if (customGmail.trim()) {
                        const name = customGmail.split('@')[0];
                        handleSelectGoogleAccount(customGmail.trim(), name);
                      }
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FORGOT PASSWORD ================= */}
      {isForgotModalOpen && (
        <div className="service-details-backdrop" onClick={() => setIsForgotModalOpen(false)}>
          <div className="service-details-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="service-details-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Reset Your Password</h3>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="service-details-body">
              {forgotSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Reset Link Dispatched</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    We have dispatched password reset instructions to <strong>{forgotEmail}</strong>.
                  </p>
                  <button
                    type="button"
                    className="btn-admin-primary"
                    style={{ marginTop: 18 }}
                    onClick={() => setIsForgotModalOpen(false)}
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setForgotSuccess(true);
                  }}
                >
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: 14 }}>
                    Enter your account email address and we will dispatch a secure reset token link.
                  </p>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ width: '100%', height: 40, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="account@domain.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-auth-submit"
                    style={{ height: 42 }}
                  >
                    Dispatch Reset Link
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
