import React from 'react';
import { HelpCircle, FileText, DollarSign } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const FAQView: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const faqs = [
    {
      q: 'How does Bakong KHQR deposit work?',
      a: 'Select Add Funds, choose your amount, and scan the dynamic KHQR code using ABA Mobile, ACLEDA, Wing, or any Cambodian bank. The payment is verified in real-time through the NBC Bakong network and credited immediately.',
    },
    {
      q: 'How fast do orders start after submission?',
      a: 'Most services start within 10 to 60 seconds of automated dispatch to high-speed delivery nodes. You can track real-time progress on the Orders page.',
    },
    {
      q: 'What is the format for Mass Orders?',
      a: 'Enter one order per line in format: service_id | link | quantity. Example: 19573 | https://t.me/channel/123 | 1000',
    },
    {
      q: 'Can I connect my own website or bot via API?',
      a: 'Yes! DigitalSMM provides a standard SMM API v2 endpoint at /api/v2. Head to the API section to get your personal reseller key and cURL code samples.',
    },
  ];

  return (
    <div className="card" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <HelpCircle size={22} color={isDark ? '#38bdf8' : '#162399'} />
        <h2 style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Frequently Asked Questions</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9', paddingBottom: 16 }}>
            <h4 style={{ color: isDark ? '#38bdf8' : '#162399', fontSize: '0.98rem', marginBottom: 6 }}>{faq.q}</h4>
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.88rem', lineHeight: 1.6 }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TermsView: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="card" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <FileText size={22} color={isDark ? '#38bdf8' : '#162399'} />
        <h2 style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Terms of Service & Refund Policy</h2>
      </div>
      <div style={{ fontSize: '0.88rem', color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p>1. By placing an order with DigitalSMM, you automatically accept all the below-listed terms of service whether you read them or not.</p>
        <p>2. We reserve the right to change these Terms of Service without notice. You are expected to read all terms before placing every order.</p>
        <p>3. Automatic Refunds: If an order fails or cannot be delivered by the provider, your wallet balance is immediately refunded in full.</p>
        <p>4. No order cancellation is permitted once the order is active, unless the service is explicitly labeled as cancelable.</p>
      </div>
    </div>
  );
};

export const AffiliatesView: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <DollarSign size={22} color={isDark ? '#38bdf8' : '#162399'} />
        <h2 style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Affiliate Program (Earn Money with DigitalSMM)</h2>
      </div>
      <p style={{ color: isDark ? '#94a3b8' : 'var(--text-muted)', marginBottom: 20 }}>
        Refer friends or clients and earn a <strong style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>5% lifetime commission</strong> on every deposit they make.
      </p>

      <div style={{ background: isDark ? '#0f172a' : '#f8fafc', padding: 18, borderRadius: 10, border: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b', marginBottom: 6 }}>
          Your Unique Referral Link:
        </div>
        <input
          type="text"
          className="form-input"
          readOnly
          value="https://digitalsmm.com/ref/user1048"
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#38bdf8' : '#162399',
            borderColor: isDark ? '#334155' : '#cbd5e1',
            fontWeight: 600,
          }}
        />
      </div>
    </div>
  );
};
