import React, { useState } from 'react';
import { ServiceItem } from './ServicesTable';
import { Star, Eye, Search, Layers, DollarSign, UserPlus, LogIn, Sparkles, Filter, ChevronRight, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import { PlatformPillsBar } from './PlatformPillsBar';
import { ServiceDetailModal } from './ServiceDetailModal';
import { ResponsivePickerSheet } from './ResponsivePickerSheet';
import { useTheme } from '../context/ThemeContext';

const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

interface PublicServicesViewProps {
  services: ServiceItem[];
  categories: string[];
  platforms: string[];
  isLoading: boolean;
  onSelectServiceForOrder?: (service: ServiceItem) => void;
  onSignUp: () => void;
  onSignIn: () => void;
}

export const PublicServicesView: React.FC<PublicServicesViewProps> = ({
  services,
  categories,
  platforms,
  isLoading,
  onSelectServiceForOrder,
  onSignUp,
  onSignIn,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [selectedDetailService, setSelectedDetailService] = useState<ServiceItem | null>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState<boolean>(false);

  // Filtering
  const filteredServices = services.filter((s) => {
    if (selectedPlatform !== 'All') {
      const matchPlat =
        s.platform.toLowerCase() === selectedPlatform.toLowerCase() ||
        s.category.toLowerCase().includes(selectedPlatform.toLowerCase()) ||
        s.name.toLowerCase().includes(selectedPlatform.toLowerCase());
      if (!matchPlat) return false;
    }

    if (selectedCategory !== 'All' && s.category !== selectedCategory) {
      return false;
    }

    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase().trim();
      const matchSearch =
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.externalId.toString().includes(q);
      if (!matchSearch) return false;
    }

    return true;
  });

  // Group services by category
  const groupedByCategory: { [cat: string]: ServiceItem[] } = {};
  filteredServices.slice(0, 150).forEach((s) => {
    if (!groupedByCategory[s.category]) {
      groupedByCategory[s.category] = [];
    }
    groupedByCategory[s.category].push(s);
  });

  return (
    <div className="public-services-wrapper">
      {/* Header with Callout Banner */}
      <div className="public-services-header">
        <div className="public-services-header-text">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: isDark ? '#f8fafc' : '#0f172a' }}>
            Services & Wholesale Pricing Catalog
          </h1>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Browse all {services.length.toLocaleString() || '7,500+'} verified SMM services. Click the eye icon on any row to view complete speed and guarantee specifications.
          </p>
        </div>

        {/* Callout Card */}
        <div
          className="public-bonus-callout-card"
          style={
            isDark
              ? {
                  background: '#0f172a',
                  border: '1px solid #334155',
                }
              : undefined
          }
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: isDark ? '#2563eb' : '#162399',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={20} />
          </div>
          <div className="public-bonus-callout-text">
            <div>
              <strong style={{ color: isDark ? '#38bdf8' : '#162399' }}>Instant Wholesale Access</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
              Direct provider prices & automated API.
            </div>
          </div>
          <button
            type="button"
            className="btn-public-signup"
            style={{ padding: '6px 14px', fontSize: '0.80rem', marginLeft: 'auto' }}
            onClick={onSignUp}
          >
            Get Started →
          </button>
        </div>
      </div>

      {/* Enlarged Platform Pills Bar */}
      <div style={{ marginBottom: 20 }}>
        <PlatformPillsBar
          selectedPlatform={selectedPlatform}
          onSelectPlatform={(plat) => {
            setSelectedPlatform(plat);
            setSelectedCategory('All');
          }}
        />
      </div>

      {/* Search Toolbar */}
      <div className="services-search-container" style={{ marginBottom: 20 }}>
        <div className="search-input-box">
          <input
            type="text"
            className="form-input"
            placeholder="Search by ID or service keyword (e.g. followers, likes, views)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setActiveSearch(searchTerm);
            }}
          />
        </div>

        <button
          className="btn-search"
          onClick={() => setActiveSearch(searchTerm)}
        >
          Search
        </button>

        <div className="category-filter-select">
          <div
            className="mobile-select-trigger"
            onClick={() => setIsCategoryPickerOpen(true)}
            role="button"
            tabIndex={0}
          >
            <span className="mobile-select-trigger-text">
              {selectedCategory === 'All'
                ? `Filter By Category (${categories.length})`
                : decodeHtmlEntities(selectedCategory)}
            </span>
            <ChevronDown size={15} style={{ color: '#64748b', flexShrink: 0, marginLeft: 6 }} />
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div
        className="services-table-wrapper"
        style={{
          background: isDark ? '#0f172a' : '#ffffff',
          borderRadius: 12,
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.45)' : '0 2px 10px rgba(0, 20, 80, 0.03)',
        }}
      >
        <table className="services-table">
          <thead>
            <tr style={{ background: isDark ? '#0b0f19' : '#ffffff' }}>
              <th style={{ width: 90, color: isDark ? '#94a3b8' : '#64748b' }}>ID</th>
              <th style={{ minWidth: 320, width: 360, color: isDark ? '#94a3b8' : '#64748b' }}>Service Name</th>
              <th style={{ width: 60, textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>Details</th>
              <th style={{ width: 140, color: isDark ? '#94a3b8' : '#64748b' }}>Rate per 1000</th>
              <th style={{ width: 130, textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>Min order</th>
              <th style={{ width: 150, textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>Max order</th>
              <th style={{ width: 160, textAlign: 'right', color: isDark ? '#94a3b8' : '#64748b' }}>Average Speed</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 50, color: isDark ? '#94a3b8' : '#64748b', background: isDark ? '#0f172a' : '#ffffff' }}>
                  Loading wholesale services catalog...
                </td>
              </tr>
            ) : Object.keys(groupedByCategory).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 50, color: isDark ? '#94a3b8' : '#64748b', background: isDark ? '#0f172a' : '#ffffff' }}>
                  No services found matching your criteria.
                </td>
              </tr>
            ) : (
              Object.entries(groupedByCategory).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* Category Header Row */}
                  <tr>
                    <td
                      colSpan={7}
                      className="category-row-header"
                      style={{
                        background: isDark ? '#1e293b' : '#f8fafc',
                        fontWeight: 800,
                        color: isDark ? '#38bdf8' : '#1e293b',
                        borderTop: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
                        borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        textAlign: 'center',
                      }}
                    >
                      {decodeHtmlEntities(category)}
                    </td>
                  </tr>

                  {/* Service Items */}
                  {items.map((service) => (
                    <tr
                      key={service.id}
                      style={{
                        background: isDark ? '#0f172a' : '#ffffff',
                        borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
                      }}
                    >
                      {/* ID with Star */}
                      <td style={{ color: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Star size={14} color="#f59e0b" fill={isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7'} />
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{service.externalId}</span>
                        </div>
                      </td>

                      {/* Service Name with Refill & Cancel badges */}
                      <td style={{ minWidth: 320, maxWidth: 500, fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b', lineHeight: 1.45 }}>
                        <span
                          style={{ cursor: 'pointer', transition: 'color 0.15s ease' }}
                          onClick={() => setSelectedDetailService(service)}
                          onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#38bdf8' : '#162399')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#f8fafc' : '#1e293b')}
                          title="Click to view full specifications"
                        >
                          {decodeHtmlEntities(service.name)}
                        </span>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          {service.refill && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                backgroundColor: isDark ? 'rgba(21, 128, 61, 0.25)' : '#dcfce7',
                                color: isDark ? '#4ade80' : '#15803d',
                                border: isDark ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid #bbf7d0',
                              }}
                              title="Refill Guaranteed on SMMFollows"
                            >
                              <CheckCircle2 size={11} /> Refill
                            </span>
                          )}
                          {service.cancel && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                backgroundColor: isDark ? 'rgba(180, 83, 9, 0.25)' : '#fef3c7',
                                color: isDark ? '#fde68a' : '#b45309',
                                border: isDark ? '1px solid rgba(253, 230, 138, 0.3)' : '1px solid #fde68a',
                              }}
                              title="Cancel Button Available on SMMFollows"
                            >
                              <XCircle size={11} /> Cancel
                            </span>
                          )}
                          {service.dripfeed && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                backgroundColor: isDark ? 'rgba(3, 105, 161, 0.25)' : '#e0f2fe',
                                color: isDark ? '#7dd3fc' : '#0369a1',
                                border: isDark ? '1px solid rgba(125, 211, 252, 0.3)' : '1px solid #bae6fd',
                              }}
                              title="Drip-feed Automated Pacing Supported"
                            >
                              Drip-feed
                            </span>
                          )}
                        </div>
                      </td>

                      {/* View Details Eye Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="action-view-btn"
                          title="View Service Details & Speed"
                          onClick={() => setSelectedDetailService(service)}
                          style={{
                            background: isDark ? '#1e293b' : '#eff6ff',
                            border: isDark ? '1px solid #334155' : '1px solid #bfdbfe',
                            color: isDark ? '#38bdf8' : '#1d4ed8',
                            borderRadius: 6,
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>

                      {/* Rate */}
                      <td
                        className="rate-text"
                        style={{
                          fontWeight: 800,
                          color: isDark ? '#38bdf8' : '#162399',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ${service.customRate.toFixed(3)}
                      </td>

                      {/* Min Order */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="pill-min">
                          {service.min.toLocaleString()}
                        </span>
                      </td>

                      {/* Max Order */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="pill-max">
                          {service.max.toLocaleString()}
                        </span>
                      </td>

                      {/* Average Speed */}
                      <td style={{ textAlign: 'right', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.82rem' }}>
                        <span>Fast Automated</span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Service Details Modal */}
      <ServiceDetailModal
        service={selectedDetailService}
        isOpen={!!selectedDetailService}
        onClose={() => setSelectedDetailService(null)}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        isAuthenticated={false}
      />

      {/* Mobile Responsive Category Picker */}
      <ResponsivePickerSheet
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        title="Filter By Category"
        searchPlaceholder="Search categories..."
        selectedId={selectedCategory}
        onSelect={(cat) => setSelectedCategory(cat)}
        items={[
          { id: 'All', title: `All Categories (${categories.length})` },
          ...categories.map((cat) => ({
            id: cat,
            title: decodeHtmlEntities(cat),
          })),
        ]}
      />
    </div>
  );
};
