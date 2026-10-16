import React from 'react';
import { HelpCircle, ShoppingBag, FileText, DollarSign, CheckCircle2 } from 'lucide-react';

export const FAQView: React.FC = () => {
  const faqs = [
    {
      q: 'How does Bakong KHQR deposit work?',
      a: 'Select Add Funds, choose your amount, and scan the dynamic KHQR code using ABA Mobile, ACLEDA, Wing, or any Cambodian bank. The payment is verified in real-time through the NBC Bakong network and credited immediately.',
    },
    {
      q: 'How fast do orders start after submission?',
      a: 'Most services start within 10 to 60 seconds of automated dispatch to SMMFollows infrastructure. You can track real-time progress on the Orders page.',
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
        <HelpCircle size={22} color="#162399" />
        <h2>Frequently Asked Questions</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
            <h4 style={{ color: '#162399', fontSize: '0.98rem', marginBottom: 6 }}>{faq.q}</h4>
            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6 }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChildPanelView: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <ShoppingBag size={28} color="#0284c7" />
      </div>
      <h2>Order Your Own Child Panel</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 540, margin: '8px auto 24px' }}>
        Start your own SMM reseller business connected to DigitalSMM with your custom domain name for only $3/month.
      </p>

      <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', maxWidth: 480, margin: '0 auto 24px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.88rem', color: '#1e293b' }}>
          <CheckCircle2 size={16} color="#16a34a" /> Automated synchronization with 7,500+ services
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.88rem', color: '#1e293b' }}>
          <CheckCircle2 size={16} color="#16a34a" /> Free SSL certificate & custom domain setup
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: '#1e293b' }}>
          <CheckCircle2 size={16} color="#16a34a" /> KHQR Bakong & International payment modules
        </div>
      </div>

      <button className="btn btn-primary" style={{ padding: '12px 32px' }}>
        Order Child Panel ($3.00/Month)
      </button>
    </div>
  );
};

export const TermsView: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <FileText size={22} color="#162399" />
        <h2>Terms of Service & Refund Policy</h2>
      </div>
      <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p>1. By placing an order with DigitalSMM, you automatically accept all the below-listed terms of service whether you read them or not.</p>
        <p>2. We reserve the right to change these Terms of Service without notice. You are expected to read all terms before placing every order.</p>
        <p>3. Automatic Refunds: If an order fails or cannot be delivered by the provider, your wallet balance is immediately refunded in full.</p>
        <p>4. No order cancellation is permitted once the order is active, unless the service is explicitly labeled as cancelable.</p>
      </div>
    </div>
  );
};

export const AffiliatesView: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <DollarSign size={22} color="#162399" />
        <h2>Affiliate Program (Earn Money with DigitalSMM)</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Refer friends or clients and earn a <strong>5% lifetime commission</strong> on every deposit they make.
      </p>

      <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
          Your Unique Referral Link:
        </div>
        <input
          type="text"
          className="form-input"
          readOnly
          value="https://digitalsmm.com/ref/user1048"
          style={{ background: '#ffffff', color: '#162399', fontWeight: 600 }}
        />
      </div>
    </div>
  );
};
