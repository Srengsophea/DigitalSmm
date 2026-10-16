import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  History,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
} from 'lucide-react';

export interface OrderItem {
  id: string;
  externalOrderId?: string | number;
  serviceName: string;
  category: string;
  platform: string;
  link: string;
  quantity: number;
  charge: number;
  status: 'PENDING' | 'PROCESSING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'CANCELED';
  startCount?: string | number;
  remains?: string | number;
  createdAt: string;
}

export const OrdersHistory: React.FC = () => {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.orders.getMyOrders({
        status: statusFilter,
        search: search.trim() || undefined,
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
  }, [statusFilter]);

  const checkLiveStatus = async (orderId: string) => {
    if (checkingOrderId === orderId) return;
    setCheckingOrderId(orderId);
    try {
      const res = await api.orders.checkLiveStatus(orderId);
      if (res.success && res.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...res.order } : o))
        );
        const rawStatus = (res.order.status || 'Updated').toUpperCase();
        showToast(`Order #${orderId.slice(0, 7)} status: ${rawStatus}`, 'info');
      } else {
        showToast(res.error || 'Failed to check status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error checking status', 'error');
    } finally {
      setCheckingOrderId(null);
    }
  };

  const getStatusBadge = (status: OrderItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="badge badge-cyan">
            <RefreshCw size={12} className="spin" style={{ animation: 'spin 2s linear infinite' }} /> In Progress
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="badge badge-primary">
            <Clock size={12} /> Processing
          </span>
        );
      case 'PENDING':
        return (
          <span className="badge badge-warning">
            <Clock size={12} /> Pending
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="badge badge-warning">
            <AlertTriangle size={12} /> Partial
          </span>
        );
      case 'CANCELED':
        return (
          <span className="badge badge-danger">
            <XCircle size={12} /> Canceled / Refunded
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '30px 24px 60px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>Order History & Live Tracking</h2>
          <p style={{ marginTop: 4 }}>
            Monitor real-time progress and dispatch status of your SMMFollows provider orders.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={fetchOrders} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          Refresh List
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['ALL', 'PROCESSING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'].map((st) => (
          <button
            key={st}
            className={`chip-btn ${statusFilter === st ? 'active' : ''}`}
            onClick={() => setStatusFilter(st)}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Provider Ref</th>
              <th>Service & Target Link</th>
              <th>Quantity</th>
              <th>Charge</th>
              <th>Live Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Sync</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={24} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: 8 }}>Loading orders...</p>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <History size={32} color="var(--text-muted)" />
                  <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>No orders found.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  {/* Internal ID */}
                  <td>
                    <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                      #{order.id.slice(0, 8)}
                    </span>
                  </td>

                  {/* SMMFollows Provider ID */}
                  <td>
                    {order.externalOrderId ? (
                      <span className="badge badge-cyan" style={{ fontFamily: 'var(--font-mono)' }}>
                        #{order.externalOrderId}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>

                  {/* Service & Link */}
                  <td style={{ maxWidth: 320 }}>
                    <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.88rem' }}>
                      {order.serviceName}
                    </div>
                    <a
                      href={order.link.startsWith('http') ? order.link : `https://${order.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--primary-light)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 2,
                        wordBreak: 'break-all',
                      }}
                    >
                      {order.link}
                      <ExternalLink size={11} />
                    </a>
                  </td>

                  {/* Quantity */}
                  <td>
                    <strong>{order.quantity.toLocaleString()}</strong>
                  </td>

                  {/* Charge */}
                  <td>
                    <span style={{ color: 'var(--cyan-light)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      ${order.charge.toFixed(2)}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td>{getStatusBadge(order.status)}</td>

                  {/* Date */}
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  {/* Action Sync */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Check live status from SMMFollows provider"
                      disabled={checkingOrderId === order.id}
                      onClick={() => checkLiveStatus(order.id)}
                    >
                      <RefreshCw size={13} className={checkingOrderId === order.id ? 'spin' : ''} />
                      Sync
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
