import React, { useState, useMemo, useEffect } from 'react';
import { OrderItem } from './OrdersHistory';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Clock,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  ExportFilterOptions,
  filterOrdersForExport,
  calculateSpendSummary,
  exportOrdersToPdf,
  exportOrdersToExcel,
  exportOrdersToTxt,
  getRangeLabel,
} from '../utils/orderExport';

export interface OrderExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  username?: string;
}

export const OrderExportModal: React.FC<OrderExportModalProps> = ({
  isOpen,
  onClose,
  orders,
  username,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'txt'>('pdf');
  const [rangeType, setRangeType] = useState<ExportFilterOptions['rangeType']>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filter orders according to user selection
  const filteredOrders = useMemo(() => {
    return filterOrdersForExport(orders, {
      rangeType,
      customStart: customStart || undefined,
      customEnd: customEnd || undefined,
      statusFilter,
      username,
    });
  }, [orders, rangeType, customStart, customEnd, statusFilter, username]);

  // Calculate live spend metrics
  const spendSummary = useMemo(() => {
    return calculateSpendSummary(filteredOrders);
  }, [filteredOrders]);

  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportFilterOptions = {
        rangeType,
        customStart: customStart || undefined,
        customEnd: customEnd || undefined,
        statusFilter,
        username,
      };

      // Slight timeout to allow UI loading spinner
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (selectedFormat === 'pdf') {
        exportOrdersToPdf(filteredOrders, options);
      } else if (selectedFormat === 'excel') {
        exportOrdersToExcel(filteredOrders, options);
      } else {
        exportOrdersToTxt(filteredOrders, options);
      }
      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const setPresetToday = () => {
    setRangeType('today');
  };

  const setPresetYesterday = () => {
    setRangeType('yesterday');
  };

  const setPreset7Days = () => {
    setRangeType('7days');
  };

  const setPreset30Days = () => {
    setRangeType('30days');
  };

  const setPresetThisMonth = () => {
    setRangeType('this_month');
  };

  const setPresetAll = () => {
    setRangeType('all');
    setCustomStart('');
    setCustomEnd('');
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          margin: 'auto',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #162399 0%, #1e3a8a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                Export Orders & Spend Statement
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#c7d2fe' }}>
                Download reports in PDF, Excel (.xlsx), or TXT format with full spend breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 4,
              opacity: 0.8,
              transition: 'opacity 0.2s',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* 1. Format Selection */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: 10 }}>
              1. Choose Export Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {/* PDF Format */}
              <div
                onClick={() => setSelectedFormat('pdf')}
                style={{
                  border: selectedFormat === 'pdf' ? '2px solid #162399' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 12px',
                  cursor: 'pointer',
                  backgroundColor: selectedFormat === 'pdf' ? '#eef2ff' : '#ffffff',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#dc2626', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                  <FileText size={28} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>PDF Document</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                  Formatted Statement
                </div>
              </div>

              {/* Excel Format */}
              <div
                onClick={() => setSelectedFormat('excel')}
                style={{
                  border: selectedFormat === 'excel' ? '2px solid #162399' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 12px',
                  cursor: 'pointer',
                  backgroundColor: selectedFormat === 'excel' ? '#eef2ff' : '#ffffff',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#16a34a', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                  <FileSpreadsheet size={28} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>Excel (.xlsx)</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                  Spreadsheet & Totals
                </div>
              </div>

              {/* TXT Format */}
              <div
                onClick={() => setSelectedFormat('txt')}
                style={{
                  border: selectedFormat === 'txt' ? '2px solid #162399' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 12px',
                  cursor: 'pointer',
                  backgroundColor: selectedFormat === 'txt' ? '#eef2ff' : '#ffffff',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#2563eb', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                  <FileCode size={28} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>Text File (.txt)</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                  ASCII Table Report
                </div>
              </div>
            </div>
          </div>

          {/* 2. Date/Time Range Presets */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                2. Select Date & Time Range
              </label>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Active: <b>{getRangeLabel({ rangeType, customStart, customEnd })}</b>
              </span>
            </div>

            {/* Quick preset buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                type="button"
                onClick={setPresetAll}
                className={`order-status-pill ${rangeType === 'all' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                All Orders ({orders.length})
              </button>
              <button
                type="button"
                onClick={setPresetToday}
                className={`order-status-pill ${rangeType === 'today' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={setPresetYesterday}
                className={`order-status-pill ${rangeType === 'yesterday' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={setPreset7Days}
                className={`order-status-pill ${rangeType === '7days' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={setPreset30Days}
                className={`order-status-pill ${rangeType === '30days' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={setPresetThisMonth}
                className={`order-status-pill ${rangeType === 'this_month' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setRangeType('custom')}
                className={`order-status-pill ${rangeType === 'custom' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Custom Range 📅
              </button>
            </div>

            {/* Custom Range Date/Time Inputs */}
            {rangeType === 'custom' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  padding: 14,
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Start Date & Time (From):
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    End Date & Time (To):
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Status Filter Selection */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: 6 }}>
              3. Status Filter
            </label>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.86rem', padding: '8px 12px' }}
            >
              <option value="ALL">All Statuses (Completed, Processing, In progress, Pending, Canceled)</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="PROCESSING">Processing Only</option>
              <option value="IN_PROGRESS">In Progress Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="PARTIAL">Partial Only</option>
              <option value="CANCELED">Canceled (Refunded) Only</option>
            </select>
          </div>

          {/* 4. Live Spend & Orders Summary Preview Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={16} color="#162399" />
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b' }}>
                  Live Export Preview: {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#e0e7ff',
                  color: '#3730a3',
                }}
              >
                {selectedFormat.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>TOTAL SPENT</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#162399' }}>
                  ${spendSummary.totalSpent.toFixed(3)}
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>NET SPENT</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  ${spendSummary.netSpent.toFixed(3)}
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>COMPLETED</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>
                  {spendSummary.completedCount}
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>REFUNDED</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>
                  ${spendSummary.totalRefunded.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Action Buttons (Pinned Footer) */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafcff',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '9px 18px', fontSize: '0.88rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || filteredOrders.length === 0}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 22px',
              fontSize: '0.88rem',
              fontWeight: 600,
              backgroundColor: '#162399',
            }}
          >
            <Download size={16} />
            <span>
              {isExporting
                ? 'Generating File...'
                : filteredOrders.length === 0
                ? 'No Orders in Range'
                : `Download ${selectedFormat.toUpperCase()} (${filteredOrders.length} orders)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
