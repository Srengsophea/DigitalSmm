import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Copy, Check, ShieldCheck, KeyRound, Globe, Lock, Mail, User as UserIcon } from 'lucide-react';

export const UserSettingsView: React.FC = () => {
  const { user, refreshProfile, showToast } = useAuth();

  // 1. Email State
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // 2. Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 3. 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(user?.twoFactorEnabled));
  const [isToggling2FA, setIsToggling2FA] = useState(false);

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

  // Handlers
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (emailInput.trim().toLowerCase() === user?.email.toLowerCase()) {
      showToast('Email address is unchanged', 'info');
      return;
    }

    setIsChangingEmail(true);
    try {
      const res = await api.auth.changeEmail(emailInput.trim());
      if (res.success) {
        showToast('Email address updated successfully!', 'success');
        await refreshProfile();
      } else {
        showToast(res.error || 'Failed to update email', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating email address', 'error');
    } finally {
      setIsChangingEmail(false);
    }
  };

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

  const handleToggle2FA = async () => {
    setIsToggling2FA(true);
    try {
      const nextState = !twoFactorEnabled;
      const res = await api.auth.toggle2FA(nextState);
      if (res.success) {
        setTwoFactorEnabled(res.twoFactorEnabled);
        showToast(res.message || `2FA ${res.twoFactorEnabled ? 'enabled' : 'disabled'}`, 'success');
        await refreshProfile();
      } else {
        showToast(res.error || 'Failed to update 2FA status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating 2FA', 'error');
    } finally {
      setIsToggling2FA(false);
    }
  };

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

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #eef2f6',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
    padding: '24px 28px',
    marginBottom: 20,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 42,
    padding: '0 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.9rem',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  };

  const primaryBtnStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    background: '#162399',
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
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* 1. Account / Email Card */}
      <div style={cardStyle}>
        <form onSubmit={handleChangeEmail}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
              value={user?.username || ''}
              readOnly
              disabled
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <button
            type="submit"
            style={primaryBtnStyle}
            disabled={isChangingEmail}
          >
            {isChangingEmail ? 'Updating email...' : 'Change email'}
          </button>
        </form>
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
              <ShieldCheck size={12} /> Enabled
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
          Email-based option to add an extra layer of protection to your account. When signing in you'll need to enter a code that will be sent to your email address.
        </p>

        <button
          type="button"
          style={{
            ...primaryBtnStyle,
            background: twoFactorEnabled ? '#dc2626' : '#162399',
          }}
          onClick={handleToggle2FA}
          disabled={isToggling2FA}
        >
          {isToggling2FA
            ? 'Updating...'
            : twoFactorEnabled
            ? 'Disable'
            : 'Enable'}
        </button>
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
                background: '#f8fafc',
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
                  color: '#64748b',
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
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8 }}>
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
