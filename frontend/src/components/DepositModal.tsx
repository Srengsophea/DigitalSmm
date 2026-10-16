import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Wallet, CreditCard, DollarSign, ArrowRight, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshProfile, showToast } = useAuth();
  const [amount, setAmount] = useState<number>(50);
  const [method, setMethod] = useState<'CRYPTO_USDT' | 'CREDIT_CARD' | 'PAYPAL'>('CRYPTO_USDT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState('50');

  if (!isOpen) return null;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(customAmount);
    if (isNaN(num) || num < 5) {
      showToast('Minimum deposit is $5.00', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.wallet.deposit(num, method);
      if (res.success) {
        showToast(`Successfully deposited $${num.toFixed(2)} to your balance!`, 'success');
        await refreshProfile();
        onClose();
      } else {
        showToast(res.error || 'Failed to process deposit', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectAmount = (val: number) => {
    setAmount(val);
    setCustomAmount(val.toString());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-icon-wrapper" style={{ width: 34, height: 34 }}>
              <Wallet size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Add Funds to Wallet</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Current Balance: <strong style={{ color: 'var(--success-light)' }}>${user?.balance.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleDeposit}>
          <div className="modal-body">
            {/* Payment Method Selector */}
            <div className="form-group">
              <label className="form-label">Select Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4 }}>
                {/* Crypto USDT */}
                <div
                  className={`glass-panel ${method === 'CRYPTO_USDT' ? 'active-border' : ''}`}
                  style={{
                    padding: 12,
                    cursor: 'pointer',
                    textAlign: 'center',
                    borderColor: method === 'CRYPTO_USDT' ? 'var(--primary)' : 'var(--border-subtle)',
                    background: method === 'CRYPTO_USDT' ? 'var(--primary-glow)' : 'var(--bg-input)',
                  }}
                  onClick={() => setMethod('CRYPTO_USDT')}
                >
                  <QrCode size={20} color="var(--cyan-light)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>USDT TRC-20</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Crypto (0% Fee)</div>
                </div>

                {/* Credit Card */}
                <div
                  className={`glass-panel ${method === 'CREDIT_CARD' ? 'active-border' : ''}`}
                  style={{
                    padding: 12,
                    cursor: 'pointer',
                    textAlign: 'center',
                    borderColor: method === 'CREDIT_CARD' ? 'var(--primary)' : 'var(--border-subtle)',
                    background: method === 'CREDIT_CARD' ? 'var(--primary-glow)' : 'var(--bg-input)',
                  }}
                  onClick={() => setMethod('CREDIT_CARD')}
                >
                  <CreditCard size={20} color="var(--primary-light)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>Debit / Card</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Instant Checkout</div>
                </div>

                {/* PayPal */}
                <div
                  className={`glass-panel ${method === 'PAYPAL' ? 'active-border' : ''}`}
                  style={{
                    padding: 12,
                    cursor: 'pointer',
                    textAlign: 'center',
                    borderColor: method === 'PAYPAL' ? 'var(--primary)' : 'var(--border-subtle)',
                    background: method === 'PAYPAL' ? 'var(--primary-glow)' : 'var(--bg-input)',
                  }}
                  onClick={() => setMethod('PAYPAL')}
                >
                  <DollarSign size={20} color="var(--warning)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>PayPal</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Global Gateway</div>
                </div>
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Select Deposit Amount (USD)</label>
              <div className="chips-row">
                {[10, 25, 50, 100, 250, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`chip-btn ${amount === val ? 'active' : ''}`}
                    onClick={() => selectAmount(val)}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="form-group">
              <label className="form-label">Or Custom Amount ($)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: 11, color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
                <input
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: 30 }}
                  min={5}
                  max={10000}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmount(parseFloat(e.target.value) || 0);
                  }}
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Minimum deposit: $5.00 • Instant automated settlement
              </span>
            </div>

            {/* Simulated Crypto / Gateway preview note */}
            {method === 'CRYPTO_USDT' && (
              <div className="glass-panel" style={{ padding: '12px 14px', marginTop: 12, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--cyan-light)', fontWeight: 600, marginBottom: 4 }}>
                  <ShieldCheck size={16} /> Automated TRC-20 Address Ready
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  TDSmmFollowsDeposit8ce4373a1a160279
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : `Deposit $${(parseFloat(customAmount) || 0).toFixed(2)}`}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
