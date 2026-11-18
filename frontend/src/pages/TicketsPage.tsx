import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Ticket, TicketStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { SegmentedControl, SegmentOption } from '../components/SegmentedControl';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { Skeleton } from '../components/Skeleton';
import { Plus, Ticket as TicketIcon, Calendar, Check, Clock, AlertCircle } from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('limit', '50');

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

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    setUpdatingId(ticketId);
    try {
      await apiClient.patch(`/tickets/${ticketId}`, { status: newStatus });
      showToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
      // Optimistic update
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update ticket status';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusOptions: SegmentOption<'all' | TicketStatus>[] = [
    { value: 'all', label: 'All Tickets' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 20px 60px' }}>
        {/* Page Header */}
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
            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.025em',
              }}
            >
              Support Tickets
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>
              Manage and track your reported issues and service requests
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0, 113, 227, 0.25)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Ticket</span>
          </button>
        </div>

        {/* Filter Segmented Control */}
        <div style={{ marginBottom: 24 }}>
          <SegmentedControl
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
          />
        </div>

        {/* Tickets Grid / List */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: 24,
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <Skeleton width={70} height={24} borderRadius={12} />
                  <Skeleton width={60} height={24} borderRadius={12} />
                </div>
                <Skeleton width="80%" height={22} style={{ marginBottom: 12 }} />
                <Skeleton width="100%" height={16} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={16} style={{ marginBottom: 20 }} />
                <Skeleton width="100%" height={36} borderRadius={8} />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          /* Empty State */
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-subtle)',
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#F2F2F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary)',
                marginBottom: 16,
              }}
            >
              <TicketIcon size={26} />
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {statusFilter === 'all' ? 'No tickets created yet' : `No ${statusFilter.replace('_', ' ')} tickets`}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                maxWidth: 380,
                marginTop: 6,
                marginBottom: 20,
              }}
            >
              Create your first support ticket to track technical questions, system issues, or feature requests.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-primary)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <Plus size={16} />
              <span>Create Ticket</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 18,
            }}
          >
            {tickets.map((ticket) => {
              const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={ticket._id}
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    boxShadow: 'var(--shadow-subtle)',
                    padding: '20px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-subtle)';
                  }}
                >
                  <div>
                    {/* Header Badges */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        <Calendar size={13} />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.35,
                        marginBottom: 8,
                      }}
                    >
                      {ticket.title}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: 14,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        marginBottom: 20,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {ticket.description || 'No additional details provided.'}
                    </p>
                  </div>

                  {/* Footer: Status Quick-Update Control */}
                  <div
                    style={{
                      paddingTop: 14,
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                      Update Status:
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['open', 'in_progress', 'closed'] as TicketStatus[]).map((st) => {
                        const isCurrent = ticket.status === st;
                        const isBusy = updatingId === ticket._id;

                        let icon = <AlertCircle size={12} />;
                        if (st === 'in_progress') icon = <Clock size={12} />;
                        if (st === 'closed') icon = <Check size={12} />;

                        return (
                          <button
                            key={st}
                            disabled={isCurrent || isBusy}
                            onClick={() => handleStatusChange(ticket._id, st)}
                            style={{
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: 'var(--radius-sm)',
                              border: isCurrent ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
                              backgroundColor: isCurrent ? 'var(--accent-subtle)' : '#FFFFFF',
                              color: isCurrent ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: isBusy ? 0.6 : 1,
                              cursor: isCurrent ? 'default' : 'pointer',
                            }}
                          >
                            {icon}
                            <span>{st === 'in_progress' ? 'Progress' : st.charAt(0).toUpperCase() + st.slice(1)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTicketCreated={fetchTickets}
      />
    </div>
  );
};
