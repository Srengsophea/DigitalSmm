import React, { useState } from 'react';
import { ServiceItem } from './ServicesTable';
import { Star, Eye, Search, Layers, DollarSign, UserPlus, LogIn, Sparkles, Filter, ChevronRight, ChevronDown } from 'lucide-react';
import { PlatformPillsBar } from './PlatformPillsBar';
import { ServiceDetailModal } from './ServiceDetailModal';
import { ResponsivePickerSheet } from './ResponsivePickerSheet';

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
          <h2>
            Services & Wholesale Pricing Catalog
          </h2>
          <p>
            Browse all {services.length.toLocaleString() || '7,500+'} verified SMM services. Click the eye icon on any row to view complete speed and guarantee specifications.
          </p>
        </div>

        {/* Callout Card */}
        <div className="public-bonus-callout-card">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#162399',
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
              <strong>Instant Wholesale Access</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
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
      <div className="services-table-wrapper" style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0, 20, 80, 0.03)' }}>
        <table className="services-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>ID</th>
              <th>Service Name</th>
              <th style={{ width: 60, textAlign: 'center' }}>Details</th>
              <th style={{ width: 140 }}>Rate per 1000</th>
              <th style={{ width: 130, textAlign: 'center' }}>Min order</th>
              <th style={{ width: 150, textAlign: 'center' }}>Max order</th>
              <th style={{ width: 160, textAlign: 'right' }}>Average Speed</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
                  Loading wholesale services catalog...
                </td>
              </tr>
            ) : Object.keys(groupedByCategory).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
                  No services found matching your criteria.
                </td>
              </tr>
            ) : (
              Object.entries(groupedByCategory).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* Category Header Row */}
                  <tr>
                    <td colSpan={7} className="category-row-header" style={{ background: '#f8fafc', fontWeight: 800, color: '#1e293b', borderTop: '2px solid #e2e8f0' }}>
                      {category}
                    </td>
                  </tr>

                  {/* Service Items */}
                  {items.map((service) => (
                    <tr key={service.id}>
                      {/* ID with Star */}
                      <td style={{ color: '#475569', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Star size={14} color="#f59e0b" fill="#fef3c7" />
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{service.externalId}</span>
                        </div>
                      </td>

                      {/* Service Name */}
                      <td style={{ fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                        <span
                          style={{ cursor: 'pointer', transition: 'color 0.15s ease' }}
                          onClick={() => setSelectedDetailService(service)}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#162399')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#1e293b')}
                          title="Click to view full specifications"
                        >
                          {service.name}
                        </span>
                      </td>

                      {/* View Details Eye Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="action-view-btn"
                          title="View Service Details & Speed"
                          onClick={() => setSelectedDetailService(service)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            borderRadius: 6,
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>

                      {/* Rate */}
                      <td className="rate-text" style={{ fontWeight: 800, color: '#162399', fontFamily: 'var(--font-mono)' }}>
                        ${service.customRate.toFixed(2)}
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
                      <td style={{ textAlign: 'right', color: '#64748b', fontSize: '0.82rem' }}>
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
