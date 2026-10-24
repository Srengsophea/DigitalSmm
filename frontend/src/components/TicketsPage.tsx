import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  Search,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Paperclip,
  X,
  FileCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface TicketsPageProps {
  openAuthModal?: () => void;
}

export const TicketsPage: React.FC<TicketsPageProps> = ({ openAuthModal }) => {
  const { user, isAuthenticated, showToast } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Form states
  const [selectedSubject, setSelectedSubject] = useState<string>('Orders');
  const [subType, setSubType] = useState<string>('Refill');
  const [orderIds, setOrderIds] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [referralSource, setReferralSource] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tickets History states
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(true);
  const [selectedTicketModal, setSelectedTicketModal] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ticketsPerPage = 5;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 9 Categories matching Screenshot 1
  const categories = [
    {
      name: 'Orders',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" fill="#e0ecfe" stroke="#3b82f6" strokeWidth="1.5" />
          <path d="M7 8h10M7 12h7M7 16h4" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      subOptions: ['Refill', 'Cancellation', 'Speed Up'],
    },
    {
      name: 'Payments',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M12 7v10M14.5 9.5a2.5 2.5 0 0 0-5 0c0 2.5 5 1.5 5 4a2.5 2.5 0 0 1-5 0" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      subOptions: ['Deposit Issue', 'Bakong KHQR', 'Invoice', 'Refund'],
    },
    {
      name: 'Invoice',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-3.5-2-3.5 2-3.5-2L5 21V4z" fill="#f0fdf4" stroke="#10b981" strokeWidth="1.5" />
          <path d="M8 8h8M8 12h6M8 15h4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      subOptions: ['Invoice Request', 'Tax Info', 'VAT Certificate'],
    },
    {
      name: 'API',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="16" rx="4" fill="#0284c7" />
          <text x="12" y="15" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">API</text>
        </svg>
      ),
      subOptions: ['API Key', 'Connection Error', 'Order API', 'Status API'],
    },
    {
      name: 'BUG',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V9z" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" />
          <path d="M12 3v3M6 7l3 2M18 7l-3 2M5 12h4M15 12h4M6 17l3-2M18 17l-3-2" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
      subOptions: ['Website Bug', 'Balance Bug', 'Service Glitch'],
    },
    {
      name: 'Redeem',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="13" rx="2" fill="#fdf2f8" stroke="#ec4899" strokeWidth="1.5" />
          <path d="M3 10h18" stroke="#db2777" strokeWidth="1.5" />
          <circle cx="16" cy="14" r="2" fill="#f472b6" />
        </svg>
      ),
      subOptions: ['Coupon Code', 'Voucher Redeem', 'Promotion Bonus'],
    },
    {
      name: 'Request',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
          <path d="M12 9a1.5 1.5 0 0 1 1.5 1.5c0 1-1.5 1.5-1.5 2.5m0 3h.01" stroke="#0369a1" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      subOptions: ['New Feature', 'Add New Service', 'Custom Plan'],
    },
    {
      name: 'Other',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="4" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="8" cy="12" r="1.5" fill="#475569" />
          <circle cx="12" cy="12" r="1.5" fill="#475569" />
          <circle cx="16" cy="12" r="1.5" fill="#475569" />
        </svg>
      ),
      subOptions: ['General Inquiry', 'Partnership', 'Feedback'],
    },
  ];

  const activeCategory = categories.find((c) => c.name === selectedSubject) || categories[0];

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      if (isAuthenticated) {
        const res = await api.tickets.getMyTickets();
        if (res.success && res.tickets) {
          setTickets(res.tickets);
          return;
        }
      }
      // Default welcome ticket matching Screenshot 1
      setTickets([
        {
          id: 'welcome-ticket-1',
          ticketNumber: 1172282,
          subjectType: 'Orders',
          subType: 'Refill',
          orderIds: '27417914',
          message: "Welcome to DigitalSmm.site We're glad you're here! Feel free to reach out anytime.",
          referralSource: 'Search engines',
          status: 'New',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [isAuthenticated]);

  const handleCategorySelect = (catName: string) => {
    setSelectedSubject(catName);
    const cat = categories.find((c) => c.name === catName);
    if (cat && cat.subOptions && cat.subOptions.length > 0) {
      setSubType(cat.subOptions[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be under 5MB', 'error');
        return;
      }
      setAttachedFile(file);
      showToast(`Attached: ${file.name}`, 'info');
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showToast('Please sign in to submit a support ticket', 'info');
      if (openAuthModal) openAuthModal();
      return;
    }

    if (!message.trim()) {
      showToast('Please enter your ticket message', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.tickets.createTicket({
        subjectType: selectedSubject,
        subType: subType,
        orderIds: orderIds.trim(),
        message: message.trim(),
        referralSource: referralSource.trim(),
      });

      if (res.success) {
        showToast(`Ticket #${res.ticket.ticketNumber} submitted successfully!`, 'success');
        setMessage('');
        setOrderIds('');
        setReferralSource('');
        handleRemoveFile();
        await fetchTickets();
      } else {
        showToast(res.error || 'Failed to submit ticket', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error submitting ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber?.toString().includes(q) ||
      t.message?.toLowerCase().includes(q) ||
      t.subjectType?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ticketsPerPage));
  const displayedTickets = filteredTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  return (
    <div className="tickets-page-container">
      {/* ================= LEFT COLUMN: TICKET SUBMISSION CARD ================= */}
      <div className="card" style={{ padding: 24 }}>
        {/* Warning Alert Banner matching Screenshot 1 */}
        <div className="ticket-alert-banner">
          <span>
            To get a quicker response to your inquiries or issues, please refer to our FAQs prior to submitting a ticket.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 9 Category Cards Row matching Screenshot 1 */}
          <div className="ticket-categories-grid">
            {categories.map((cat) => {
              const isSelected = selectedSubject === cat.name;
              return (
                <div
                  key={cat.name}
                  className={`ticket-category-box ${isSelected ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(cat.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cat.icon}
                  </div>
                  <div className="ticket-category-title">{cat.name}</div>
                </div>
              );
            })}
          </div>

          {/* Sub-action pills matching Screenshot 1 */}
          {activeCategory.subOptions && activeCategory.subOptions.length > 0 && (
            <div className="ticket-subpills-row">
              {activeCategory.subOptions.map((opt) => {
                const isSelected = subType === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`ticket-subpill-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setSubType(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Field 1: Order ID with red instructions matching Screenshot 1 */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 6 }}>
              Order ID{' '}
              <span style={{ color: isDark ? '#f87171' : '#dc2626', fontSize: '0.78rem', fontWeight: 400 }}>
                (To receive a faster response, ensure that you assign the correct order IDs.)
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="ex. 27417914,27417915,27417916,27417917,27417918"
              value={orderIds}
              onChange={(e) => setOrderIds(e.target.value)}
            />
          </div>

          {/* Field 2: Message Textarea matching Screenshot 1 */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 6 }}>
              Message
            </label>
            <textarea
              className="form-input"
              rows={5}
              placeholder="ex. Hi there, I would like to check my recent order status."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              style={{ minHeight: 120, resize: 'vertical' }}
            />
          </div>

          {/* Field 3: How did you hear about our website? matching Screenshot 1 */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 6 }}>
              How did you hear about our website?{' '}
              <span style={{ color: isDark ? '#f87171' : '#dc2626', fontSize: '0.78rem', fontWeight: 400 }}>
                (Please mention how did hear about us [Search engines, Social media, Referral, Forum, Other])
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder=""
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            />
          </div>

          {/* Field 4: Attach files matching Screenshot 1 */}
          <div style={{ marginBottom: 20 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.txt,.log,.zip"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.86rem',
                color: isDark ? '#94a3b8' : '#475569',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Paperclip size={16} color={isDark ? '#94a3b8' : '#64748b'} />
              <span style={{ fontWeight: 500 }}>Attach files</span>
            </div>

            {attachedFile && (
              <div
                style={{
                  marginTop: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px',
                  background: isDark ? '#0f172a' : '#f1f5f9',
                  borderRadius: 6,
                  border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  color: isDark ? '#f8fafc' : '#1e293b',
                }}
              >
                <FileCheck size={14} color="#15803d" />
                <span>
                  {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Full-width Royal Blue Submit ticket button matching Screenshot 1 */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
            style={{
              background: isDark ? '#2563eb' : '#162399',
              padding: '13px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 6,
            }}
          >
            {isSubmitting ? 'Submitting Ticket...' : 'Submit ticket'}
          </button>
        </form>
      </div>

      {/* ================= RIGHT COLUMN: TICKETS HISTORY CARD ================= */}
      <div className="ticket-history-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b', marginBottom: 16 }}>
          Tickets History
        </h3>

        {/* Search input with Royal Blue search button matching Screenshot 1 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          />
          <button
            type="button"
            className="btn-search"
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#162399',
              borderRadius: 6,
            }}
            onClick={() => setCurrentPage(1)}
          >
            <Search size={14} />
          </button>
        </div>

        {/* Tickets List matching Screenshot 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220 }}>
          {isLoadingTickets ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              Loading tickets...
            </div>
          ) : displayedTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              No tickets found.
            </div>
          ) : (
            displayedTickets.map((t) => (
              <div
                key={t.id || t.ticketNumber}
                className="ticket-history-item"
                onClick={() => setSelectedTicketModal(t)}
              >
                {/* Top line with Mail icon, ticket ID, and subject title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Mail size={16} color={isDark ? '#38bdf8' : '#2563eb'} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    <span style={{ color: isDark ? '#38bdf8' : '#162399' }}>{t.ticketNumber}</span> - {t.message.slice(0, 48)}
                    {t.message.length > 48 ? '...' : ''}
                  </div>
                </div>

                {/* Sub-line with timestamp and status badge */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.74rem',
                    color: isDark ? '#94a3b8' : '#64748b',
                    marginTop: 6,
                    paddingLeft: 24,
                  }}
                >
                  <span>
                    {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span
                    style={{
                      background: isDark
                        ? t.status === 'New' ? 'rgba(56, 189, 248, 0.2)' : t.status === 'Answered' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)'
                        : t.status === 'New' ? '#dbeafe' : t.status === 'Answered' ? '#dcfce7' : '#f1f5f9',
                      color: isDark
                        ? t.status === 'New' ? '#38bdf8' : t.status === 'Answered' ? '#4ade80' : '#cbd5e1'
                        : t.status === 'New' ? '#1e40af' : t.status === 'Answered' ? '#15803d' : '#475569',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: '0.72rem',
                    }}
                  >
                    {t.status || 'New'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Row matching Screenshot 1: <<, <, [1], >, >> */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 }}>
          <button
            className="topbar-circle-btn"
            style={{ width: 28, height: 28, borderRadius: 4 }}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(1)}
            title="First page"
          >
            <ChevronsLeft size={13} />
          </button>
          <button
            className="topbar-circle-btn"
            style={{ width: 28, height: 28, borderRadius: 4 }}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous page"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              background: isDark ? '#2563eb' : '#162399',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {currentPage}
          </button>
          <button
            className="topbar-circle-btn"
            style={{ width: 28, height: 28, borderRadius: 4 }}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            title="Next page"
          >
            <ChevronRight size={13} />
          </button>
          <button
            className="topbar-circle-btn"
            style={{ width: 28, height: 28, borderRadius: 4 }}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            title="Last page"
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>

      {/* Ticket Details & Conversation Modal */}
      {selectedTicketModal && (
        <div className="modal-overlay" onClick={() => setSelectedTicketModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={18} color="#162399" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
                  Ticket #{selectedTicketModal.ticketNumber}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedTicketModal(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{selectedTicketModal.subjectType}</span>
                {selectedTicketModal.subType && (
                  <span className="badge badge-cyan">{selectedTicketModal.subType}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b' }}>
                  {new Date(selectedTicketModal.createdAt).toLocaleString()}
                </span>
              </div>

              {selectedTicketModal.orderIds && (
                <div style={{ fontSize: '0.85rem', marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <strong>Associated Order IDs:</strong> <code>{selectedTicketModal.orderIds}</code>
                </div>
              )}

              <div style={{ marginBottom: 8, fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                Your Inquiry:
              </div>
              <div
                style={{
                  background: '#f8fafc',
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedTicketModal.message}
              </div>

              <div style={{ marginTop: 16, padding: 14, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#1e40af', fontWeight: 700, fontSize: '0.85rem' }}>
                  <CheckCircle2 size={15} color="#2563eb" />
                  DigitalSMM Support Desk:
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                  Thank you for contacting DigitalSMM support! Our operators are currently processing your ticket request. Expected response turnaround is under 30 minutes.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTicketModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
