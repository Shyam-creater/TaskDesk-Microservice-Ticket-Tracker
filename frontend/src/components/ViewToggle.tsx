import React from 'react';
import { LayoutGrid, LayoutList } from 'lucide-react';

export type ViewMode = 'table' | 'grid';

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onChange }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#E5E5EA',
        padding: '3px',
        borderRadius: 'var(--radius-sm)',
        gap: '2px',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('table')}
        title="Table format"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 6,
          border: 'none',
          backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
          color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)',
          boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
          fontSize: 13,
          fontWeight: viewMode === 'table' ? 600 : 500,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <LayoutList size={15} color={viewMode === 'table' ? 'var(--accent-primary)' : 'currentColor'} />
        <span>Table</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('grid')}
        title="Grid card format"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 6,
          border: 'none',
          backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
          color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-secondary)',
          boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
          fontSize: 13,
          fontWeight: viewMode === 'grid' ? 600 : 500,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <LayoutGrid size={15} color={viewMode === 'grid' ? 'var(--accent-primary)' : 'currentColor'} />
        <span>Grid</span>
      </button>
    </div>
  );
};
