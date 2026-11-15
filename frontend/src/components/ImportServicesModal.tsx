import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DownloadCloud,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Sliders,
  DollarSign,
  Layers,
  Hash,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface ImportServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportServicesModal: React.FC<ImportServicesModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { theme } = useTheme();
  const { showToast } = useAuth();
  const isDark = theme === 'dark';

  // Providers list
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('smmpwr');
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  // Raw services from selected provider
  const [rawServices, setRawServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingRawServices, setIsLoadingRawServices] = useState(false);

  // Tabs / Modes
  const [mode, setMode] = useState<'catalog' | 'singleId'>('catalog');

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selection
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());

  // Pricing configuration
  const [markupPercent, setMarkupPercent] = useState<string>('30');
  const [fixedIncrease, setFixedIncrease] = useState<string>('0.00');

  // Single ID mode state
  const [manualIdInput, setManualIdInput] = useState<string>('');
  const [foundSingleService, setFoundSingleService] = useState<any | null>(null);

  // Import loading state
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Load providers on open
  useEffect(() => {
    if (!isOpen) return;
    loadProviders();
  }, [isOpen]);

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const res = await api.admin.getProviders();
      if (res.success && res.providers) {
        setProviders(res.providers);
        // Default to smmpwr or first provider
        const hasSmmpwr = res.providers.some((p: any) => p.id === 'smmpwr');
        const defaultId = hasSmmpwr ? 'smmpwr' : res.providers[0]?.id || 'smmpwr';
        setSelectedProviderId(defaultId);
        fetchRawCatalog(defaultId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load providers', 'error');
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const fetchRawCatalog = async (providerId: string) => {
    setIsLoadingRawServices(true);
    setRawServices([]);
    setCategories([]);
    setSelectedServiceIds(new Set());
    setFoundSingleService(null);
    try {
      const res = await api.admin.getProviderRawServices(providerId);
      if (res.success) {
        setRawServices(res.services || []);
        setCategories(res.categories || []);
        showToast(`Loaded ${res.services?.length || 0} services from ${providerId.toUpperCase()}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch services from provider', 'error');
    } finally {
      setIsLoadingRawServices(false);
    }
  };

  // Filtered raw services
  const filteredRawServices = useMemo(() => {
    return rawServices.filter((s) => {
      if (filterCategory !== 'All' && s.category !== filterCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = String(s.service).includes(q);
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesCat = (s.category || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesCat) return false;
      }
      return true;
    });
  }, [rawServices, filterCategory, searchQuery]);

  const currentProvider = providers.find((p) => p.id === selectedProviderId);

  // Toggle single selection
  const handleToggleSelect = (serviceId: number) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  // Select all shown
  const handleSelectAllShown = () => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      filteredRawServices.forEach((s) => next.add(Number(s.service)));
      return next;
    });
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedServiceIds(new Set());
  };

  // Single ID search
  const handleLookupSingleId = () => {
    if (!manualIdInput.trim()) {
      showToast('Please enter a service ID', 'error');
      return;
    }
    const target = rawServices.find((s) => String(s.service) === manualIdInput.trim());
    if (target) {
      setFoundSingleService(target);
    } else {
      setFoundSingleService(null);
      showToast(`Service #${manualIdInput} not found in ${selectedProviderId} catalog`, 'error');
    }
  };

  // Execution: Import API Call
  const executeImport = async (importMode: 'all' | 'category' | 'selected' | 'single', customIds?: number[]) => {
    setIsImporting(true);
    try {
      const payload: any = {
        providerId: selectedProviderId,
        mode: importMode,
        markupPercent: parseFloat(markupPercent) || 30,
        fixedIncrease: parseFloat(fixedIncrease) || 0,
        isActive: true,
      };

      if (importMode === 'category') {
        if (!filterCategory || filterCategory === 'All') {
          showToast('Please select a specific category first', 'error');
          setIsImporting(false);
          return;
        }
        payload.category = filterCategory;
      } else if (importMode === 'selected') {
        const ids = customIds || Array.from(selectedServiceIds);
        if (ids.length === 0) {
          showToast('No services selected to import', 'error');
          setIsImporting(false);
          return;
        }
        payload.serviceIds = ids;
      } else if (importMode === 'single') {
        if (!foundSingleService) {
          showToast('Please search and verify a service first', 'error');
          setIsImporting(false);
          return;
        }
        payload.serviceIds = [foundSingleService.service];
      }

      const res = await api.admin.importServices(payload);
      if (res.success) {
        showToast(res.message || 'Services imported successfully!', 'success');
        onImportSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to import services', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1080,
          maxHeight: '92vh',
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderRadius: 16,
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: isDark ? '#f1f5f9' : '#0f172a',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? '#111c38' : '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <DownloadCloud size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Import Services from SMM Provider
              </h2>
              <p style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', margin: '2px 0 0' }}>
                Selectively import by category, search by service ID, or import whole catalog with custom profit margins.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#64748b',
              padding: 6,
              borderRadius: 8,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Provider Bar & Controls */}
        <div
          style={{
            padding: '16px 24px',
            background: isDark ? '#131e3d' : '#f1f5f9',
            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Provider Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155' }}>
              Select Provider:
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedProviderId(nextId);
                fetchRawCatalog(nextId);
              }}
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 8,
                fontSize: '0.88rem',
                fontWeight: 600,
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#ffffff' : '#0f172a',
              }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id.toUpperCase()})
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchRawCatalog(selectedProviderId)}
              disabled={isLoadingRawServices}
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#38bdf8' : '#0284c7',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
              }}
            >
              <RefreshCw size={14} className={isLoadingRawServices ? 'spin' : ''} />
              {isLoadingRawServices ? 'Fetching...' : 'Refresh Catalog'}
            </button>

            {currentProvider && (
              <span
                style={{
                  fontSize: '0.82rem',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7',
                  color: '#10b981',
                  fontWeight: 700,
                }}
              >
                Balance: ${currentProvider.balance} {currentProvider.currency}
              </span>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              background: isDark ? '#0f172a' : '#e2e8f0',
              padding: 4,
              borderRadius: 8,
              gap: 4,
            }}
          >
            <button
              onClick={() => setMode('catalog')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: mode === 'catalog' ? (isDark ? '#2563eb' : '#ffffff') : 'transparent',
                color: mode === 'catalog' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                boxShadow: mode === 'catalog' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              Browse & Select Catalog ({rawServices.length})
            </button>
            <button
              onClick={() => setMode('singleId')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: mode === 'singleId' ? (isDark ? '#2563eb' : '#ffffff') : 'transparent',
                color: mode === 'singleId' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                boxShadow: mode === 'singleId' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              Manual Service ID
            </button>
          </div>
        </div>

        {/* Pricing & Margin Bar */}
        <div
          style={{
            padding: '10px 24px',
            background: isDark ? '#0b1120' : '#f8fafc',
            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 20,
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders size={14} color="#0284c7" />
            <span style={{ fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155' }}>Profit Margin Markup:</span>
            <input
              type="number"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
              style={{
                width: 70,
                height: 30,
                padding: '2px 8px',
                borderRadius: 6,
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#ffffff' : '#0f172a',
                fontWeight: 700,
              }}
            />
            <span>%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={14} color="#10b981" />
            <span style={{ fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155' }}>Fixed Adder ($/1k):</span>
            <input
              type="number"
              step="0.01"
              value={fixedIncrease}
              onChange={(e) => setFixedIncrease(e.target.value)}
              style={{
                width: 70,
                height: 30,
                padding: '2px 8px',
                borderRadius: 6,
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#ffffff' : '#0f172a',
                fontWeight: 700,
              }}
            />
          </div>

          <div style={{ marginLeft: 'auto', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.78rem' }}>
            Selling price preview: <code>(Wholesale + ${fixedIncrease || '0'}) × (1 + {markupPercent || '0'}%)</code>
          </div>
        </div>

        {/* Content Body */}
        {mode === 'catalog' ? (
          <>
            {/* Filter controls */}
            <div
              style={{
                padding: '12px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              }}
            >
              {/* Category Filter */}
              <div style={{ flex: '1 1 260px' }}>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                  }}
                >
                  <option value="All">All Provider Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search box */}
              <div style={{ flex: '1 1 220px', position: 'relative' }}>
                <Search
                  size={15}
                  style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }}
                />
                <input
                  type="text"
                  placeholder="Search by ID (e.g. 1) or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: 36,
                    paddingLeft: 32,
                    paddingRight: 10,
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0f172a',
                  }}
                />
              </div>

              {/* Quick Select Buttons */}
              <button
                onClick={handleSelectAllShown}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                  background: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckSquare size={14} /> Select All Shown ({filteredRawServices.length})
              </button>

              <button
                onClick={handleDeselectAll}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  color: isDark ? '#94a3b8' : '#64748b',
                }}
              >
                Clear Selection
              </button>

              <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.85rem', color: '#0284c7' }}>
                {selectedServiceIds.size} selected
              </div>
            </div>

            {/* Services Table */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 280 }}>
              {isLoadingRawServices ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
                  <p>Fetching full catalog from {selectedProviderId.toUpperCase()}...</p>
                </div>
              ) : filteredRawServices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
                  <p>No services match your category / search query.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr
                      style={{
                        position: 'sticky',
                        top: 0,
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                        borderBottom: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: isDark ? '#cbd5e1' : '#475569',
                      }}
                    >
                      <th style={{ padding: '10px 14px', width: 44 }}>
                        <input
                          type="checkbox"
                          checked={
                            filteredRawServices.length > 0 &&
                            filteredRawServices.every((s) => selectedServiceIds.has(Number(s.service)))
                          }
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAllShown();
                            else handleDeselectAll();
                          }}
                        />
                      </th>
                      <th style={{ padding: '10px 8px', width: 70 }}>ID</th>
                      <th style={{ padding: '10px 12px' }}>Service Name & Category</th>
                      <th style={{ padding: '10px 12px', width: 110 }}>Wholesale</th>
                      <th style={{ padding: '10px 12px', width: 130 }}>Your Resale Price</th>
                      <th style={{ padding: '10px 12px', width: 120 }}>Min / Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRawServices.slice(0, 150).map((s) => {
                      const idNum = Number(s.service);
                      const isSelected = selectedServiceIds.has(idNum);
                      const originalRate = parseFloat(s.rate || '0');
                      const markupNum = parseFloat(markupPercent) || 30;
                      const fixedNum = parseFloat(fixedIncrease) || 0;
                      const resalePrice =
                        fixedNum > 0
                          ? (originalRate + fixedNum).toFixed(4)
                          : (originalRate * (1 + markupNum / 100)).toFixed(4);

                      return (
                        <tr
                          key={s.service}
                          onClick={() => handleToggleSelect(idNum)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(2, 132, 199, 0.15)'
                                : '#e0f2fe'
                              : 'transparent',
                            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(idNum)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 700 }}>
                            #{s.service}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                              {s.category}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748b' }}>
                            ${originalRate.toFixed(4)}
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>
                            ${resalePrice}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '0.76rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                            {s.min} / {s.max}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {filteredRawServices.length > 150 && (
                <div style={{ textAlign: 'center', padding: 12, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Showing first 150 of {filteredRawServices.length} services. Use category / search filter to narrow down.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Mode 2: Single Service ID Lookup */
          <div style={{ padding: 32, flex: 1, overflowY: 'auto' }}>
            <div style={{ maxWidth: 580, margin: '0 auto' }}>
              <div
                style={{
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px' }}>
                  Manual Service ID Lookup
                </h3>
                <p style={{ fontSize: '0.84rem', color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 18px' }}>
                  Enter the exact Service ID from {selectedProviderId.toUpperCase()} to verify and add it directly to your catalog.
                </p>

                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Hash size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="e.g. 1, 2390"
                      value={manualIdInput}
                      onChange={(e) => setManualIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupSingleId()}
                      style={{
                        width: '100%',
                        height: 42,
                        paddingLeft: 36,
                        paddingRight: 12,
                        borderRadius: 8,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#ffffff' : '#0f172a',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleLookupSingleId}
                    style={{
                      height: 42,
                      padding: '0 20px',
                      borderRadius: 8,
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                    }}
                  >
                    Find Service
                  </button>
                </div>

                {foundSingleService && (
                  <div
                    style={{
                      background: isDark ? '#0f172a' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          background: '#0284c7',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        #{foundSingleService.service}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                        {foundSingleService.category}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '6px 0 12px' }}>
                      {foundSingleService.name}
                    </h4>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 10,
                        padding: 12,
                        borderRadius: 8,
                        background: isDark ? '#1e293b' : '#f1f5f9',
                        fontSize: '0.82rem',
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Wholesale Rate</div>
                        <div style={{ fontWeight: 800 }}>${parseFloat(foundSingleService.rate).toFixed(4)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Your Resale Price</div>
                        <div style={{ fontWeight: 800, color: '#16a34a' }}>
                          ${(
                            parseFloat(foundSingleService.rate) *
                            (1 + (parseFloat(markupPercent) || 30) / 100)
                          ).toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Min / Max</div>
                        <div>
                          {foundSingleService.min} / {foundSingleService.max}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => executeImport('single')}
                      disabled={isImporting}
                      style={{
                        width: '100%',
                        height: 42,
                        borderRadius: 8,
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <CheckCircle size={16} />
                      {isImporting ? 'Adding...' : 'Add This Service to Catalog'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer with Import Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: isDark ? '#111c38' : '#f8fafc',
            borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b' }}>
            Provider: <strong>{selectedProviderId.toUpperCase()}</strong> • Total in catalog: <strong>{rawServices.length}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              disabled={isImporting}
              style={{
                height: 40,
                padding: '0 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'none',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                color: isDark ? '#cbd5e1' : '#475569',
              }}
            >
              Cancel
            </button>

            {mode === 'catalog' && (
              <>
                {/* Button: Import Selected */}
                <button
                  onClick={() => executeImport('selected')}
                  disabled={isImporting || selectedServiceIds.size === 0}
                  style={{
                    height: 40,
                    padding: '0 18px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: selectedServiceIds.size === 0 ? 'not-allowed' : 'pointer',
                    background: selectedServiceIds.size > 0 ? '#0284c7' : isDark ? '#334155' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle size={15} />
                  Import Selected ({selectedServiceIds.size})
                </button>

                {/* Button: Import Current Category */}
                {filterCategory !== 'All' && (
                  <button
                    onClick={() => executeImport('category')}
                    disabled={isImporting}
                    style={{
                      height: 40,
                      padding: '0 18px',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Layers size={15} />
                    Import Category ({filteredRawServices.length})
                  </button>
                )}

                {/* Button: Import All */}
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to import ALL ${rawServices.length} services from ${selectedProviderId.toUpperCase()}?`)) {
                      executeImport('all');
                    }
                  }}
                  disabled={isImporting || rawServices.length === 0}
                  style={{
                    height: 40,
                    padding: '0 18px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: rawServices.length === 0 ? 'not-allowed' : 'pointer',
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    color: isDark ? '#38bdf8' : '#0369a1',
                    border: isDark ? '1px solid #0284c7' : '1px solid #bae6fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={15} />
                  Add All Services ({rawServices.length})
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
