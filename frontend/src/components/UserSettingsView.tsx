import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './UserAvatar';
import { api } from '../services/api';
import {
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  QrCode,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  X,
  Camera,
  Trash2,
} from 'lucide-react';

export const UserSettingsView: React.FC = () => {
  const { user, refreshProfile, showToast, updateAvatar } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // 0. Profile Photo / Avatar State & Handler
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, WebP, GIF)', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Image file size must be under 8MB', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 256;
            let w = img.width;
            let h = img.height;
            if (w > h) {
              if (w > maxDim) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              }
            } else {
              if (h > maxDim) {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, w, h);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
            await updateAvatar(compressedDataUrl);
          } catch (err: any) {
            showToast(err.message || 'Failed to upload photo', 'error');
          } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };
        img.onerror = () => {
          showToast('Failed to process image file', 'error');
          setIsUploadingAvatar(false);
        };
        img.src = uploadEvent.target?.result as string;
      };
      reader.onerror = () => {
        showToast('Failed to read image file', 'error');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast(err.message || 'Error processing photo', 'error');
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your custom profile picture and restore default?')) return;
    setIsUploadingAvatar(true);
    try {
      await updateAvatar(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove photo', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 1. Email State & Flow
  // Step: 'idle' | 'verify_old' | 'verify_new'
  const [emailStep, setEmailStep] = useState<'idle' | 'verify_old' | 'verify_new'>('idle');
  const [currentEmailPassword, setCurrentEmailPassword] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [pendingOldEmail, setPendingOldEmail] = useState('');
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [oldEmailCode, setOldEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // 2. Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 3. 2FA State & Flow
  // Step: 'idle' | 'setup' | 'disable_confirm'
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(user?.twoFactorEnabled));
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'setup' | 'disable_confirm'>('idle');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState('');
  const [disablePasswordInput, setDisablePasswordInput] = useState('');
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 4. Timezone State
  const [selectedTimezone, setSelectedTimezone] = useState(
    user?.timezone || '(UTC +7:00) Krasnoyarsk Time, Cambodia, Laos, Thailand, Vietnam'
  );
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  // 5. API Key State
  const [currentApiKey, setCurrentApiKey] = useState(user?.apiKey || '');
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const formatDate = (isoString?: string) => {
    if (!isoString) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const [apiKeyCreatedDate, setApiKeyCreatedDate] = useState(
    formatDate(user?.apiKeyCreatedAt || user?.createdAt)
  );

  // ==========================================
  // HANDLERS: EMAIL CHANGE (2-STEP VERIFY)
  // ==========================================
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmailPassword) {
      showToast('Please enter your current account password', 'error');
      return;
    }
    if (!newEmailInput || !newEmailInput.includes('@')) {
      showToast('Please enter a valid new email address', 'error');
      return;
    }
    if (newEmailInput.trim().toLowerCase() === user?.email.toLowerCase()) {
      showToast('New email cannot be the same as your current email', 'error');
      return;
    }

    setIsEmailLoading(true);
    try {
      const res = await api.auth.requestEmailChange(currentEmailPassword, newEmailInput.trim());
      if (res.success) {
        setPendingOldEmail(res.currentEmail || user?.email || '');
        setPendingNewEmail(res.newEmail || newEmailInput.trim());
        setEmailStep('verify_old');
        showToast(res.message || 'Verification code sent to your current email address', 'info');
      } else {
        showToast(res.error || 'Failed to request email change', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error initiating email change', 'error');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyOldEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldEmailCode || oldEmailCode.trim().length !== 6) {
      showToast('Please enter the 6-digit code sent to your current email', 'error');
      return;
    }

    setIsEmailLoading(true);
    try {
      const res = await api.auth.verifyOldEmailChange(oldEmailCode.trim());
      if (res.success) {
        setEmailStep('verify_new');
        showToast(res.message || 'Current email verified! Now verify your new email.', 'success');
      } else {
        showToast(res.error || 'Invalid code for current email', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailCode || newEmailCode.trim().length !== 6) {
      showToast('Please enter the 6-digit code sent to your new email', 'error');
      return;
    }

    setIsEmailLoading(true);
    try {
      const res = await api.auth.verifyNewEmailChange(newEmailCode.trim());
      if (res.success) {
        showToast(res.message || 'Email address successfully updated!', 'success');
        setEmailStep('idle');
        setCurrentEmailPassword('');
        setNewEmailInput('');
        setOldEmailCode('');
        setNewEmailCode('');
        await refreshProfile();
      } else {
        showToast(res.error || 'Invalid code for new email', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize email update', 'error');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleCancelEmailChange = () => {
    setEmailStep('idle');
    setOldEmailCode('');
    setNewEmailCode('');
    setCurrentEmailPassword('');
  };

  // ==========================================
  // HANDLERS: CHANGE PASSWORD
  // ==========================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.auth.changePassword(currentPassword, newPassword);
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.error || 'Failed to change password', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error changing password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ==========================================
  // HANDLERS: 2FA TOTP AUTHENTICATOR APP
  // ==========================================
  const handleStart2FASetup = async () => {
    setIs2FALoading(true);
    try {
      const res = await api.auth.setup2FA();
      if (res.success && res.secret) {
        setTwoFactorSecret(res.secret);
        setTwoFactorQrCode(res.qrCode);
        setTwoFactorStep('setup');
        setTwoFactorVerifyCode('');
      } else {
        showToast(res.error || 'Failed to initialize 2FA setup', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error starting 2FA setup', 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorVerifyCode || twoFactorVerifyCode.trim().length !== 6) {
      showToast('Please enter the 6-digit code from your authenticator app', 'error');
      return;
    }

    setIs2FALoading(true);
    try {
      const res = await api.auth.verifyAndEnable2FA(twoFactorVerifyCode.trim());
      if (res.success) {
        setTwoFactorEnabled(true);
        setTwoFactorStep('idle');
        setTwoFactorVerifyCode('');
        showToast('Two-factor authentication successfully enabled!', 'success');
        await refreshProfile();
      } else {
        showToast(res.error || 'Invalid 6-digit authenticator code', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePasswordInput) {
      showToast('Please enter your account password to confirm disabling 2FA', 'error');
      return;
    }

    setIs2FALoading(true);
    try {
      const res = await api.auth.disable2FA({ password: disablePasswordInput });
      if (res.success) {
        setTwoFactorEnabled(false);
        setTwoFactorStep('idle');
        setDisablePasswordInput('');
        showToast('Two-factor authentication has been disabled', 'success');
        await refreshProfile();
      } else {
        showToast(res.error || 'Failed to disable 2FA', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error disabling 2FA', 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  const copy2FASecret = () => {
    if (!twoFactorSecret) return;
    navigator.clipboard.writeText(twoFactorSecret);
    setCopiedSecret(true);
    showToast('Secret key copied to clipboard!', 'success');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // ==========================================
  // HANDLERS: TIMEZONE & API KEY
  // ==========================================
  const handleSaveTimezone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTimezone(true);
    try {
      const res = await api.auth.updateTimezone(selectedTimezone);
      if (res.success) {
        showToast('Timezone preference saved!', 'success');
        await refreshProfile();
      } else {
        showToast(res.error || 'Failed to save timezone', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving timezone', 'error');
    } finally {
      setIsSavingTimezone(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    setIsRegeneratingKey(true);
    try {
      const res = await api.auth.regenerateApiKey();
      if (res.success && res.apiKey) {
        setCurrentApiKey(res.apiKey);
        setApiKeyCreatedDate(formatDate(res.apiKeyCreatedAt));
        showToast('New API key generated successfully!', 'success');
        await refreshProfile();
      } else {
        showToast(res.error || 'Failed to generate API key', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error regenerating API key', 'error');
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  const copyApiKey = () => {
    if (!currentApiKey) return;
    navigator.clipboard.writeText(currentApiKey);
    setCopiedKey(true);
    showToast('API key copied to clipboard!', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const timezones = [
    '(UTC +7:00) Krasnoyarsk Time, Cambodia, Laos, Thailand, Vietnam',
    '(UTC +8:00) Beijing, Perth, Singapore, Hong Kong',
    '(UTC +9:00) Tokyo, Seoul',
    '(UTC +6:00) Almaty, Dhaka',
    '(UTC +5:30) Mumbai, New Delhi',
    '(UTC +4:00) Dubai, Baku',
    '(UTC +3:00) Moscow, Istanbul, Riyadh',
    '(UTC +2:00) Athens, Cairo, Helsinki',
    '(UTC +1:00) Berlin, Paris, Rome',
    '(UTC +0:00) London, Dublin, Lisbon',
    '(UTC -5:00) New York, Toronto, Washington',
    '(UTC -6:00) Chicago, Mexico City',
    '(UTC -8:00) Los Angeles, San Francisco, Vancouver',
  ];

  // Base styles matching Image 2
  const cardStyle: React.CSSProperties = {
    background: isDark ? '#1e293b' : '#ffffff',
    borderRadius: 14,
    border: isDark ? '1px solid #334155' : '1px solid #eef2f6',
    boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.4)' : '0 2px 10px rgba(0, 0, 0, 0.02)',
    padding: '24px 28px',
    marginBottom: 20,
    color: isDark ? '#f8fafc' : '#0f172a',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: isDark ? '#cbd5e1' : '#334155',
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 42,
    padding: '0 14px',
    background: isDark ? '#0f172a' : '#f8fafc',
    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.9rem',
    color: isDark ? '#f8fafc' : '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  };

  const primaryBtnStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    background: isDark ? '#2563eb' : '#162399',
    color: '#ffffff',
    border: 'none',
    borderRadius: 24,
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: isDark ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
    transition: 'background-color 0.2s ease',
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* 0. Profile Photo / Avatar Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
              Profile Photo
            </div>
            <div style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
              Choose a custom picture from your files, use your Google profile, or display your initial avatar.
            </div>
          </div>

          {/* Badge indicating avatar type */}
          <div>
            {user?.customAvatar ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #bae6fd',
                }}
              >
                Custom Photo
              </span>
            ) : user?.googlePicture ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
                  color: isDark ? '#4ade80' : '#15803d',
                  border: isDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #bbf7d0',
                }}
              >
                Google Connected
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  background: isDark ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9',
                  color: isDark ? '#cbd5e1' : '#475569',
                  border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #e2e8f0',
                }}
              >
                Initial Avatar ({(user?.username || 'U').charAt(0).toUpperCase()})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar Preview */}
          <div style={{ position: 'relative' }}>
            <UserAvatar
              user={user}
              size={76}
              fontSize="2rem"
              onEditClick={() => fileInputRef.current?.click()}
              showEditOverlay
              title="Click to choose a photo from your file"
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                style={{
                  padding: '8px 18px',
                  background: isDark ? '#2563eb' : '#162399',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                }}
              >
                <Camera size={15} />
                <span>{isUploadingAvatar ? 'Saving...' : 'Choose from File'}</span>
              </button>

              {user?.customAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  style={{
                    padding: '8px 14px',
                    background: isDark ? '#0f172a' : '#f8fafc',
                    color: '#ef4444',
                    border: isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fecaca',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Remove custom photo and revert to Google or Initial avatar"
                >
                  <Trash2 size={14} />
                  <span>Remove Custom Photo</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Supports PNG, JPG, WebP, or GIF (max 8MB). Photos are automatically optimized.
            </div>
          </div>
        </div>
      </div>

      {/* 1. Account / Email Card */}
      <div style={cardStyle}>
        {emailStep === 'idle' && (
          <form onSubmit={handleRequestEmailChange}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  background: isDark ? '#111827' : '#f1f5f9',
                  borderColor: isDark ? '#1f2937' : '#e2e8f0',
                  cursor: 'not-allowed',
                  color: isDark ? '#94a3b8' : '#64748b',
                }}
                value={user?.username || ''}
                readOnly
                disabled
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Current Email</label>
              <input
                type="email"
                style={{
                  ...inputStyle,
                  background: isDark ? '#111827' : '#f1f5f9',
                  borderColor: isDark ? '#1f2937' : '#e2e8f0',
                  cursor: 'not-allowed',
                  color: isDark ? '#94a3b8' : '#64748b',
                }}
                value={user?.email || ''}
                readOnly
                disabled
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Current password (required to change email)</label>
              <input
                type="password"
                style={inputStyle}
                value={currentEmailPassword}
                onChange={(e) => setCurrentEmailPassword(e.target.value)}
                placeholder="Enter your current password"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>New Email</label>
              <input
                type="email"
                style={inputStyle}
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                placeholder="new_email@example.com"
                required
              />
            </div>

            <button
              type="submit"
              style={primaryBtnStyle}
              disabled={isEmailLoading}
            >
              {isEmailLoading ? 'Verifying...' : 'Change email'}
            </button>
          </form>
        )}

        {/* Step 1 Verification: Confirm Current Email */}
        {emailStep === 'verify_old' && (
          <form onSubmit={handleVerifyOldEmail}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isDark ? '#38bdf8' : '#162399' }}>
                Step 1 of 2: Authorize from Current Email
              </div>
              <button
                type="button"
                onClick={handleCancelEmailChange}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
                border: isDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: '0.82rem',
                color: isDark ? '#86efac' : '#166534',
              }}
            >
              We sent a 6-digit confirmation code to your current email (<strong>{pendingOldEmail}</strong>). Please enter it below to confirm authorization:
            </div>

            <div>
              <label style={labelStyle}>6-Digit Verification Code</label>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  fontWeight: 700,
                }}
                maxLength={6}
                value={oldEmailCode}
                onChange={(e) => setOldEmailCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              style={primaryBtnStyle}
              disabled={isEmailLoading}
            >
              {isEmailLoading ? 'Confirming...' : 'Confirm Current Email Code'}
            </button>

            <button
              type="button"
              onClick={handleCancelEmailChange}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '0.82rem',
                marginTop: 10,
                cursor: 'pointer',
              }}
            >
              Cancel and go back
            </button>
          </form>
        )}

        {/* Step 2 Verification: Confirm New Email */}
        {emailStep === 'verify_new' && (
          <form onSubmit={handleVerifyNewEmail}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isDark ? '#38bdf8' : '#162399' }}>
                Step 2 of 2: Verify Your New Email Address
              </div>
              <button
                type="button"
                onClick={handleCancelEmailChange}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#eff6ff',
                border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: '0.82rem',
                color: isDark ? '#7dd3fc' : '#1e40af',
              }}
            >
              Current email authorized! A 6-digit confirmation code has now been sent to your new email (<strong>{pendingNewEmail}</strong>). Please enter it to complete the update:
            </div>

            <div>
              <label style={labelStyle}>6-Digit Verification Code</label>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  fontWeight: 700,
                }}
                maxLength={6}
                value={newEmailCode}
                onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              style={primaryBtnStyle}
              disabled={isEmailLoading}
            >
              {isEmailLoading ? 'Finalizing update...' : 'Confirm New Email & Complete Update'}
            </button>

            <button
              type="button"
              onClick={handleCancelEmailChange}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.82rem',
                marginTop: 10,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* 2. Change Password Card */}
      <div style={cardStyle}>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Current password</label>
            <input
              type="password"
              style={inputStyle}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              style={inputStyle}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              minLength={6}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Confirm new password</label>
            <input
              type="password"
              style={inputStyle}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            style={primaryBtnStyle}
            disabled={isChangingPassword}
          >
            {isChangingPassword ? 'Changing password...' : 'Change password'}
          </button>
        </form>
      </div>

      {/* 3. Two-factor Authentication Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
            Two-factor authentication
          </div>
          {twoFactorEnabled && (
            <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={12} /> Enabled & Active
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
          Authenticator app (Google Authenticator, Authy, Microsoft Authenticator) option to add an extra layer of protection to your account. When enabled, signing in requires a 6-digit dynamic code generated by your app.
        </p>

        {/* Normal Idle View */}
        {twoFactorStep === 'idle' && (
          <button
            type="button"
            style={{
              ...primaryBtnStyle,
              background: twoFactorEnabled ? '#dc2626' : '#162399',
            }}
            onClick={() => {
              if (twoFactorEnabled) {
                setTwoFactorStep('disable_confirm');
              } else {
                handleStart2FASetup();
              }
            }}
            disabled={is2FALoading}
          >
            {is2FALoading ? 'Loading...' : twoFactorEnabled ? 'Disable' : 'Enable'}
          </button>
        )}

        {/* 2FA Setup View: QR Code + Secret Key + 6-Digit Code Input */}
        {twoFactorStep === 'setup' && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.90rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                Set Up Authenticator App
              </div>
              <button
                type="button"
                onClick={() => setTwoFactorStep('idle')}
                style={{ background: 'transparent', border: 'none', color: isDark ? '#94a3b8' : '#94a3b8', cursor: 'pointer', padding: 4 }}
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {twoFactorQrCode && (
                <div style={{ display: 'inline-block', padding: 8, background: '#ffffff', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <img
                    src={twoFactorQrCode}
                    alt="2FA QR Code"
                    style={{ width: 180, height: 180, display: 'block' }}
                  />
                </div>
              )}
              <div style={{ fontSize: '0.80rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 8 }}>
                Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>1Password</strong>
              </div>
            </div>

            {/* Secret Key Display Box */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Or enter this setup key manually into your app:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  style={{
                    ...inputStyle,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    color: isDark ? '#38bdf8' : '#162399',
                    background: isDark ? '#0f172a' : '#f8fafc',
                  }}
                  value={twoFactorSecret}
                  readOnly
                />
                <button
                  type="button"
                  onClick={copy2FASecret}
                  style={{
                    height: 42,
                    padding: '0 16px',
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    color: isDark ? '#e2e8f0' : '#334155',
                  }}
                >
                  {copiedSecret ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                  <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 6-Digit Verification Input */}
            <form onSubmit={handleConfirm2FA}>
              <div>
                <label style={labelStyle}>Enter the 6-digit code shown in your app to activate:</label>
                <input
                  type="text"
                  style={{
                    ...inputStyle,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    letterSpacing: '6px',
                    fontWeight: 700,
                  }}
                  maxLength={6}
                  value={twoFactorVerifyCode}
                  onChange={(e) => setTwoFactorVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                />
              </div>

              <button
                type="submit"
                style={primaryBtnStyle}
                disabled={is2FALoading}
              >
                {is2FALoading ? 'Verifying...' : 'Verify and Enable 2FA'}
              </button>

              <button
                type="button"
                onClick={() => setTwoFactorStep('idle')}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '0.82rem',
                  marginTop: 10,
                  cursor: 'pointer',
                }}
              >
                Cancel setup
              </button>
            </form>
          </div>
        )}

        {/* 2FA Disable Confirmation */}
        {twoFactorStep === 'disable_confirm' && (
          <form onSubmit={handleDisable2FA} style={{ marginTop: 20, paddingTop: 18, borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#ef4444' }}>
                Disable Two-Factor Authentication
              </div>
              <button
                type="button"
                onClick={() => setTwoFactorStep('idle')}
                style={{ background: 'transparent', border: 'none', color: isDark ? '#94a3b8' : '#94a3b8', cursor: 'pointer', padding: 4 }}
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.82rem', color: isDark ? '#fca5a5' : '#991b1b' }}>
              Disabling 2FA will remove the extra layer of security from your account. Please enter your account password to confirm:
            </div>

            <div>
              <label style={labelStyle}>Account Password</label>
              <input
                type="password"
                style={inputStyle}
                value={disablePasswordInput}
                onChange={(e) => setDisablePasswordInput(e.target.value)}
                placeholder="Enter your account password"
                required
              />
            </div>

            <button
              type="submit"
              style={{ ...primaryBtnStyle, background: '#ef4444' }}
              disabled={is2FALoading}
            >
              {is2FALoading ? 'Disabling...' : 'Confirm & Disable 2FA'}
            </button>

            <button
              type="button"
              onClick={() => setTwoFactorStep('idle')}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '0.82rem',
                marginTop: 10,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* 4. Timezone Card */}
      <div style={cardStyle}>
        <form onSubmit={handleSaveTimezone}>
          <div>
            <label style={labelStyle}>Timezone</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={primaryBtnStyle}
            disabled={isSavingTimezone}
          >
            {isSavingTimezone ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* 5. API Key Card */}
      <div style={cardStyle}>
        <div>
          <label style={labelStyle}>API key</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              style={{
                ...inputStyle,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.86rem',
                paddingRight: 40,
                background: isDark ? '#0f172a' : '#f8fafc',
                color: isDark ? '#38bdf8' : undefined,
              }}
              value={currentApiKey || 'No API key generated'}
              readOnly
            />
            {currentApiKey && (
              <button
                type="button"
                onClick={copyApiKey}
                title="Copy API key"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: isDark ? '#94a3b8' : '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {copiedKey ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 8 }}>
            Created: {apiKeyCreatedDate}
          </div>
        </div>

        <button
          type="button"
          style={primaryBtnStyle}
          onClick={handleRegenerateApiKey}
          disabled={isRegeneratingKey}
        >
          {isRegeneratingKey ? 'Generating new key...' : 'Generate new'}
        </button>
      </div>
    </div>
  );
};
