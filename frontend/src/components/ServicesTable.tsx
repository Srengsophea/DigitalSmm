import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart, RefreshCw, CheckCircle2, XCircle, Filter, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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

export interface ServiceItem {
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
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
}

interface ServicesTableProps {
  services: ServiceItem[];
  categories: string[];
  isLoading: boolean;
  onSelectService: (service: ServiceItem) => void;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
  searchTerm: string;
}

export const ServicesTable: React.FC<ServicesTableProps> = ({
  services,
  categories,
  isLoading,
  onSelectService,
  onSearchChange,
  onCategoryChange,
  selectedCategory,
  searchTerm,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'rate_asc' | 'rate_desc' | 'id_asc'>('rate_asc');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const itemsPerPage = 40;

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => {
      if (sortBy === 'rate_asc') return a.customRate - b.customRate;
      if (sortBy === 'rate_desc') return b.customRate - a.customRate;
      return a.externalId - b.externalId;
    });
  }, [services, sortBy]);

  const totalPages = Math.ceil(sortedServices.length / itemsPerPage) || 1;
  const paginatedServices = sortedServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ marginBottom: 60 }}>
      {/* Toolbar */}
      <div className="services-toolbar">
        {/* Search */}
        <div className="search-input-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by service name, ID, or keyword (e.g. Telegram views, TikTok, Followers)..."
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Category Dropdown */}
        <div style={{ minWidth: 200, flex: '1 1 auto', height: 'auto' }}>
          <div
            className="mobile-select-trigger"
            onClick={() => setIsCategoryPickerOpen(true)}
            role="button"
            tabIndex={0}
          >
            <span className="mobile-select-trigger-text">
              {selectedCategory === 'All'
                ? `All Categories (${categories.length})`
                : decodeHtmlEntities(selectedCategory)}
            </span>
            <ChevronDown size={15} style={{ color: '#64748b', flexShrink: 0, marginLeft: 6 }} />
          </div>
        </div>

        {/* Sort Select */}
        <div style={{ minWidth: 170 }}>
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="rate_asc">Price: Low to High</option>
            <option value="rate_desc">Price: High to Low</option>
            <option value="id_asc">Service ID</option>
          </select>
        </div>
      </div>

      {/* Services Count bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{paginatedServices.length}</strong> of <strong>{services.length.toLocaleString()}</strong> services
        </span>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 85 }}>ID</th>
              <th>Service Details</th>
              <th>Platform</th>
              <th>Rate / 1k</th>
              <th>Min / Max</th>
              <th>Features</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={24} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: 8 }}>Loading available services from database...</p>
                </td>
              </tr>
            ) : paginatedServices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  <Filter size={32} color="var(--text-muted)" />
                  <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>No services match your search or filter.</p>
                </td>
              </tr>
            ) : (
              paginatedServices.map((service) => (
                <tr key={service.id}>
                  {/* ID */}
                  <td>
                    <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                      #{service.externalId}
                    </span>
                  </td>

                  {/* Name & Category */}
                  <td className="service-title-cell">
                    <div className="service-name">{service.name}</div>
                    <div className="service-category">{service.category}</div>
                  </td>

                  {/* Platform */}
                  <td>
                    <span className="badge badge-cyan">{service.platform}</span>
                  </td>

                  {/* Rate */}
                  <td>
                    <span className="rate-badge">${service.customRate.toFixed(3)}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>per 1,000</span>
                  </td>

                  {/* Min / Max */}
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <strong>{service.min.toLocaleString()}</strong>
                      <span style={{ color: 'var(--text-muted)' }}> min</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {service.max.toLocaleString()} max
                    </div>
                  </td>

                  {/* Features */}
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {service.refill && (
                        <span className="badge badge-success" title="Automatic Refill Guaranteed">
                          <CheckCircle2 size={11} /> Refill
                        </span>
                      )}
                      {service.cancel && (
                        <span className="badge badge-warning" title="Cancelable">
                          Cancel
                        </span>
                      )}
                      {service.dripfeed && (
                        <span className="badge badge-primary" title="Drip-feed Supported">
                          Drip-feed
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onSelectService(service)}
                    >
                      <ShoppingCart size={14} />
                      Order
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: 24 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={currentPage <= 1}
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 400, behavior: 'smooth' });
            }}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={currentPage >= totalPages}
            onClick={() => {
              setCurrentPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 400, behavior: 'smooth' });
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Mobile Responsive Category Picker */}
      <ResponsivePickerSheet
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        title="Select Category"
        searchPlaceholder="Search categories..."
        selectedId={selectedCategory}
        onSelect={(cat) => {
          onCategoryChange(cat);
          setCurrentPage(1);
        }}
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
