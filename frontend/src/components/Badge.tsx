import React from 'react';
import { TicketStatus, TicketPriority } from '../types';

interface StatusBadgeProps {
  status: TicketStatus;
}

interface PriorityBadgeProps {
  priority: TicketPriority;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs: Record<TicketStatus, { label: string; bg: string; color: string; border: string }> = {
    open: {
      label: 'Open',
      bg: 'var(--status-info-bg)',
      color: 'var(--status-info)',
      border: 'rgba(0, 113, 227, 0.2)',
    },
    in_review: {
      label: 'In Review',
      bg: 'rgba(88, 86, 214, 0.12)',
      color: '#5856D6',
      border: 'rgba(88, 86, 214, 0.25)',
    },
    in_progress: {
      label: 'In Progress',
      bg: 'var(--status-warning-bg)',
      color: 'var(--status-warning)',
      border: 'rgba(255, 159, 10, 0.2)',
    },
    resolved: {
      label: 'Resolved',
      bg: 'rgba(48, 176, 199, 0.12)',
      color: '#007D8C',
      border: 'rgba(48, 176, 199, 0.25)',
    },
    closed: {
      label: 'Closed',
      bg: 'rgba(142, 142, 147, 0.14)',
      color: '#636366',
      border: 'rgba(142, 142, 147, 0.25)',
    },
  };

  const config = configs[status] || configs.open;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 'var(--radius-full)',
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        letterSpacing: '0.01em',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: config.color,
          marginRight: 6,
        }}
      />
      {config.label}
    </span>
  );
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const configs: Record<TicketPriority, { label: string; bg: string; color: string; border: string }> = {
    low: {
      label: 'Low',
      bg: '#F2F2F7',
      color: '#6E6E73',
      border: '#E5E5EA',
    },
    medium: {
      label: 'Medium',
      bg: 'var(--status-info-bg)',
      color: 'var(--status-info)',
      border: 'rgba(0, 113, 227, 0.15)',
    },
    high: {
      label: 'High Priority',
      bg: 'var(--status-danger-bg)',
      color: 'var(--status-danger)',
      border: 'rgba(255, 59, 48, 0.2)',
    },
  };

  const config = configs[priority] || configs.medium;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  );
};
