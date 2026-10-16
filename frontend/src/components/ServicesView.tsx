import React, { useState } from 'react';
import { ServiceItem } from './ServicesTable';
import { Star, Eye, Info, Search, Filter } from 'lucide-react';
import { PlatformPillsBar } from './PlatformPillsBar';

interface ServicesViewProps {
  services: ServiceItem[];
  categories: string[];
  platforms: string[];
  isLoading: boolean;
  onSelectService: (service: ServiceItem) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  categories,
  isLoading,
  onSelectService,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  // Filtering
  const filteredServices = services.filter((s) => {
    // Platform filter
    if (selectedPlatform !== 'All') {
      const matchPlat =
        s.platform.toLowerCase() === selectedPlatform.toLowerCase() ||
        s.category.toLowerCase().includes(selectedPlatform.toLowerCase()) ||
        s.name.toLowerCase().includes(selectedPlatform.toLowerCase());
      if (!matchPlat) return false;
    }

    // Category filter
    if (selectedCategory !== 'All' && s.category !== selectedCategory) {
      return false;
    }

    // Search query
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

  // Group services by category for SMMFollows table format
  const groupedByCategory: { [cat: string]: ServiceItem[] } = {};
  filteredServices.slice(0, 100).forEach((s) => {
    if (!groupedByCategory[s.category]) {
      groupedByCategory[s.category] = [];
    }
    groupedByCategory[s.category].push(s);
  });

  return (
    <div>
      {/* 1. Horizontal Scrollable Platform Tabs matching Screenshot 2 */}
      <PlatformPillsBar
        selectedPlatform={selectedPlatform}
        onSelectPlatform={(plat) => {
          setSelectedPlatform(plat);
          setSelectedCategory('All');
        }}
      />

      {/* 2. Search Toolbar matching Screenshot 2 */}
      <div className="services-search-container">
        <div className="search-input-box">
          <input
            type="text"
            className="form-input"
            placeholder="Search"
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
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">Filter By Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Grouped Table matching Screenshot 2 */}
      <div className="services-table-wrapper">
        <table className="services-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>ID</th>
              <th>Service</th>
              <th style={{ width: 50 }}></th>
              <th style={{ width: 140 }}>Rate per 1000</th>
              <th style={{ width: 140, textAlign: 'center' }}>Min order</th>
              <th style={{ width: 160, textAlign: 'center' }}>Max order</th>
              <th style={{ width: 180, textAlign: 'right' }}>Average completion time ⓘ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                  Loading SMMFollows provider services...
                </td>
              </tr>
            ) : Object.keys(groupedByCategory).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No services found matching your criteria.
                </td>
              </tr>
            ) : (
              Object.entries(groupedByCategory).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* Category Header Row */}
                  <tr>
                    <td colSpan={7} className="category-row-header">
                      {category}
                    </td>
                  </tr>

                  {/* Service Items */}
                  {items.map((service) => (
                    <tr key={service.id}>
                      {/* ID with Star */}
                      <td style={{ color: '#475569', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Star size={14} color="#f59e0b" fill="#fef3c7" />
                          <span>{service.externalId}</span>
                        </div>
                      </td>

                      {/* Service Name */}
                      <td style={{ fontWeight: 500, color: '#334155' }}>
                        {service.name}
                      </td>

                      {/* View Button */}
                      <td>
                        <button
                          className="action-view-btn"
                          title="Order Service"
                          onClick={() => onSelectService(service)}
                        >
                          <Eye size={16} />
                        </button>
                      </td>

                      {/* Rate */}
                      <td className="rate-text">
                        ${service.customRate.toFixed(2)}
                      </td>

                      {/* Min Order Peach Pill */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="pill-min">
                          {service.min.toLocaleString()}
                        </span>
                      </td>

                      {/* Max Order Lavender Pill */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="pill-max">
                          {service.max.toLocaleString()}
                        </span>
                      </td>

                      {/* Average Completion Time */}
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <span>Not enough data</span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
