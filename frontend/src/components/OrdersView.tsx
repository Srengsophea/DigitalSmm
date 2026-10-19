import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OrderItem } from './OrdersHistory';
import { Search, Check, RefreshCw, ShoppingCart, RotateCcw, XCircle } from 'lucide-react';

export interface OrdersViewProps {
  onBuyService?: (order: OrderItem) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onBuyService }) => {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

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
      const data = await api.orders.getMyOrders({
        status: formatStatusForApi(activeStatus),
        search: activeSearch.trim() || undefined,
      });
      if (data.success) {
        setOrders(data.orders || []);
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

  useEffect(() => {
    fetchOrders();
  }, [activeStatus, activeSearch]);

  return (
    <div>
      {/* Search Input Bar matching Screenshot 3 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveSearch(searchInput);
          }}
          style={{ maxWidth: 880 }}
        />
        <button
          className="btn-search"
          onClick={() => setActiveSearch(searchInput)}
          title="Search orders"
        >
          <Search size={16} />
        </button>
        <button
          className="btn-search"
          onClick={() => fetchOrders()}
          disabled={isLoading}
          title="Refresh orders & update live status"
          style={{ backgroundColor: '#162399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
        </button>
      </div>

      {/* Status Filter Pills matching Screenshot 3 */}
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
                <span
                  className="status-square"
                  style={{ backgroundColor: tab.color }}
                />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Orders Table matching Screenshot 3 */}
      <div className="services-table-wrapper">
        <table className="services-table">
          <thead>
            <tr>
              <th style={{ width: 85 }}>ID</th>
              <th style={{ width: 140 }}>Date</th>
              <th>Link</th>
              <th style={{ width: 100 }}>Charge</th>
              <th style={{ width: 110 }}>Start count</th>
              <th style={{ width: 100 }}>Quantity</th>
              <th>Service</th>
              <th style={{ width: 100 }}>Remains</th>
              <th style={{ width: 120 }}>Status</th>
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
              orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>#{order.id.slice(0, 7)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>
                    <a
                      href={order.link.startsWith('http') ? order.link : `https://${order.link}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#0284c7' }}
                    >
                      {order.link}
                    </a>
                  </td>
                  <td style={{ fontWeight: 600 }}>${order.charge.toFixed(3)}</td>
                  <td>{order.startCount ?? '0'}</td>
                  <td>{order.quantity.toLocaleString()}</td>
                  <td style={{ fontWeight: 500 }}>
                    <span
                      onClick={() => onBuyService && onBuyService(order)}
                      style={{
                        cursor: onBuyService ? 'pointer' : 'default',
                        transition: 'color 0.2s',
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
