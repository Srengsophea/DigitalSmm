import React, { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';

export interface PickerItem {
  id: string;
  title: string;
  badge?: string;
  rate?: string;
}

interface ResponsivePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: PickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchPlaceholder?: string;
}

export const ResponsivePickerSheet: React.FC<ResponsivePickerSheetProps> = ({
  isOpen,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
  searchPlaceholder = 'Type to filter...',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Reset search term when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.badge && item.badge.toLowerCase().includes(query)) ||
      (item.rate && item.rate.toLowerCase().includes(query))
    );
  });

  return (
    <div
      className="picker-sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="picker-sheet-container">
        {/* Top Drag Indicator Handle */}
        <div className="picker-sheet-handle" />

        {/* Sheet Header */}
        <div className="picker-sheet-header">
          <div className="picker-sheet-title-row">
            <span className="picker-sheet-title">{title}</span>
            <span className="picker-sheet-badge">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            type="button"
            className="picker-sheet-close"
            onClick={onClose}
            aria-label="Close picker"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="picker-sheet-search-wrap">
          <div className="picker-sheet-search-box">
            <Search size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              className="picker-sheet-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="picker-sheet-list">
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.82rem',
              }}
            >
              No matching options found for "{searchTerm}"
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  className={`picker-sheet-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="picker-sheet-item-left">
                    <div className="picker-sheet-item-text">{item.title}</div>
                    {(item.badge || item.rate) && (
                      <div className="picker-sheet-item-sub">
                        {item.badge && (
                          <span className="picker-sheet-item-id-pill">
                            {item.badge}
                          </span>
                        )}
                        {item.rate && (
                          <span className="picker-sheet-item-rate">
                            {item.rate}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="picker-sheet-radio" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
