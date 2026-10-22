import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OrderItem } from './OrdersHistory';
import {
  Search,
  Check,
  RefreshCw,
  ShoppingCart,
  RotateCcw,
  XCircle,
  ExternalLink,
  Copy,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
  RotateCcw as RefundIcon,
} from 'lucide-react';
import { OrderExportModal } from './OrderExportModal';
import {
  calculateSpendSummary,
  exportOrdersToPdf,
  exportOrdersToExcel,
  exportOrdersToTxt,
} from '../utils/orderExport';

export interface OrdersViewProps {
  onBuyService?: (order: OrderItem) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onBuyService }) => {
  const { user, showToast } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const statusTabs = [
    { label: 'All', color: '#162399', isSolid: true },
    { label: 'Pending', color: '#f59e0b', isSolid: false },
    { label: 'In progress', color: '#3b82f6', isSolid: false },
    { label: 'Completed', color: '#10b981', isSolid: false },
    { label: 'Partial', color: '#eab308', isSolid: false },
    { label: 'Processing', color: '#06b6d4', isSolid: false },
    { label: 'Canceled', color: '#ef4444', isSolid: false },
  ];

  const formatStatusForApi = (label: string) => {
    if (!label || label.toLowerCase() === 'all') return undefined;
    return label.toUpperCase().replace(/\s+/g, '_');
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch filtered view
      const data = await api.orders.getMyOrders({
        status: formatStatusForApi(activeStatus),
        search: activeSearch.trim() || undefined,
      });
      if (data.success) {
        setOrders(data.orders || []);
      }

      // 2. Fetch full unfiltered orders history for comprehensive lifetime spend & export all
      const allData = await api.orders.getMyOrders({});
      if (allData.success) {
        setAllOrders(allData.orders || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefillOrder = async (order: OrderItem) => {
    if (actingOrderId === order.id) return;
    setActingOrderId(order.id);
    try {
      const res = await api.orders.refillOrder(order.id);
      if (res.success) {
        showToast(res.message || 'Refill requested successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to request refill', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error requesting refill', 'error');
    } finally {
      setActingOrderId(null);
    }
  };

  const handleCancelOrder = async (order: OrderItem) => {
    if (actingOrderId === order.id) return;
    if (!window.confirm(`Request cancellation from provider for Order #${order.id.slice(0, 7)}?`)) {
      return;
    }
    setActingOrderId(order.id);
    try {
      const res = await api.orders.cancelOrder(order.id);
      if (res.success) {
        showToast(res.message || 'Cancellation requested successfully!', 'success');
        fetchOrders();
      } else {
        showToast(res.error || 'Failed to cancel order', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error requesting cancellation', 'error');
    } finally {
      setActingOrderId(null);
    }
  };

  const handleCopyLink = (linkStr: string, orderId: string) => {
    navigator.clipboard.writeText(linkStr);
    setCopiedOrderId(orderId);
    showToast('Link copied to clipboard!', 'success');
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2000);
  };

  const formatDisplayLink = (raw: string) => {
    if (!raw) return '';
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  };

  useEffect(() => {
    fetchOrders();
  }, [activeStatus, activeSearch]);

  // Calculate live spend metrics across all orders vs filtered view
  const lifetimeSpend = useMemo(() => {
    const targetSet = allOrders.length > 0 ? allOrders : orders;
    return calculateSpendSummary(targetSet);
  }, [allOrders, orders]);

  const currentViewSpend = useMemo(() => {
    return calculateSpendSummary(orders);
  }, [orders]);

  // Quick 1-click export helpers for the active view
  const handleQuickExportPdf = () => {
    exportOrdersToPdf(orders, {
      rangeType: 'all',
      statusFilter: activeStatus,
      username: user?.username,
    });
    showToast('PDF Statement downloaded successfully!', 'success');
  };

  const handleQuickExportExcel = () => {
    exportOrdersToExcel(orders, {
      rangeType: 'all',
      statusFilter: activeStatus,
      username: user?.username,
    });
    showToast('Excel Statement downloaded successfully!', 'success');
  };

  const handleQuickExportTxt = () => {
    exportOrdersToTxt(orders, {
      rangeType: 'all',
      statusFilter: activeStatus,
      username: user?.username,
    });
    showToast('TXT Report downloaded successfully!', 'success');
  };

  return (
    <div>
      {/* 1. Spend Analytics Dashboard Cards */}
      <div className="orders-spend-analytics-grid">
        {/* Card 1: Total Spent */}
        <div className="orders-spend-card">
          <div className="orders-spend-card-header">
            <span className="orders-spend-card-title">Total Lifetime Spend</span>
            <div className="orders-spend-card-icon" style={{ backgroundColor: '#eef2ff', color: '#162399' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="orders-spend-card-value">${lifetimeSpend.totalSpent.toFixed(3)}</div>
          <div className="orders-spend-card-sub">
            <span>Net Realized: <b>${lifetimeSpend.netSpent.toFixed(3)}</b></span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="orders-spend-card">
          <div className="orders-spend-card-header">
            <span className="orders-spend-card-title">Total Orders</span>
            <div className="orders-spend-card-icon" style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="orders-spend-card-value">{lifetimeSpend.totalOrders.toLocaleString()}</div>
          <div className="orders-spend-card-sub">
            <span>Showing {orders.length} in current view</span>
          </div>
        </div>

        {/* Card 3: Completed Orders */}
        <div className="orders-spend-card">
          <div className="orders-spend-card-header">
            <span className="orders-spend-card-title">Completed Orders</span>
            <div className="orders-spend-card-icon" style={{ backgroundColor: '#ecfdf5', color: '#16a34a' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="orders-spend-card-value" style={{ color: '#15803d' }}>
            {lifetimeSpend.completedCount.toLocaleString()}
          </div>
          <div className="orders-spend-card-sub">
            <span>Fulfilled: <b>${lifetimeSpend.completedSpent.toFixed(3)}</b></span>
          </div>
        </div>

        {/* Card 4: Active & Refunded */}
        <div className="orders-spend-card">
          <div className="orders-spend-card-header">
            <span className="orders-spend-card-title">Active & Refunded</span>
            <div className="orders-spend-card-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <RefundIcon size={18} />
            </div>
          </div>
          <div className="orders-spend-card-value">
            {lifetimeSpend.processingCount + lifetimeSpend.inProgressCount + lifetimeSpend.pendingCount}{' '}
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
              Active / {lifetimeSpend.canceledCount} Canceled
            </span>
          </div>
          <div className="orders-spend-card-sub" style={{ color: '#16a34a' }}>
            <span>Refunded to wallet: <b>${lifetimeSpend.totalRefunded.toFixed(3)}</b></span>
          </div>
        </div>
      </div>

      {/* 2. Search Bar + Export Toolbar Row */}
      <div className="orders-export-toolbar-row">
        {/* Search input with search & refresh buttons */}
        <div className="orders-search-box-wrapper">
          <input
            type="text"
            className="form-input"
            placeholder="Search by Order ID, Service, Link..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setActiveSearch(searchInput);
            }}
            style={{ width: '100%' }}
          />
          <button
            className="btn-search"
            onClick={() => setActiveSearch(searchInput)}
            title="Search orders"
            style={{ flexShrink: 0 }}
          >
            <Search size={16} />
          </button>
          <button
            className="btn-search"
            onClick={() => fetchOrders()}
            disabled={isLoading}
            title="Refresh orders & update live status"
            style={{
              backgroundColor: '#162399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
        </div>

        {/* Export Data Actions */}
        <div className="orders-export-actions-wrapper">
          {/* Quick PDF button */}
          <button
            type="button"
            className="btn-quick-export"
            onClick={handleQuickExportPdf}
            title="Quick Download PDF of current view"
          >
            <FileText size={15} color="#dc2626" />
            <span>PDF</span>
          </button>

          {/* Quick Excel button */}
          <button
            type="button"
            className="btn-quick-export"
            onClick={handleQuickExportExcel}
            title="Quick Download Excel (.xlsx) of current view"
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Excel</span>
          </button>

          {/* Quick TXT button */}
          <button
            type="button"
            className="btn-quick-export"
            onClick={handleQuickExportTxt}
            title="Quick Download TXT report of current view"
          >
            <FileCode size={15} color="#2563eb" />
            <span>TXT</span>
          </button>

          {/* Main Full Export Button (opens Filter & Date/Time Range Modal) */}
          <button
            type="button"
            className="btn-export-main"
            onClick={() => setIsExportModalOpen(true)}
            title="Filter by Date Range, Custom Time, and Export All"
          >
            <Download size={15} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* 3. Status Filter Pills */}
      <div className="order-status-tabs">
        {statusTabs.map((tab) => {
          const isSelected = activeStatus.toLowerCase() === tab.label.toLowerCase();
          return (
            <button
              key={tab.label}
              className={`order-status-pill ${isSelected ? 'active' : ''}`}
              onClick={() => setActiveStatus(tab.label)}
            >
              {isSelected ? (
                <Check size={13} color="#ffffff" />
              ) : (
                <span className="status-square" style={{ backgroundColor: tab.color }} />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Orders Table */}
      <div className="services-table-wrapper">
        <table className="services-table">
          <thead>
            <tr>
              <th style={{ width: 85 }}>ID</th>
              <th style={{ width: 105 }}>Date</th>
              <th style={{ width: 340, minWidth: 300 }}>Link</th>
              <th style={{ width: 100 }}>Charge</th>
              <th style={{ width: 95 }}>Start count</th>
              <th style={{ width: 95 }}>Quantity</th>
              <th style={{ minWidth: 350, width: 380 }}>Service</th>
              <th style={{ width: 90 }}>Remains</th>
              <th style={{ width: 115 }}>Status</th>
              <th style={{ minWidth: 150, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isCanceled = order.status === 'CANCELED';
                const isRefunded = order.isRefunded || isCanceled;
                const refundAmt = order.refundAmount !== undefined ? order.refundAmount : (isCanceled ? order.charge : 0);

                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>#{order.id.slice(0, 7)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ minWidth: 300, maxWidth: 420 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <a
                          href={order.link.startsWith('http') ? order.link : `https://${order.link}`}
                          target="_blank"
                          rel="noreferrer"
                          title={order.link}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            background: 'rgba(2, 132, 199, 0.08)',
                            color: '#0284c7',
                            border: '1px solid rgba(2, 132, 199, 0.22)',
                            borderRadius: 6,
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                            maxWidth: 320,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.16)';
                            e.currentTarget.style.borderColor = '#0284c7';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(2, 132, 199, 0.22)';
                          }}
                        >
                          <ExternalLink size={12} style={{ flexShrink: 0 }} />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            {formatDisplayLink(order.link)}
                          </span>
                        </a>
                        <button
                          type="button"
                          title="Copy full link"
                          onClick={() => handleCopyLink(order.link, order.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            padding: 0,
                            borderRadius: 5,
                            border: '1px solid #e2e8f0',
                            background: copiedOrderId === order.id ? '#dcfce7' : '#ffffff',
                            color: copiedOrderId === order.id ? '#16a34a' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            if (copiedOrderId !== order.id) {
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.color = '#334155';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (copiedOrderId !== order.id) {
                              e.currentTarget.style.background = '#ffffff';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.color = '#64748b';
                            }
                          }}
                        >
                          {copiedOrderId === order.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>

                    {/* Charge Column with Transparent Refund Indication */}
                    <td style={{ fontWeight: 600 }}>
                      {isRefunded ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.84rem' }}>
                            ${order.charge.toFixed(3)}
                          </span>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              width: 'fit-content',
                            }}
                            title={`Refunded $${refundAmt.toFixed(3)} to wallet`}
                          >
                            Refunded
                          </span>
                        </div>
                      ) : order.status === 'PARTIAL' && order.refundAmount ? (
                        <div>
                          <span>${(order.charge - order.refundAmount).toFixed(3)}</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#16a34a' }}>
                            (Ref: ${order.refundAmount.toFixed(3)})
                          </span>
                        </div>
                      ) : (
                        <span>${order.charge.toFixed(3)}</span>
                      )}
                    </td>

                    <td>{order.startCount ?? '0'}</td>
                    <td>{order.quantity.toLocaleString()}</td>
                    <td style={{ minWidth: 350, maxWidth: 520, fontWeight: 500, lineHeight: 1.5 }}>
                      <span
                        onClick={() => onBuyService && onBuyService(order)}
                        style={{
                          cursor: onBuyService ? 'pointer' : 'default',
                          transition: 'color 0.2s',
                          display: 'inline-block',
                        }}
                        title={onBuyService ? `Click to buy again: ${order.serviceName}` : undefined}
                        onMouseEnter={(e) => {
                          if (onBuyService) e.currentTarget.style.color = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                          if (onBuyService) e.currentTarget.style.color = 'inherit';
                        }}
                      >
                        {order.serviceName}
                      </span>
                    </td>
                    <td>{order.remains ?? '0'}</td>
                    <td>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor:
                            order.status === 'COMPLETED'
                              ? '#dcfce7'
                              : order.status === 'PROCESSING' || order.status === 'IN_PROGRESS'
                              ? '#e0f2fe'
                              : order.status === 'PENDING'
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            order.status === 'COMPLETED'
                              ? '#15803d'
                              : order.status === 'PROCESSING' || order.status === 'IN_PROGRESS'
                              ? '#0369a1'
                              : order.status === 'PENDING'
                              ? '#b45309'
                              : '#b91c1c',
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn-order-shortcut"
                          title={`Buy again (Shortcut): ${order.serviceName}`}
                          onClick={() => {
                            if (onBuyService) {
                              onBuyService(order);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #162399 0%, #2563eb 100%)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 99, 235, 0.35)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.2)';
                          }}
                        >
                          <ShoppingCart size={12} />
                          <span>Buy</span>
                        </button>

                        {order.refill && (order.status === 'COMPLETED' || order.status === 'PARTIAL') && (
                          <button
                            className="btn-order-refill"
                            title="Request Refill guarantee from provider"
                            disabled={actingOrderId === order.id}
                            onClick={() => handleRefillOrder(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              padding: '5px 9px',
                              borderRadius: 6,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: actingOrderId === order.id ? 'not-allowed' : 'pointer',
                              opacity: actingOrderId === order.id ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <RotateCcw size={12} />
                            <span>Refill</span>
                          </button>
                        )}

                        {order.cancel && (order.status === 'PENDING' || order.status === 'PROCESSING' || order.status === 'IN_PROGRESS') && (
                          <button
                            className="btn-order-cancel"
                            title="Request order cancellation from provider"
                            disabled={actingOrderId === order.id}
                            onClick={() => handleCancelOrder(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              padding: '5px 9px',
                              borderRadius: 6,
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#dc2626',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: actingOrderId === order.id ? 'not-allowed' : 'pointer',
                              opacity: actingOrderId === order.id ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <XCircle size={12} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Comprehensive Order Export Modal */}
      <OrderExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        orders={allOrders.length > 0 ? allOrders : orders}
        username={user?.username}
      />
    </div>
  );
};
