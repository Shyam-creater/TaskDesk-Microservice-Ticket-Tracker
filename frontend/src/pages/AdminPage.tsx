import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Ticket, TicketStatus, TicketPriority, TicketStats } from '../types';
import { Navbar } from '../components/Navbar';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Skeleton } from '../components/Skeleton';
import {
  ShieldCheck,
  Calendar,
  User,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  Inbox,
  Clock,
  CheckCircle2,
  Archive,
  Layers,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await apiClient.get('/tickets/stats');
      setStats(response.data.data.stats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch ticket stats';
      showToast(msg, 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [showToast]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      params.append('limit', '100');

      const response = await apiClient.get(`/tickets?${params.toString()}`);
      setTickets(response.data.data.tickets || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tickets';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, showToast]);

  const refreshAll = useCallback(() => {
    fetchStats();
    fetchTickets();
  }, [fetchStats, fetchTickets]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    setSelectedTicket(updated);
    fetchStats();
  };

  const handleTicketDeleted = (deletedId: string) => {
    setTickets((prev) => prev.filter((t) => t._id !== deletedId));
    if (selectedTicket?._id === deletedId) {
      setSelectedTicket(null);
    }
    fetchStats();
  };

  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.createdBy.toLowerCase().includes(q)
    );
  });

  const statCards: Array<{
    key: 'total' | TicketStatus;
    title: string;
    count: number;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'total',
      title: 'Total Tickets',
      count: stats?.total ?? 0,
      color: '#1C1C1E',
      bg: '#FFFFFF',
      border: 'var(--border-light)',
      icon: <Layers size={18} color="#0071E3" />,
    },
    {
      key: 'open',
      title: 'Open',
      count: stats?.open ?? 0,
      color: 'var(--status-info)',
      bg: '#FFFFFF',
      border: 'rgba(0, 113, 227, 0.2)',
      icon: <Inbox size={18} color="var(--status-info)" />,
    },
    {
      key: 'in_review',
      title: 'In Review',
      count: stats?.in_review ?? 0,
      color: '#5856D6',
      bg: '#FFFFFF',
      border: 'rgba(88, 86, 214, 0.25)',
      icon: <ShieldCheck size={18} color="#5856D6" />,
    },
    {
      key: 'in_progress',
      title: 'In Progress',
      count: stats?.in_progress ?? 0,
      color: 'var(--status-warning)',
      bg: '#FFFFFF',
      border: 'rgba(255, 159, 10, 0.25)',
      icon: <Clock size={18} color="var(--status-warning)" />,
    },
    {
      key: 'resolved',
      title: 'Resolved',
      count: stats?.resolved ?? 0,
      color: '#007D8C',
      bg: '#FFFFFF',
      border: 'rgba(48, 176, 199, 0.25)',
      icon: <CheckCircle2 size={18} color="#007D8C" />,
    },
    {
      key: 'closed',
      title: 'Closed',
      count: stats?.closed ?? 0,
      color: '#636366',
      bg: '#FFFFFF',
      border: 'rgba(142, 142, 147, 0.25)',
      icon: <Archive size={18} color="#636366" />,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '36px 20px 60px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(88, 86, 214, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={22} color="#5856D6" />
              </div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.025em',
                }}
              >
                Admin Support Dashboard
              </h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              System-wide triage overview, validated lifecycle review, and live communication hub
            </p>
          </div>

          <button
            onClick={refreshAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: 'var(--shadow-subtle)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh All</span>
          </button>
        </div>

        {/* Dashboard Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
            marginBottom: 28,
          }}
        >
          {statCards.map((card) => {
            const isSelected =
              (card.key === 'total' && statusFilter === 'all') ||
              card.key === statusFilter;

            return (
              <div
                key={card.key}
                onClick={() => setStatusFilter(card.key === 'total' ? 'all' : card.key)}
                style={{
                  backgroundColor: card.bg,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 18px',
                  border: isSelected ? '2px solid var(--accent-primary)' : `1px solid ${card.border}`,
                  boxShadow: isSelected ? 'var(--shadow-card)' : 'var(--shadow-subtle)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {card.title}
                  </span>
                  {card.icon}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>
                  {loadingStats ? <Skeleton width={40} height={28} /> : card.count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters & Search Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Filter by title, description or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 14px 0 36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: '#FFFFFF',
                color: 'var(--text-primary)',
                fontSize: 14,
              }}
            />
            <Search
              size={15}
              color="var(--text-tertiary)"
              style={{ position: 'absolute', left: 12, top: 13 }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | TicketStatus)}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | TicketPriority)}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        {/* Tickets Table */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 24 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 0',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <Skeleton width={80} height={24} borderRadius={12} />
                  <Skeleton width="40%" height={20} />
                  <Skeleton width={100} height={20} />
                  <Skeleton width={80} height={32} borderRadius={6} style={{ marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                No tickets match your filters
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                Try adjusting your search query, status, or priority filter.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      backgroundColor: '#FBFBFD',
                    }}
                  >
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ticket Details
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Status
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Priority
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Created By
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Date
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr
                        key={ticket._id}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          transition: 'background-color var(--transition-fast)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTicket(ticket)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FBFBFD')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Title & Description */}
                        <td style={{ padding: '16px 20px', maxWidth: 360 }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              marginBottom: 2,
                            }}
                          >
                            {ticket.title}
                          </span>
                          {ticket.description && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: 13,
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {ticket.description}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={ticket.status} />
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                          <PriorityBadge priority={ticket.priority} />
                        </td>

                        {/* Created By User ID */}
                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              fontFamily: 'monospace',
                              backgroundColor: '#F2F2F7',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            <User size={11} />
                            {ticket.createdBy.substring(0, 10)}...
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} color="var(--text-tertiary)" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div
                            style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSelectedTicket(ticket)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--accent-subtle)',
                                color: 'var(--accent-primary)',
                                fontSize: 12,
                                fontWeight: 600,
                                border: '1px solid rgba(0, 113, 227, 0.2)',
                                cursor: 'pointer',
                              }}
                            >
                              <ExternalLink size={13} />
                              <span>Manage</span>
                            </button>

                            <button
                              onClick={() => setTicketToDelete(ticket)}
                              aria-label="Delete ticket"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--status-danger-bg)',
                                color: 'var(--status-danger)',
                                fontSize: 12,
                                fontWeight: 600,
                                border: '1px solid rgba(255, 59, 48, 0.2)',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Ticket Details & Chat Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={handleTicketUpdated}
          onTicketDeleted={handleTicketDeleted}
        />
      )}

      {/* Delete Confirmation Modal */}
      {ticketToDelete && (
        <DeleteConfirmModal
          isOpen={!!ticketToDelete}
          ticket={ticketToDelete}
          onTicketDeleted={() => {
            if (ticketToDelete) handleTicketDeleted(ticketToDelete._id);
            setTicketToDelete(null);
          }}
          onClose={() => setTicketToDelete(null)}
        />
      )}
    </div>
  );
};
