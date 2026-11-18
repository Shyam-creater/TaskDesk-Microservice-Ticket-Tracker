import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Ticket, TicketStatus, formatTicketId } from '../types';
import { Navbar } from '../components/Navbar';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { SegmentedControl, SegmentOption } from '../components/SegmentedControl';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { ViewToggle, ViewMode } from '../components/ViewToggle';
import { Skeleton } from '../components/Skeleton';
import { Plus, Ticket as TicketIcon, Calendar, MessageSquare, ChevronRight, Tag, CheckCircle2 } from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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

        {/* Filter Segmented Control & View Mode Switcher */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <SegmentedControl
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
            />
          </div>

          {/* Table / Grid Format Switcher */}
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {/* Tickets Grid / Table Content */}
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
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>Create Ticket</span>
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* ==================== USER TABLE FORMAT ==================== */
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      backgroundColor: '#FBFBFD',
                    }}
                  >
                    <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ticket ID
                    </th>
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
                      Date Created
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
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
                        {/* Custom Ticket ID */}
                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: 4,
                              backgroundColor: 'var(--accent-subtle)',
                              color: 'var(--accent-primary)',
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              letterSpacing: '0.02em',
                            }}
                          >
                            <Tag size={12} />
                            <span>{formatTicketId(ticket)}</span>
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px', maxWidth: 380 }}>
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

                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={ticket.status} />
                        </td>

                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                          <PriorityBadge priority={ticket.priority} />
                        </td>

                        <td style={{ padding: '16px 16px', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} color="var(--text-tertiary)" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
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
                            <MessageSquare size={13} />
                            <span>Open & Chat</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ==================== USER GRID FORMAT ==================== */
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

              const priorityColor =
                ticket.priority === 'high'
                  ? '#FF3B30'
                  : ticket.priority === 'medium'
                  ? '#FF9500'
                  : '#0071E3';

              return (
                <div
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E5EA',
                    borderLeft: `4px solid ${priorityColor}`,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    padding: '20px 22px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 26px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(0, 113, 227, 0.35)';
                    e.currentTarget.style.borderLeftColor = priorityColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.borderColor = '#E5E5EA';
                    e.currentTarget.style.borderLeftColor = priorityColor;
                  }}
                >
                  <div>
                    {/* Header: Left ID & Priority, Right Status */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(0, 113, 227, 0.08)',
                            color: 'var(--accent-primary)',
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            letterSpacing: '0.02em',
                          }}
                        >
                          <Tag size={11} />
                          <span>{formatTicketId(ticket)}</span>
                        </span>
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.35,
                        marginTop: 10,
                        marginBottom: 6,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {ticket.title}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: 14,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {ticket.description || 'No additional details provided.'}
                    </p>

                    {/* Meta Row: Date & Review status */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'var(--text-tertiary)',
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={12} />
                        <span>Created {formattedDate}</span>
                      </div>
                      {ticket.reviewedAt && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#5856D6',
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Reviewed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div
                    style={{
                      paddingTop: 12,
                      borderTop: '1px solid #F2F2F7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <MessageSquare size={13} color="var(--accent-primary)" />
                      <span>Live Chat</span>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '5px 12px',
                        borderRadius: 8,
                        backgroundColor: 'var(--accent-primary)',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: '0 2px 6px rgba(0, 113, 227, 0.25)',
                      }}
                    >
                      <span>Open Ticket</span>
                      <ChevronRight size={13} />
                    </span>
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
