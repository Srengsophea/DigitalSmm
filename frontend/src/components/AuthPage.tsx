import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Home,
  Gift,
  Zap,
  Globe,
  X,
} from 'lucide-react';

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

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // State
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
        setSuccessMessage('Account created with $10.00 credit! Redirecting...');
        setTimeout(() => {
          onNavigate('/new-order');
        }, 800);
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
        }, 800);
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
      }, 800);
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
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #090d16 0%, #0d1527 50%, #162399 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#f8fafc',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          padding: '18px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(9, 13, 22, 0.65)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          onClick={() => onNavigate('/services')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb, #162399)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            <Sparkles size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
              DIGITALSMM
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Automated SMM Infrastructure
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => onNavigate('/services')}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#e2e8f0',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Home size={16} />
            <span>Browse Services</span>
          </button>

        </div>
      </header>

      {/* Main Two-Column Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            borderRadius: 20,
            overflow: 'hidden',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(22, 35, 153, 0.3)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Left Column: Value Prop Showcase */}
          <div
            style={{
              padding: '44px 38px',
              background: 'linear-gradient(180deg, rgba(22, 35, 153, 0.45) 0%, rgba(15, 23, 42, 0.6) 100%)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  background: 'rgba(37, 99, 235, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#60a5fa',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: 20,
                }}
              >
                <Gift size={14} />
                <span>$10 Free Welcome Credit For New Signups</span>
              </div>

              <h1
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  color: '#ffffff',
                  marginBottom: 16,
                  letterSpacing: '-0.02em',
                }}
              >
                Scale Your Social Presence With Autonomous SMM.
              </h1>

              <p
                style={{
                  fontSize: '0.94rem',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  marginBottom: 28,
                }}
              >
                Connect to over 7,500+ verified social media marketing services with automated instant dispatch,
                live retention monitoring, and Bakong KHQR wallet top-ups.
              </p>

              {/* Feature Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                {[
                  {
                    icon: <Zap size={18} color="#38bdf8" />,
                    title: 'Instant Automated Start',
                    desc: 'Orders begin processing in 0 to 5 minutes via high-speed API.',
                  },
                  {
                    icon: <Globe size={18} color="#4ade80" />,
                    title: '11 Supported Platforms',
                    desc: 'Instagram, Telegram, TikTok, YouTube, Twitter/X, Facebook & more.',
                  },
                  {
                    icon: <ShieldCheck size={18} color="#fbbf24" />,
                    title: 'Safe & Privacy Preserving',
                    desc: 'Never asks for passwords or sensitive credentials. 100% compliant.',
                  },
                  {
                    icon: <Gift size={18} color="#ec4899" />,
                    title: 'Instant $10.00 Welcome Balance',
                    desc: 'Free trial balance auto-credited upon account registration.',
                  },
                ].map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        padding: 7,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {feat.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9' }}>{feat.title}</div>
                      <div style={{ fontSize: '0.80rem', color: '#94a3b8', lineHeight: 1.4 }}>{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Testimonial / Social Proof */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', marginLeft: 4 }}>
                {['👨‍💼', '👩‍💻', '👨‍🚀', '👩‍🎨'].map((emoji, idx) => (
                  <span
                    key={idx}
                    style={{
                      marginLeft: idx > 0 ? -8 : 0,
                      fontSize: '1.25rem',
                      borderRadius: '50%',
                      background: '#1e293b',
                      border: '2px solid #0f172a',
                    }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>50,000+ Active Creators</div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Over 1.2M automated orders delivered</div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div style={{ padding: '44px 38px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Mode Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: 4,
                borderRadius: 12,
                marginBottom: 24,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: mode === 'login' ? '#162399' : 'transparent',
                  color: mode === 'login' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  boxShadow: mode === 'login' ? '0 2px 8px rgba(22, 35, 153, 0.5)' : 'none',
                }}
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: mode === 'signup' ? '#162399' : 'transparent',
                  color: mode === 'signup' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  boxShadow: mode === 'signup' ? '0 2px 8px rgba(22, 35, 153, 0.5)' : 'none',
                }}
              >
                <UserPlus size={16} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Google / Gmail 1-Click Button */}
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.90rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                cursor: 'pointer',
                marginBottom: 20,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.15s ease',
              }}
            >
              {/* Google SVG G */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google / Gmail</span>
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#64748b',
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
              <span>or with account credentials</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
            </div>

            {/* Error & Success Alerts */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                <AlertCircle size={18} />
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
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 13 }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. digitalcreator"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 40px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 10,
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Email / Username field */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  {mode === 'signup' ? 'Email Address' : 'Username or Email'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 13 }} />
                  <input
                    type={mode === 'signup' ? 'email' : 'text'}
                    required
                    placeholder={mode === 'signup' ? 'you@gmail.com' : 'user@digitalsmm.com or username'}
                    value={mode === 'signup' ? email : loginIdentifier}
                    onChange={(e) => (mode === 'signup' ? setEmail(e.target.value) : setLoginIdentifier(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 40px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: 10,
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div style={{ marginBottom: mode === 'signup' ? 16 : 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#60a5fa',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 13 }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 40px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
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

              {/* Confirm Password for signup */}
              {mode === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 13 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 40px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 10,
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Remember Me / Terms checkboxes */}
              {mode === 'login' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    id="rememberCheck"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#162399', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="rememberCheck" style={{ fontSize: '0.82rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    Remember me for 30 days
                  </label>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    id="termsCheck"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ accentColor: '#162399', width: 16, height: 16, marginTop: 2, cursor: 'pointer' }}
                  />
                  <label htmlFor="termsCheck" style={{ fontSize: '0.80rem', color: '#94a3b8', lineHeight: 1.4, cursor: 'pointer' }}>
                    I agree to the <span style={{ color: '#60a5fa' }}>Terms of Service</span> and acknowledge that my $10 welcome bonus will be credited automatically.
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #162399, #1d4ed8)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(22, 35, 153, 0.45)',
                  transition: 'all 0.15s ease',
                  marginBottom: 16,
                }}
              >
                <span>{isLoading ? 'Authenticating...' : mode === 'signup' ? 'Claim $10 Bonus & Register' : 'Sign In to Account'}</span>
                <ArrowRight size={16} />
              </button>

              {/* Quick Demo Fill button */}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px dashed rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#93c5fd',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={14} />
                  <span>Fill Demo Account (user@digitalsmm.com)</span>
                </button>
              )}
            </form>

            {/* Bottom Switcher */}
            <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.84rem', color: '#94a3b8' }}>
              {mode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                    }}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Sign up now ($10 bonus)
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Sign in here
                  </button>
                </span>
              )}
            </div>

            {/* Admin Portal Gateway */}
          </div>
        </div>
      </div>

      {/* Google Account Selector Simulation Modal */}
      {isGoogleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setIsGoogleModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440,
              width: '100%',
              background: '#ffffff',
              borderRadius: 16,
              padding: '24px 26px',
              color: '#1e293b',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 18 }}>
              Choose a Google account to continue to <strong>DigitalSMM</strong>:
            </p>

            {/* Quick Profiles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { name: 'David Lorn', email: 'david.smm@gmail.com', avatar: '👨‍💼' },
                { name: 'Alex Marketer', email: 'alex.growth@gmail.com', avatar: '👩‍💻' },
                { name: 'Khmer Creator', email: 'khmer.smm@gmail.com', avatar: '🇰🇭' },
              ].map((acc) => (
                <div
                  key={acc.email}
                  onClick={() => handleSelectGoogleAccount(acc.email, acc.name)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    background: '#f8fafc',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{acc.avatar}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{acc.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{acc.email}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Or custom Gmail */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.80rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Or enter any Gmail address:
              </label>
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={customGmail}
                onChange={(e) => setCustomGmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  marginBottom: 10,
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (customGmail.trim()) {
                    handleSelectGoogleAccount(customGmail.trim(), customGmail.split('@')[0]);
                  }
                }}
                disabled={!customGmail.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#162399',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: customGmail.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Sign In With This Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setIsForgotModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 400,
              width: '100%',
              background: '#ffffff',
              borderRadius: 16,
              padding: '24px 26px',
              color: '#1e293b',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>Reset Your Password</div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotSuccess(false);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {forgotSuccess ? (
              <div>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 8,
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.85rem',
                    marginBottom: 16,
                  }}
                >
                  Password reset link sent! Check your inbox to proceed.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setForgotSuccess(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#162399',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 14 }}>
                  Enter your registered email address and we'll send you recovery instructions:
                </p>
                <input
                  type="email"
                  placeholder="user@digitalsmm.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    marginBottom: 14,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (forgotEmail.trim()) {
                      setForgotSuccess(true);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#162399',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Send Recovery Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
