import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, ExternalLink } from 'lucide-react';
import { setGoogleClientId } from '../services/googleAuth';
import { useTheme } from '../context/ThemeContext';

interface GoogleAccountPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured: (clientId: string) => Promise<void>;
  isLoading: boolean;
}

export const GoogleAccountPickerModal: React.FC<GoogleAccountPickerModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
  isLoading,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [clientIdInput, setClientIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = clientIdInput.trim();
    if (!cleanId || cleanId.length < 15) {
      setError('Please enter a valid Google OAuth Client ID (ending in .apps.googleusercontent.com)');
      return;
    }

    setError(null);
    setGoogleClientId(cleanId);
    await onConfigured(cleanId);
  };

  return (
    <div
      className="service-details-backdrop"
      onClick={onClose}
      style={{
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="google-oauth-picker-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: isDark ? '#0f172a' : '#ffffff',
          borderRadius: 20,
          border: isDark ? '1px solid #334155' : '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: isDark ? '0 20px 60px rgba(0, 0, 0, 0.7)' : '0 20px 50px -10px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          fontFamily: "'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          animation: 'modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', position: 'relative' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#5f6368',
              borderRadius: '50%',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? '#1e293b' : '#f1f3f4')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={18} />
          </button>

          {/* Google G Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 48 48">
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
            <span style={{ fontSize: '0.90rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#3c4043', letterSpacing: '-0.01em' }}>
              Sign in with Google
            </span>
          </div>

          <h3
            style={{
              margin: '0 0 6px',
              fontSize: '1.35rem',
              fontWeight: 600,
              color: isDark ? '#f8fafc' : '#202124',
              lineHeight: 1.3,
            }}
          >
            Connect Browser Google Account
          </h3>
          <p style={{ margin: 0, fontSize: '0.86rem', color: isDark ? '#94a3b8' : '#5f6368', lineHeight: 1.5 }}>
            To show the real Gmail accounts currently signed into your browser, Google Identity Services requires your Google OAuth Client ID.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ padding: '0 28px 24px' }}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.80rem',
                fontWeight: 700,
                color: isDark ? '#cbd5e1' : '#334155',
                marginBottom: 6,
              }}
            >
              Google OAuth Client ID
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                autoFocus
                placeholder="123456789-abcdefg.apps.googleusercontent.com"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: isDark ? '1.5px solid #334155' : '1.5px solid #cbd5e1',
                  background: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '0.86rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? '#38bdf8' : '#1a73e8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = isDark ? '#334155' : '#cbd5e1')}
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 6, lineHeight: 1.4 }}>
              Origin required in Google Cloud Console:{' '}
              <code style={{ background: isDark ? '#1e293b' : '#f1f5f9', padding: '2px 5px', borderRadius: 4, color: isDark ? '#38bdf8' : '#0f172a', border: isDark ? '1px solid #334155' : 'none' }}>
                http://localhost:5173
              </code>
            </div>
          </div>

          {error && (
            <div
              style={{
                color: '#b91c1c',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: '0.82rem',
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !clientIdInput.trim()}
            style={{
              width: '100%',
              height: 44,
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.90rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(26, 115, 232, 0.3)',
            }}
          >
            {isLoading ? 'Connecting to Google...' : 'Save & Show Browser Accounts'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ padding: '16px 28px', background: isDark ? '#0b0f19' : '#fafbfc', borderTop: isDark ? '1px solid #1e293b' : '1px solid #dadce0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: isDark ? '#4ade80' : '#16a34a',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={14} />
            <span>Official Google Identity Services (Zero Demo Data)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
