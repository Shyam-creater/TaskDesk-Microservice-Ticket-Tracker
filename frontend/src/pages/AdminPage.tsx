import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Ticket, TicketStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Skeleton } from '../components/Skeleton';
import { Trash2, ShieldCheck, Calendar, User, Search, RefreshCw } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
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
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.createdBy.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 20px 60px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={26} color="var(--accent-primary)" />
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.025em',
                }}
              >
                Administrator Console
              </h1>
            </div>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>
              Global ticket overview across all users with administrative deletion privilege
            </p>
          </div>

          <button
            onClick={fetchTickets}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Search by title, description or user ID..."
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

          {/* Status Filter */}
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
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Tickets Table / List */}
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
                Try adjusting your search query or status filter.
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
                      Ticket
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
                        }}
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

                        {/* Action: Delete */}
                        <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => setTicketToDelete(ticket)}
                            aria-label="Delete ticket"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--status-danger-bg)',
                              color: 'var(--status-danger)',
                              fontSize: 12,
                              fontWeight: 600,
                              border: '1px solid rgba(255, 59, 48, 0.2)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--status-danger)';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--status-danger-bg)';
                              e.currentTarget.style.color = 'var(--status-danger)';
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        ticket={ticketToDelete}
        onTicketDeleted={fetchTickets}
      />
    </div>
  );
};
