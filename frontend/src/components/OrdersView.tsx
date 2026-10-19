import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OrderItem } from './OrdersHistory';
import { Search, Check, RefreshCw } from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const statusTabs = [
    { label: 'All', color: '#162399', isSolid: true },
    { label: 'Pending', color: '#f59e0b', isSolid: false },
    { label: 'In progress', color: '#3b82f6', isSolid: false },
    { label: 'Completed', color: '#10b981', isSolid: false },
    { label: 'Partial', color: '#eab308', isSolid: false },
    { label: 'Processing', color: '#06b6d4', isSolid: false },
    { label: 'Canceled', color: '#ef4444', isSolid: false },
  ];

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.orders.getMyOrders({
        status: activeStatus !== 'All' ? activeStatus.toUpperCase() : undefined,
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

  useEffect(() => {
    fetchOrders();
  }, [activeStatus, activeSearch]);

  const handleSyncStatus = async (orderId: string) => {
    if (syncingId === orderId) return;
    setSyncingId(orderId);
    try {
      const res = await api.orders.checkLiveStatus(orderId);
      if (res.success && res.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...res.order } : o)));
        const rawStatus = (res.order.status || 'Updated').toUpperCase();
        const toastType = rawStatus === 'COMPLETED' ? 'success' : 'info';
        showToast(`Order #${orderId.slice(0, 7)} status: ${rawStatus}`, toastType);
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
    } finally {
      setSyncingId(null);
    }
  };

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
        >
          <Search size={16} />
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
              <th style={{ width: 60, textAlign: 'right' }}>Sync</th>
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
                  <td style={{ fontWeight: 500 }}>{order.serviceName}</td>
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
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="topbar-circle-btn"
                      style={{ width: 28, height: 28 }}
                      title="Sync live order status"
                      disabled={syncingId === order.id}
                      onClick={() => handleSyncStatus(order.id)}
                    >
                      <RefreshCw size={12} className={syncingId === order.id ? 'spin' : ''} />
                    </button>
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
