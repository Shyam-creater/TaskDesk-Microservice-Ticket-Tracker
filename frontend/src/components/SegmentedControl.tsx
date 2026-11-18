import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>): React.ReactElement {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        backgroundColor: '#E5E5EA',
        borderRadius: 'var(--radius-sm)',
        userSelect: 'none',
        gap: 2,
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: isSelected ? 'var(--surface)' : 'transparent',
              borderRadius: 6,
              boxShadow: isSelected ? '0 1px 4px rgba(0, 0, 0, 0.12)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: isSelected ? '#F2F2F7' : 'rgba(0, 0, 0, 0.06)',
                  color: isSelected ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
