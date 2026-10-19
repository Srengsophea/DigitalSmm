import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ServiceItem } from './ServicesTable';
import { X, ShoppingBag, AlertCircle, CheckCircle2, Wallet, ArrowRight, ExternalLink } from 'lucide-react';

interface OrderModalProps {
  service: ServiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: () => void;
  openDepositModal: () => void;
  openAuthModal: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  service,
  isOpen,
  onClose,
  onOrderSuccess,
  openDepositModal,
  openAuthModal,
}) => {
  const { user, isAuthenticated, refreshProfile, showToast } = useAuth();
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (service) {
      setQuantity(Math.max(service.min, 1000));
      setErrorMessage(null);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const totalCharge = Number(((quantity / 1000) * service.customRate).toFixed(4));
  const hasEnoughBalance = user ? user.balance >= totalCharge : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!link.trim()) {
      setErrorMessage('Please enter the target link or username');
      return;
    }

    if (quantity < service.min) {
      setErrorMessage(`Quantity must be at least ${service.min.toLocaleString()}`);
      return;
    }

    if (quantity > service.max) {
      setErrorMessage(`Quantity cannot exceed ${service.max.toLocaleString()}`);
      return;
    }

    if (!hasEnoughBalance) {
      setErrorMessage(`Insufficient balance. Please deposit at least $${(totalCharge - (user?.balance || 0)).toFixed(3)} to place this order.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.orders.createOrder({
        serviceId: service.id,
        link: link.trim(),
        quantity,
      });

      if (res.success) {
        showToast(`Order #${res.order?.id.slice(0, 8)} placed successfully!`, 'success');
        await refreshProfile();
        onOrderSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to place order');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetQuantity = (qty: number) => {
    const clamped = Math.min(Math.max(qty, service.min), service.max);
    setQuantity(clamped);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-icon-wrapper" style={{ width: 34, height: 34 }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Place New Order</h3>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                Service #{service.externalId} • {service.platform}
              </span>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Service Summary Card */}
            <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.92rem', marginBottom: 4 }}>
                {service.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {service.category}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Rate: </span>
                  <strong style={{ color: 'var(--cyan-light)' }}>${service.customRate.toFixed(3)}</strong> / 1k
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Min/Max: </span>
                  <strong>{service.min.toLocaleString()}</strong> - <strong>{service.max.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Target Link Input */}
            <div className="form-group">
              <label className="form-label">
                Target Link / URL <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="https://instagram.com/p/... or @channel"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enter the direct public link or handle to receive the service
              </span>
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Order Quantity</label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Min: {service.min.toLocaleString()} | Max: {service.max.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                className="form-input"
                min={service.min}
                max={service.max}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || service.min)}
                required
              />

              {/* Quick Chips */}
              <div className="chips-row">
                {[100, 500, 1000, 5000, 10000, 25000].map((preset) => {
                  if (preset >= service.min && preset <= service.max) {
                    return (
                      <button
                        key={preset}
                        type="button"
                        className={`chip-btn ${quantity === preset ? 'active' : ''}`}
                        onClick={() => setPresetQuantity(preset)}
                      >
                        +{preset.toLocaleString()}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Price & Wallet Summary Box */}
            <div className="price-summary-box">
              <div className="summary-row">
                <span style={{ color: 'var(--text-secondary)' }}>Calculated Rate:</span>
                <span>${service.customRate.toFixed(3)} per 1,000</span>
              </div>
              <div className="summary-row">
                <span style={{ color: 'var(--text-secondary)' }}>Your Available Balance:</span>
                <span style={{ color: isAuthenticated ? 'var(--success-light)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {isAuthenticated ? `$${user?.balance.toFixed(3)}` : 'Not signed in'}
                </span>
              </div>
              <div className="summary-row total">
                <span>Total Charge:</span>
                <span className="summary-total-price">${totalCharge.toFixed(3)}</span>
              </div>
            </div>

            {/* Insufficient balance notice */}
            {isAuthenticated && !hasEnoughBalance && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#fca5a5' }}>
                  <AlertCircle size={16} />
                  <span>Insufficient balance for this order.</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onClose();
                    openDepositModal();
                  }}
                >
                  <Wallet size={14} />
                  Add Funds
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} color="var(--danger)" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  openAuthModal();
                }}
              >
                Sign In to Order
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !hasEnoughBalance}
              >
                {isSubmitting ? 'Dispatching Order...' : `Confirm & Pay $${totalCharge.toFixed(3)}`}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
