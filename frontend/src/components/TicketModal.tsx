import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Ticket, Send, CheckCircle2 } from 'lucide-react';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose }) => {
  const { user, showToast } = useAuth();
  const [subject, setSubject] = useState('Order refill inquiry');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    showToast('Support ticket #10482 submitted successfully! Our agents will respond shortly.', 'success');
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={20} color="#162399" />
            <h3 style={{ fontSize: '1.1rem' }}>Open Support Ticket</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {isSent ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <CheckCircle2 size={50} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <h4>Ticket Submitted!</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
              Ticket #10482 has been routed to our 24/7 support desk.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="Order refill inquiry">Order refill inquiry</option>
                  <option value="Speed / Delivery question">Speed / Delivery question</option>
                  <option value="Payment / KHQR deposit verification">Payment / KHQR deposit verification</option>
                  <option value="Child panel setup">Child panel setup</option>
                  <option value="Other inquiry">Other inquiry</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Order ID (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 19573 or #c9284f"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Description</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Please describe your question or issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Send size={15} />
                Submit Ticket
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
