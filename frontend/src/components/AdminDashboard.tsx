import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  RefreshCw,
  Percent,
  Lock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit3,
  Sliders,
  Database,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
  Plus,
  Minus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Server,
  Zap,
} from 'lucide-react';

interface ServiceItem {
  id: string;
  externalId: number;
  name: string;
  category: string;
  platform: string;
  originalRate: number;
  customRate: number;
  markupPercent: number;
  min: number;
  max: number;
  type: string;
  isActive: boolean;
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
  updatedAt?: string;
}

export const AdminDashboard: React.FC = () => {
  const { showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'services' | 'margins' | 'users' | 'provider' | 'logs'>('services');

  // Stats & Data
  const [stats, setStats] = useState<any>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Loading States
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters & Search for Services
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [sortOption, setSortOption] = useState<'id_asc' | 'id_desc' | 'rate_asc' | 'rate_desc' | 'profit_desc'>('id_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Multi-selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Edit Single Service Modal State
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [pricingMode, setPricingMode] = useState<'percentage' | 'fixed'>('percentage');
  const [modalMarkupPercent, setModalMarkupPercent] = useState<string>('30');
  const [modalFixedRate, setModalFixedRate] = useState<string>('1.00');
  const [modalIsActive, setModalIsActive] = useState<boolean>(true);
  const [isSavingService, setIsSavingService] = useState(false);

  // Batch Markup Tool State (Tab 2)
  const [batchGlobalMarkup, setBatchGlobalMarkup] = useState<string>('35');
  const [batchPlatform, setBatchPlatform] = useState<string>('TikTok');
  const [batchPlatformMarkup, setBatchPlatformMarkup] = useState<string>('45');
  const [batchFixedAdder, setBatchFixedAdder] = useState<string>('0.50');
  const [batchFixedPlatform, setBatchFixedPlatform] = useState<string>('All');
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);

  // User Balance Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('20.00');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('Promotional bonus credit');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);

  // Provider Settings State
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 1. Fetch High Level Analytics & Settings
  const fetchStatsAndMeta = async () => {
    setIsLoadingStats(true);
    try {
      const [statsRes, settingsRes, usersRes, auditRes] = await Promise.all([
        api.admin.getStats().catch(() => null),
        api.admin.getSettings().catch(() => null),
        api.admin.getAllUsers().catch(() => null),
        api.admin.getAuditLogs().catch(() => null),
      ]);

      if (statsRes?.success) setStats(statsRes.stats);
      if (settingsRes?.success) {
        setSettings(settingsRes.settings);
        setNewApiUrl(settingsRes.settings.smmfollows_api_url || '');
      }
      if (usersRes?.success) setUsers(usersRes.users || []);
      if (auditRes?.success) setAuditLogs(auditRes.logs || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading dashboard statistics', 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 2. Fetch All Services for Control
  const fetchServices = async () => {
    setIsLoadingServices(true);
    try {
      const res = await api.services.getServices({ activeOnly: false });
      if (res?.success) {
        setServices(res.services || []);
        setCategories(res.categories || []);
        setPlatforms(res.platforms || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading services catalog', 'error');
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchStatsAndMeta();
    fetchServices();
  }, []);

  // Filtered & Sorted Services
  const filteredServices = useMemo(() => {
    let result = [...services];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.externalId.toString().includes(q)
      );
    }

    // Platform
    if (filterPlatform !== 'All') {
      result = result.filter((s) => s.platform.toLowerCase() === filterPlatform.toLowerCase());
    }

    // Category
    if (filterCategory !== 'All') {
      result = result.filter((s) => s.category.toLowerCase().includes(filterCategory.toLowerCase()));
    }

    // Status
    if (filterStatus === 'active') {
      result = result.filter((s) => s.isActive);
    } else if (filterStatus === 'disabled') {
      result = result.filter((s) => !s.isActive);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'id_asc') return a.externalId - b.externalId;
      if (sortOption === 'id_desc') return b.externalId - a.externalId;
      if (sortOption === 'rate_asc') return a.customRate - b.customRate;
      if (sortOption === 'rate_desc') return b.customRate - a.customRate;
      if (sortOption === 'profit_desc') {
        const profitA = a.customRate - a.originalRate;
        const profitB = b.customRate - b.originalRate;
        return profitB - profitA;
      }
      return 0;
    });

    return result;
  }, [services, searchQuery, filterPlatform, filterCategory, filterStatus, sortOption]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredServices.length / pageSize) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPlatform, filterCategory, filterStatus, sortOption, pageSize]);

  // Toggle Single Service Active Status
  const handleToggleSingleStatus = async (service: ServiceItem) => {
    const nextState = !service.isActive;
    try {
      const res = await api.admin.updateService(service.id, { isActive: nextState });
      if (res?.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, isActive: nextState } : s))
        );
        showToast(`Service #${service.externalId} is now ${nextState ? 'ACTIVE' : 'DISABLED'}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update service status', 'error');
    }
  };

  // Open Edit Price & Profit Modal
  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setPricingMode('percentage');
    setModalMarkupPercent((service.markupPercent || 30).toString());
    setModalFixedRate(service.customRate.toFixed(4));
    setModalIsActive(service.isActive);
  };

  // Save Changes from Edit Modal
  const handleSaveModalService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    setIsSavingService(true);
    try {
      let payload: { customRate?: number; markupPercent?: number; isActive: boolean } = {
        isActive: modalIsActive,
      };

      if (pricingMode === 'percentage') {
        const pct = parseFloat(modalMarkupPercent);
        if (isNaN(pct) || pct < 0) {
          showToast('Please enter a valid positive markup percentage', 'error');
          setIsSavingService(false);
          return;
        }
        payload.markupPercent = pct;
        // Compute rate for instant optimistic update
        payload.customRate = Number((editingService.originalRate * (1 + pct / 100)).toFixed(4));
      } else {
        const rate = parseFloat(modalFixedRate);
        if (isNaN(rate) || rate < 0) {
          showToast('Please enter a valid selling price', 'error');
          setIsSavingService(false);
          return;
        }
        payload.customRate = rate;
      }

      const res = await api.admin.updateService(editingService.id, payload);
      if (res?.success) {
        showToast(`Pricing updated for #${editingService.externalId}!`, 'success');
        setServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? { ...s, ...res.service } : s))
        );
        setEditingService(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save service pricing', 'error');
    } finally {
      setIsSavingService(false);
    }
  };

  // Select / Deselect All on current page
  const handleToggleSelectAllPage = () => {
    const pageIds = paginatedServices.map((s) => s.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Select single item
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Status Update (Enable / Disable)
  const handleBulkStatusChange = async (enable: boolean) => {
    if (selectedIds.length === 0) return;
    setIsBulkActionLoading(true);
    try {
      const res = await api.admin.bulkUpdateStatus(selectedIds, enable);
      if (res?.success) {
        showToast(res.message || `Updated ${res.updatedCount} services!`, 'success');
        setServices((prev) =>
          prev.map((s) => (selectedIds.includes(s.id) ? { ...s, isActive: enable } : s))
        );
        setSelectedIds([]);
      }
    } catch (err: any) {
      showToast(err.message || 'Bulk status update failed', 'error');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Batch Update 1: Global Markup %
  const handleApplyGlobalMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(batchGlobalMarkup);
    if (isNaN(pct) || pct < 0) {
      showToast('Enter a valid percentage', 'error');
      return;
    }
    setIsApplyingBatch(true);
    try {
      const res = await api.admin.batchMarkup({ markupPercent: pct });
      if (res?.success) {
        showToast(res.message || `Applied +${pct}% to all services!`, 'success');
        await fetchServices();
        await fetchStatsAndMeta();
      }
    } catch (err: any) {
      showToast(err.message || 'Global markup failed', 'error');
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // Batch Update 2: Platform-specific Markup %
  const handleApplyPlatformMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(batchPlatformMarkup);
    if (isNaN(pct) || pct < 0) {
      showToast('Enter a valid percentage', 'error');
      return;
    }
    setIsApplyingBatch(true);
    try {
      const res = await api.admin.batchMarkup({
        markupPercent: pct,
        platform: batchPlatform,
      });
      if (res?.success) {
        showToast(res.message || `Applied +${pct}% to ${batchPlatform}!`, 'success');
        await fetchServices();
      }
    } catch (err: any) {
      showToast(err.message || 'Platform markup failed', 'error');
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // Batch Update 3: Fixed Profit Adder (+$X.XX)
  const handleApplyFixedAdder = async (e: React.FormEvent) => {
    e.preventDefault();
    const adder = parseFloat(batchFixedAdder);
    if (isNaN(adder) || adder < 0) {
      showToast('Enter a valid dollar increase', 'error');
      return;
    }
    setIsApplyingBatch(true);
    try {
      const res = await api.admin.batchMarkup({
        fixedIncrease: adder,
        platform: batchFixedPlatform !== 'All' ? batchFixedPlatform : undefined,
      });
      if (res?.success) {
        showToast(res.message || `Added +$${adder.toFixed(2)} margin!`, 'success');
        await fetchServices();
      }
    } catch (err: any) {
      showToast(err.message || 'Fixed adder failed', 'error');
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // Resync from SMMFollows API
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.services.syncFromProvider();
      if (res?.success) {
        showToast(res.message || 'Catalog synced from SMMFollows!', 'success');
        await fetchServices();
        await fetchStatsAndMeta();
      }
    } catch (err: any) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Adjust User Balance
  const handleSaveUserBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const num = parseFloat(adjustAmount);
    if (isNaN(num) || num <= 0) {
      showToast('Enter a positive adjustment amount', 'error');
      return;
    }
    const finalAmount = adjustType === 'add' ? num : -num;
    setIsAdjustingBalance(true);
    try {
      const res = await api.admin.adjustBalance(selectedUser.id, finalAmount, adjustReason);
      if (res?.success) {
        showToast(res.message || 'Balance adjusted successfully!', 'success');
        setSelectedUser(null);
        await fetchStatsAndMeta();
      }
    } catch (err: any) {
      showToast(err.message || 'Balance adjustment failed', 'error');
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  // Toggle User Status (Active / Suspended)
  const handleToggleUserStatus = async (user: any) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.admin.toggleStatus(user.id, nextStatus);
      if (res?.success) {
        showToast(`User status set to ${nextStatus}`, 'success');
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  // Save Provider Key Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await api.admin.updateSettings({
        apiKey: newApiKey.trim() || undefined,
        apiUrl: newApiUrl.trim() || undefined,
      });
      if (res?.success) {
        showToast('Provider API settings encrypted and saved!', 'success');
        setNewApiKey('');
        await fetchStatsAndMeta();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="admin-wrapper">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-title">
          <h2>
            <ShieldCheck size={26} color="#162399" />
            Admin Control Center
            <span className="admin-badge-enterprise">ENTERPRISE</span>
          </h2>
          <p>
            Complete control over all 7,500+ services, customizable profit margins & fixed prices, catalog visibility, and provider integrations.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-admin-secondary"
            onClick={() => {
              fetchStatsAndMeta();
              fetchServices();
            }}
            disabled={isLoadingStats || isLoadingServices}
          >
            <RefreshCw size={14} className={isLoadingStats || isLoadingServices ? 'spin' : ''} />
            Refresh Data
          </button>

          <button
            type="button"
            className="btn-admin-primary"
            onClick={handleForceSync}
            disabled={isSyncing}
          >
            <Zap size={15} className={isSyncing ? 'spin' : ''} />
            {isSyncing ? 'Syncing Catalog...' : 'Force Sync SMMFollows'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        {/* Total Sold Volume */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Volume Sold</span>
            <div className="admin-kpi-icon blue"><DollarSign size={20} /></div>
          </div>
          <div className="admin-kpi-value">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
          <div className="admin-kpi-sub">Lifetime customer orders</div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="admin-kpi-card highlight">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Gross Resale Profit</span>
            <div className="admin-kpi-icon emerald"><TrendingUp size={20} /></div>
          </div>
          <div className="admin-kpi-value" style={{ color: '#16a34a' }}>
            ${stats?.estimatedProfit?.toFixed(2) || '0.00'}
          </div>
          <div className="admin-kpi-sub">Total profit earned from margins</div>
        </div>

        {/* Total Platform Orders */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Platform Orders</span>
            <div className="admin-kpi-icon purple"><ShoppingBag size={20} /></div>
          </div>
          <div className="admin-kpi-value">{stats?.totalOrders || 0}</div>
          <div className="admin-kpi-sub">
            {stats?.orderCounts?.completed || 0} completed · {stats?.orderCounts?.processing || 0} active
          </div>
        </div>

        {/* SMMFollows Provider Live Balance */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">SMMFollows Live Balance</span>
            <div className="admin-kpi-icon amber"><Server size={20} /></div>
          </div>
          <div className="admin-kpi-value" style={{ color: '#d97706' }}>
            ${stats?.provider?.balance || '0.00'} USD
          </div>
          <div className="admin-kpi-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
            API Connected & Healthy
          </div>
        </div>

        {/* Active Catalog Services */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Controlled Services</span>
            <div className="admin-kpi-icon rose"><Database size={20} /></div>
          </div>
          <div className="admin-kpi-value">{services.length || '7,568'}</div>
          <div className="admin-kpi-sub">
            {services.filter((s) => s.isActive).length} active · {services.filter((s) => !s.isActive).length} disabled
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="admin-tabs-bar">
        <button
          className={`admin-tab-item ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <Sliders size={16} />
          <span>Services & Price Control</span>
          <span className="admin-tab-counter">{services.length}</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'margins' ? 'active' : ''}`}
          onClick={() => setActiveTab('margins')}
        >
          <Percent size={16} />
          <span>Batch Margins & Markups</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>User Accounts & Balances</span>
          <span className="admin-tab-counter">{users.length}</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'provider' ? 'active' : ''}`}
          onClick={() => setActiveTab('provider')}
        >
          <Lock size={16} />
          <span>Provider API & Security</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Activity size={16} />
          <span>Audit Ledger</span>
          <span className="admin-tab-counter">{auditLogs.length}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SERVICES & PRICE CONTROL (PRIMARY)
          ========================================================================= */}
      {activeTab === 'services' && (
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h3>
                <Sliders size={18} color="#162399" />
                Service Catalog & Dynamic Pricing Control
              </h3>
              <p>
                Configure profit percentage margins or set exact fixed selling prices for individual services, or toggle service visibility.
              </p>
            </div>

            {/* Quick Bulk Actions if items selected */}
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f9ff', padding: '6px 12px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369a1' }}>
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  className="btn-admin-secondary btn-admin-sm"
                  onClick={() => handleBulkStatusChange(true)}
                  disabled={isBulkActionLoading}
                >
                  <Eye size={13} color="#16a34a" /> Enable
                </button>
                <button
                  type="button"
                  className="btn-admin-secondary btn-admin-sm"
                  onClick={() => handleBulkStatusChange(false)}
                  disabled={isBulkActionLoading}
                >
                  <EyeOff size={13} color="#e11d48" /> Disable
                </button>
                <button
                  type="button"
                  className="btn-admin-secondary btn-admin-sm"
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="admin-panel-body">
            {/* Filter & Search Bar */}
            <div className="admin-filter-bar">
              {/* Search Box */}
              <div className="admin-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by ID (e.g. 124) or service name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 10, top: 11, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Platform Selector */}
              <select
                className="admin-select"
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <option value="All">All Platforms ({services.length})</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Category Selector */}
              <select
                className="admin-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.length > 32 ? c.substring(0, 32) + '...' : c}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="admin-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>

              {/* Sort By */}
              <select
                className="admin-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
              >
                <option value="id_asc">ID: Low to High</option>
                <option value="id_desc">ID: High to Low</option>
                <option value="rate_asc">Selling Price: Low to High</option>
                <option value="rate_desc">Selling Price: High to Low</option>
                <option value="profit_desc">Highest Profit Margin</option>
              </select>

              {/* Page Size */}
              <select
                className="admin-select"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ minWidth: 90 }}
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            {/* Services Table */}
            {isLoadingServices ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
                <p>Loading full service catalog...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <AlertCircle size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600 }}>No services match your filters</p>
                <p style={{ fontSize: '0.84rem' }}>Try clearing your search keyword or selecting "All Platforms"</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={handleToggleSelectAllPage}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                        >
                          {paginatedServices.length > 0 &&
                          paginatedServices.every((s) => selectedIds.includes(s.id)) ? (
                            <CheckSquare size={16} color="#162399" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </th>
                      <th style={{ width: 75 }}>ID</th>
                      <th>Service Name & Platform</th>
                      <th style={{ width: 130 }}>Provider Wholesale</th>
                      <th style={{ width: 140 }}>Profit / Margin</th>
                      <th style={{ width: 130 }}>Selling Price</th>
                      <th style={{ width: 90, textAlign: 'center' }}>Status</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedServices.map((service) => {
                      const isSelected = selectedIds.includes(service.id);
                      const profitDollar = service.customRate - service.originalRate;
                      const platformKey = service.platform.toLowerCase();

                      return (
                        <tr
                          key={service.id}
                          className={`${isSelected ? 'selected' : ''} ${!service.isActive ? 'row-disabled' : ''}`}
                        >
                          {/* Checkbox */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(service.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                            >
                              {isSelected ? <CheckSquare size={16} color="#162399" /> : <Square size={16} />}
                            </button>
                          </td>

                          {/* ID */}
                          <td>
                            <span className="service-id-badge">#{service.externalId}</span>
                          </td>

                          {/* Title & Platform */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span
                                className={`platform-pill-badge ${
                                  ['instagram', 'tiktok', 'youtube', 'telegram', 'facebook', 'twitter', 'spotify', 'discord'].includes(platformKey)
                                    ? platformKey
                                    : 'other'
                                }`}
                              >
                                {service.platform}
                              </span>
                              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                                {service.category}
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.35 }}>
                              {service.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 3 }}>
                              Min: {service.min?.toLocaleString()} · Max: {service.max?.toLocaleString()}
                            </div>
                          </td>

                          {/* Provider Cost */}
                          <td>
                            <div className="price-cost">${service.originalRate.toFixed(4)}</div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Wholesale / 1k</span>
                          </td>

                          {/* Profit / Margin */}
                          <td>
                            <span className={`margin-pill ${profitDollar > 0 ? 'positive' : 'neutral'}`}>
                              +{service.markupPercent?.toFixed(1) || '0.0'}%
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: 3 }}>
                              +${profitDollar.toFixed(4)} / 1k
                            </div>
                          </td>

                          {/* Selling Price */}
                          <td>
                            <div className="price-selling">${service.customRate.toFixed(4)}</div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>User Pays / 1k</span>
                          </td>

                          {/* Status Switch */}
                          <td style={{ textAlign: 'center' }}>
                            <label className="admin-switch" title={service.isActive ? 'Active on platform' : 'Disabled / Hidden'}>
                              <input
                                type="checkbox"
                                checked={service.isActive}
                                onChange={() => handleToggleSingleStatus(service)}
                              />
                              <span className="admin-switch-slider"></span>
                            </label>
                          </td>

                          {/* Edit Action Button */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-admin-secondary btn-admin-sm"
                              onClick={() => handleOpenEditModal(service)}
                              title="Set profit margin percentage or fixed selling price"
                            >
                              <Edit3 size={13} color="#162399" />
                              Edit Price
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredServices.length > 0 && (
              <div className="admin-pagination">
                <div className="admin-pagination-info">
                  Showing {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, filteredServices.length)} of{' '}
                  <strong>{filteredServices.length}</strong> services
                </div>

                <div className="admin-pagination-btns">
                  <button
                    type="button"
                    className="admin-page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span style={{ padding: '0 8px', fontSize: '0.84rem', fontWeight: 600, color: '#475569' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="admin-page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: BATCH MARGINS & GLOBAL MARKUPS
          ========================================================================= */}
      {activeTab === 'margins' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
          {/* Tool 1: Global Percentage Markup */}
          <div className="admin-panel-card">
            <div className="admin-panel-header">
              <h3><Percent size={18} color="#162399" /> 1. Global Percentage Profit Margin</h3>
            </div>
            <div className="admin-panel-body">
              <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 18 }}>
                Recalculate selling prices across <strong>ALL 7,500+ services</strong> using a standard profit margin percentage on top of SMMFollows wholesale rates.
              </p>

              <form onSubmit={handleApplyGlobalMarkup}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Global Profit Margin (%)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100%', height: 42, padding: '8px 30px 8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.92rem' }}
                      value={batchGlobalMarkup}
                      onChange={(e) => setBatchGlobalMarkup(e.target.value)}
                      min={0}
                      max={1000}
                      step={1}
                      required
                    />
                    <span style={{ position: 'absolute', right: 12, top: 11, color: '#94a3b8', fontWeight: 700 }}>%</span>
                  </div>
                </div>

                {/* Example Preview Box */}
                <div className="calc-preview-card" style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    MARGIN CALCULATION EXAMPLE
                  </div>
                  <div className="calc-row">
                    <span>Wholesale Cost:</span>
                    <span>$1.0000 / 1k</span>
                  </div>
                  <div className="calc-row">
                    <span>Profit Margin:</span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>+{batchGlobalMarkup}%</span>
                  </div>
                  <div className="calc-row total">
                    <span>Customer Selling Price:</span>
                    <span>${(1 * (1 + (parseFloat(batchGlobalMarkup) || 0) / 100)).toFixed(4)} / 1k</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-admin-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isApplyingBatch}
                >
                  <Percent size={16} />
                  {isApplyingBatch ? 'Applying to 7,500+ Services...' : `Apply +${batchGlobalMarkup}% Across Entire Catalog`}
                </button>
              </form>
            </div>
          </div>

          {/* Tool 2: Platform-Specific Percentage Markup */}
          <div className="admin-panel-card">
            <div className="admin-panel-header">
              <h3><Sliders size={18} color="#0284c7" /> 2. Platform-Specific Margin</h3>
            </div>
            <div className="admin-panel-body">
              <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 18 }}>
                Apply tailored profit margins for specific platforms (e.g. higher margin on TikTok, lower on Instagram).
              </p>

              <form onSubmit={handleApplyPlatformMarkup}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Select Target Platform
                  </label>
                  <select
                    className="admin-select"
                    style={{ width: '100%' }}
                    value={batchPlatform}
                    onChange={(e) => setBatchPlatform(e.target.value)}
                  >
                    {platforms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Markup for {batchPlatform} (%)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100%', height: 42, padding: '8px 30px 8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.92rem' }}
                      value={batchPlatformMarkup}
                      onChange={(e) => setBatchPlatformMarkup(e.target.value)}
                      min={0}
                      max={1000}
                      step={1}
                      required
                    />
                    <span style={{ position: 'absolute', right: 12, top: 11, color: '#94a3b8', fontWeight: 700 }}>%</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-admin-primary"
                  style={{ width: '100%', justifyContent: 'center', background: '#0284c7' }}
                  disabled={isApplyingBatch}
                >
                  <Sliders size={16} />
                  {isApplyingBatch ? 'Applying...' : `Set +${batchPlatformMarkup}% on all ${batchPlatform} Services`}
                </button>
              </form>
            </div>
          </div>

          {/* Tool 3: Fixed Dollar Margin Adder */}
          <div className="admin-panel-card">
            <div className="admin-panel-header">
              <h3><DollarSign size={18} color="#16a34a" /> 3. Fixed Dollar Profit Adder</h3>
            </div>
            <div className="admin-panel-body">
              <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 18 }}>
                Add a flat dollar amount profit (e.g. +$0.50 per 1,000) directly on top of wholesale cost.
              </p>

              <form onSubmit={handleApplyFixedAdder}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Target Platform
                  </label>
                  <select
                    className="admin-select"
                    style={{ width: '100%' }}
                    value={batchFixedPlatform}
                    onChange={(e) => setBatchFixedPlatform(e.target.value)}
                  >
                    <option value="All">All Platforms</option>
                    {platforms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Fixed Profit Increase ($ per 1,000 units)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8', fontWeight: 700 }}>$</span>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100%', height: 42, padding: '8px 12px 8px 28px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.92rem' }}
                      value={batchFixedAdder}
                      onChange={(e) => setBatchFixedAdder(e.target.value)}
                      min={0}
                      max={100}
                      step={0.01}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-admin-primary"
                  style={{ width: '100%', justifyContent: 'center', background: '#16a34a' }}
                  disabled={isApplyingBatch}
                >
                  <DollarSign size={16} />
                  {isApplyingBatch ? 'Applying...' : `Add +$${batchFixedAdder} Profit Adder`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: USER ACCOUNTS & BALANCES
          ========================================================================= */}
      {activeTab === 'users' && (
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h3><Users size={18} color="#162399" /> Registered User Accounts & Balances</h3>
              <p>Manage customer wallets, credit bonuses, or suspend accounts.</p>
            </div>
          </div>

          <div className="admin-panel-body">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Wallet Balance</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.username}</strong>
                      </td>
                      <td style={{ color: '#64748b' }}>{u.email}</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: u.role === 'ADMIN' ? '#e0f2fe' : '#f1f5f9',
                            color: u.role === 'ADMIN' ? '#0369a1' : '#475569',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#16a34a', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                          ${u.balance?.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: u.status === 'active' ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.80rem' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-admin-secondary btn-admin-sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setAdjustAmount('25.00');
                              setAdjustType('add');
                            }}
                          >
                            <DollarSign size={13} color="#16a34a" />
                            Adjust Balance
                          </button>

                          {u.role !== 'ADMIN' && (
                            <button
                              type="button"
                              className="btn-admin-secondary btn-admin-sm"
                              onClick={() => handleToggleUserStatus(u)}
                            >
                              {u.status === 'active' ? (
                                <span style={{ color: '#e11d48' }}>Suspend</span>
                              ) : (
                                <span style={{ color: '#16a34a' }}>Activate</span>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PROVIDER API & SECURITY
          ========================================================================= */}
      {activeTab === 'provider' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
          {/* SMMFollows API Connection Card */}
          <div className="admin-panel-card">
            <div className="admin-panel-header">
              <h3><Server size={18} color="#162399" /> SMMFollows Provider Connection</h3>
            </div>
            <div className="admin-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                  <span style={{ color: '#64748b' }}>Provider:</span>
                  <strong>SMMFollows.com API v2</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                  <span style={{ color: '#64748b' }}>API Endpoint:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {settings?.smmfollows_api_url}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                  <span style={{ color: '#64748b' }}>Active Key:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {settings?.smmfollows_api_key_masked || '••••••••••••••••••••'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                  <span style={{ color: '#64748b' }}>Key Encryption:</span>
                  <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Lock size={12} /> AES-256-GCM Secure Vault
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
                  <span style={{ color: '#64748b' }}>Live Provider Balance:</span>
                  <strong style={{ color: '#d97706', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
                    ${stats?.provider?.balance || '0.00'} USD
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Update API Key / URL Form */}
          <div className="admin-panel-card">
            <div className="admin-panel-header">
              <h3><Lock size={18} color="#0284c7" /> Update Provider Credentials</h3>
            </div>
            <div className="admin-panel-body">
              <form onSubmit={handleSaveSettings}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    SMMFollows API Endpoint URL
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    style={{ width: '100%', height: 40, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                    value={newApiUrl}
                    onChange={(e) => setNewApiUrl(e.target.value)}
                    placeholder="https://smmfollows.com/api/v2"
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    New SMMFollows API Key (leave empty to keep current)
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    style={{ width: '100%', height: 40, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Enter new API key..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn-admin-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isSavingSettings}
                >
                  <Lock size={15} />
                  {isSavingSettings ? 'Encrypting & Saving...' : 'Save & Encrypt Credentials'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: SECURITY AUDIT LEDGER
          ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3><Activity size={18} color="#162399" /> Administrative Action & Audit Ledger</h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Immutable record of pricing changes, balance adjustments, and logins.
            </span>
          </div>

          <div className="admin-panel-body">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>Operator</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: '#64748b', fontSize: '0.80rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#f1f5f9',
                            color: '#334155',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: '#1e293b' }}>{log.details}</td>
                      <td>
                        <strong>{log.username || 'System'}</strong>
                      </td>
                      <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {log.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: EDIT PRICE & PROFIT FOR A SINGLE SERVICE
          ========================================================================= */}
      {editingService && (
        <div className="admin-modal-backdrop" onClick={() => setEditingService(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Edit Price & Profit Margin</h3>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModalService}>
              <div className="admin-modal-body">
                {/* Service Details Header */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="service-id-badge">#{editingService.externalId}</span>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{editingService.platform} · {editingService.category}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                    {editingService.name}
                  </div>
                </div>

                {/* Wholesale Cost Callout */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #dbeafe', marginBottom: 18 }}>
                  <span style={{ fontSize: '0.84rem', color: '#1e40af', fontWeight: 600 }}>
                    Provider Wholesale Cost:
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: '#1e3a8a' }}>
                    ${editingService.originalRate.toFixed(4)} / 1k
                  </span>
                </div>

                {/* Pricing Mode Switcher */}
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                  Choose Pricing Calculation Method:
                </label>
                <div className="pricing-mode-tabs">
                  <button
                    type="button"
                    className={`pricing-mode-btn ${pricingMode === 'percentage' ? 'active' : ''}`}
                    onClick={() => setPricingMode('percentage')}
                  >
                    <Percent size={15} />
                    Profit Percentage (%)
                  </button>
                  <button
                    type="button"
                    className={`pricing-mode-btn ${pricingMode === 'fixed' ? 'active' : ''}`}
                    onClick={() => setPricingMode('fixed')}
                  >
                    <DollarSign size={15} />
                    Fixed Selling Price ($)
                  </button>
                </div>

                {/* Mode 1: Percentage Input */}
                {pricingMode === 'percentage' && (
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                      Profit Markup Percentage (%)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '100%', height: 42, padding: '8px 30px 8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.96rem' }}
                        value={modalMarkupPercent}
                        onChange={(e) => setModalMarkupPercent(e.target.value)}
                        min={0}
                        max={1000}
                        step={0.5}
                        required
                      />
                      <span style={{ position: 'absolute', right: 12, top: 11, color: '#94a3b8', fontWeight: 700 }}>%</span>
                    </div>
                  </div>
                )}

                {/* Mode 2: Fixed Selling Price Input */}
                {pricingMode === 'fixed' && (
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                      Fixed Selling Price for Customers ($ per 1,000 units)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8', fontWeight: 700 }}>$</span>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '100%', height: 42, padding: '8px 12px 8px 26px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.96rem' }}
                        value={modalFixedRate}
                        onChange={(e) => setModalFixedRate(e.target.value)}
                        min={0}
                        max={1000}
                        step={0.0001}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Live Profit Preview Box */}
                {(() => {
                  let finalSelling = 0;
                  let finalProfit = 0;
                  let finalPct = 0;

                  if (pricingMode === 'percentage') {
                    const pct = parseFloat(modalMarkupPercent) || 0;
                    finalSelling = editingService.originalRate * (1 + pct / 100);
                    finalProfit = finalSelling - editingService.originalRate;
                    finalPct = pct;
                  } else {
                    const fixed = parseFloat(modalFixedRate) || 0;
                    finalSelling = fixed;
                    finalProfit = fixed - editingService.originalRate;
                    finalPct =
                      editingService.originalRate > 0
                        ? (finalProfit / editingService.originalRate) * 100
                        : 0;
                  }

                  return (
                    <div className="calc-preview-card" style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                        LIVE PRICE & PROFIT BREAKDOWN
                      </div>
                      <div className="calc-row">
                        <span>Provider Cost:</span>
                        <span>${editingService.originalRate.toFixed(4)} / 1k</span>
                      </div>
                      <div className="calc-row">
                        <span>Your Resale Profit:</span>
                        <span style={{ color: finalProfit >= 0 ? '#16a34a' : '#e11d48', fontWeight: 700 }}>
                          +${finalProfit.toFixed(4)} / 1k ({finalPct >= 0 ? '+' : ''}{finalPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="calc-row total">
                        <span>Customer Selling Price:</span>
                        <span>${finalSelling.toFixed(4)} / 1k</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Service Visibility Switch */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                      Service Visibility Status
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {modalIsActive ? 'Visible & orderable by all users' : 'Hidden from customers'}
                    </div>
                  </div>
                  <label className="admin-switch">
                    <input
                      type="checkbox"
                      checked={modalIsActive}
                      onChange={(e) => setModalIsActive(e.target.checked)}
                    />
                    <span className="admin-switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setEditingService(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={isSavingService}
                >
                  {isSavingService ? 'Saving...' : 'Save Price & Margin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: USER BALANCE ADJUSTMENT
          ========================================================================= */}
      {selectedUser && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Adjust User Wallet Balance</h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUserBalance}>
              <div className="admin-modal-body">
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedUser.username}</div>
                  <div style={{ fontSize: '0.80rem', color: '#64748b' }}>{selectedUser.email}</div>
                  <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                    Current Balance:{' '}
                    <strong style={{ color: '#16a34a', fontFamily: 'var(--font-mono)' }}>
                      ${selectedUser.balance?.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Adjustment Action
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      className={`pricing-mode-btn ${adjustType === 'add' ? 'active' : ''}`}
                      onClick={() => setAdjustType('add')}
                      style={{ color: adjustType === 'add' ? '#16a34a' : '#64748b' }}
                    >
                      <Plus size={15} /> Add Credit
                    </button>
                    <button
                      type="button"
                      className={`pricing-mode-btn ${adjustType === 'deduct' ? 'active' : ''}`}
                      onClick={() => setAdjustType('deduct')}
                      style={{ color: adjustType === 'deduct' ? '#e11d48' : '#64748b' }}
                    >
                      <Minus size={15} /> Deduct Credit
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '100%', height: 40, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    min={0.01}
                    step={0.01}
                    required
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Adjustment Reason / Note (Logged in Audit Trail)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', height: 40, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Promotional deposit bonus, Manual refund..."
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setSelectedUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={isAdjustingBalance}
                >
                  {isAdjustingBalance ? 'Applying...' : 'Confirm Balance Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
