import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Ticket, TicketStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { SegmentedControl, SegmentOption } from '../components/SegmentedControl';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { Skeleton } from '../components/Skeleton';
import { Plus, Ticket as TicketIcon, Calendar, MessageSquare, ChevronRight } from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    setSelectedTicket(updated);
  };

  const handleTicketDeleted = (deletedId: string) => {
    setTickets((prev) => prev.filter((t) => t._id !== deletedId));
    setSelectedTicket(null);
  };

  const statusOptions: SegmentOption<'all' | TicketStatus>[] = [
    { value: 'all', label: 'All Tickets' },
    { value: 'open', label: 'Open' },
    { value: 'in_review', label: 'In Review' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
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
              My Support Tickets
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>
              Track reported issues and collaborate with support administrators in real time
            </p>
          </div>

          {/* Only Users can create tickets; Admins cannot */}
          {!isAdmin && (
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
                cursor: 'pointer',
                border: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Ticket</span>
            </button>
          )}
        </div>

        {/* Filter Segmented Control */}
        <div style={{ marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
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
              {!isAdmin
                ? 'Create your first support ticket to track technical questions, system issues, or feature requests.'
                : 'No tickets currently match the selected status filter.'}
            </p>
            {!isAdmin && (
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
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Create Ticket</span>
              </button>
            )}
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
                  onClick={() => setSelectedTicket(ticket)}
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    boxShadow: 'var(--shadow-subtle)',
                    padding: '20px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-subtle)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
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
                        marginBottom: 16,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {ticket.description || 'No additional details provided.'}
                    </p>
                  </div>

                  {/* Footer: View & Chat Action Bar */}
                  <div
                    style={{
                      paddingTop: 14,
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary)', fontSize: 13, fontWeight: 600 }}>
                      <MessageSquare size={14} />
                      <span>Open Ticket & Chat</span>
                    </div>
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Ticket Modal */}
      {!isAdmin && (
        <CreateTicketModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onTicketCreated={fetchTickets}
        />
      )}

      {/* Ticket Details & Live Chat Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={handleTicketUpdated}
          onTicketDeleted={handleTicketDeleted}
        />
      )}
    </div>
  );
};
