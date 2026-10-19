import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { QrCode, CheckCircle2, Clock, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, Download, Copy, Check, ExternalLink } from 'lucide-react';

export const AddFundsKhqr: React.FC = () => {
  const { user, refreshProfile, showToast } = useAuth();
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('10');
  const currency = 'USD';
  const [isLoading, setIsLoading] = useState(false);
  const [khqrData, setKhqrData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes countdown matching dynamic KHQR
  const [isPaid, setIsPaid] = useState(false);

  // Preset amounts
  const presets = [5, 10, 20, 50, 100, 200];

  const handleGenerateKhqr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(customAmount);
    if (isNaN(num) || num < 1) {
      showToast('Minimum deposit is $1.00 USD', 'error');
      return;
    }

    setIsLoading(true);
    setIsPaid(false);
    setKhqrData(null);
    setTimeLeft(900);

    try {
      const res = await api.wallet.generateKhqr(num, currency);
      if (res.success && res.data) {
        setKhqrData(res.data);
        showToast('Bakong KHQR generated! Please scan with your banking app.', 'success');
      } else {
        showToast(res.error || 'Failed to generate KHQR', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error communicating with Bakong gateway', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-poll verification every 4 seconds while KHQR is active
  useEffect(() => {
    if (!khqrData?.md5 || isPaid) return;

    const interval = setInterval(async () => {
      try {
        const check = await api.wallet.verifyKhqr(khqrData.md5, khqrData.amount);
        if (check.success && check.confirmed) {
          setIsPaid(true);
          showToast(`Payment received! $${khqrData.amount.toFixed(3)} credited to your wallet.`, 'success');
          await refreshProfile();
          clearInterval(interval);
        }
      } catch (e) {
        // Continue polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [khqrData, isPaid]);

  // Countdown timer
  useEffect(() => {
    if (!khqrData || isPaid || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [khqrData, isPaid, timeLeft]);

  const handleManualVerify = async () => {
    if (!khqrData?.md5) return;
    setIsVerifying(true);
    try {
      const res = await api.wallet.verifyKhqr(khqrData.md5, khqrData.amount);
      if (res.success && res.confirmed) {
        setIsPaid(true);
        showToast(`Payment confirmed by Bakong! Balance credited.`, 'success');
        await refreshProfile();
      } else {
        showToast(res.message || 'Payment pending in Bakong network. Please ensure payment was completed in your banking app.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification error', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2>Add Funds — Real Bakong KHQR Gateway</h2>
        <p style={{ marginTop: 6, color: 'var(--text-muted)' }}>
          Scan and pay directly using any Cambodian banking app (ABA Mobile, ACLEDA, Wing, Sathapana, Canadia).
        </p>
      </div>

      <div className={`khqr-page-grid ${khqrData ? 'has-qr' : ''}`}>
        {/* Deposit Configuration Form */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={18} color="#162399" />
            1. Select Deposit Amount
          </h3>

          <form onSubmit={handleGenerateKhqr}>
            {/* Quick preset buttons */}
            <div className="form-group">
              <label className="form-label">Quick Amounts (USD)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {presets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`btn ${amount === val ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => {
                      setAmount(val);
                      setCustomAmount(val.toString());
                    }}
                  >
                    ${val}.00
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="form-group">
              <label className="form-label">Deposit Amount (USD $)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-input"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAmount(parseFloat(e.target.value) || 0);
                }}
                required
              />
            </div>

            {/* Generate KHQR button */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading}
              style={{ marginTop: 4, padding: 12 }}
            >
              {isLoading ? 'Generating Bakong KHQR...' : `Generate KHQR ($${(parseFloat(customAmount) || 0).toFixed(3)})`}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Supported Banks Row */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Supported by NBC Bakong Network:
            </span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8, fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
              <span>ABA Mobile</span> • <span>Wing</span> • <span>ACLEDA</span> • <span>Canadia</span> • <span>Sathapana</span>
            </div>
          </div>
        </div>

        {/* 2. Real Bakong KHQR Scan Card */}
        {khqrData && (
          <div className="khqr-card">
            {/* Red KHQR Header */}
            <div className="khqr-header">
              <div className="khqr-title">KHQR</div>
              <div style={{ fontSize: '0.78rem', background: '#ffffff', color: '#e12228', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                BAKONG
              </div>
            </div>

            <div className="khqr-body">
              {isPaid ? (
                <div style={{ padding: '30px 10px', textAlign: 'center' }}>
                  <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ color: '#15803d', marginBottom: 6 }}>Payment Confirmed!</h3>
                  <p style={{ fontSize: '0.88rem', color: '#475569' }}>
                    ${khqrData.amount.toFixed(3)} {khqrData.currency} has been successfully added to your wallet balance.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem', marginBottom: 2 }}>
                    {khqrData.merchantName || 'Digital Smm'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Ref: {khqrData.billNumber}
                  </div>

                  {/* QR Image Box with crisp base64 rendering */}
                  <div className="khqr-qr-box" style={{ background: '#ffffff', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <img
                      src={khqrData.qrImage || `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(khqrData.qrString)}`}
                      alt="Bakong KHQR"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </div>

                  {/* Amount Display */}
                  <div className="khqr-amount-text" style={{ margin: '14px 0 10px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                    ${khqrData.amount.toFixed(3)} USD
                  </div>

                  {/* Countdown Timer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.82rem', color: timeLeft > 60 ? '#475569' : '#dc2626', marginBottom: 14 }}>
                    <Clock size={14} />
                    <span>
                      Expires in: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                    </span>
                  </div>

                  {/* Polling Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.78rem', color: '#0284c7', background: '#f0f9ff', padding: '6px 10px', borderRadius: 6, marginBottom: 12 }}>
                    <RefreshCw size={12} className="spin" />
                    <span>Listening for NBC Bakong network settlement...</span>
                  </div>

                  {/* Mobile Deep Link */}
                  {khqrData.deeplink && (
                    <a
                      href={khqrData.deeplink}
                      className="btn btn-primary btn-block btn-sm"
                      style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <ExternalLink size={14} />
                      Open in Bakong App
                    </a>
                  )}

                  {/* Manual verify button */}
                  <button
                    className="btn btn-secondary btn-block btn-sm"
                    onClick={handleManualVerify}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Checking Bakong...' : 'I Have Paid / Check Status'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
