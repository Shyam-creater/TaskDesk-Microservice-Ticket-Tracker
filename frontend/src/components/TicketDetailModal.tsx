import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Ticket, TicketStatus, formatTicketId } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge, PriorityBadge } from './Badge';
import { ChatThread } from './ChatThread';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  X,
  Clock,
  User as UserIcon,
  CheckCircle,
  Trash2,
  Edit2,
  Save,
  Shield,
  ArrowRight,
  Tag,
} from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated: (updated: Ticket) => void;
  onTicketDeleted?: (ticketId: string) => void;
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_review'],
  in_review: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onTicketUpdated,
  onTicketDeleted,
}) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [currentTicket, setCurrentTicket] = useState<Ticket>(ticket);
  const [editingContent, setEditingContent] = useState(false);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description || '');
  const [savingContent, setSavingContent] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const modalScrollRef = React.useRef<HTMLDivElement>(null);

  // Sync state if prop changes
  React.useEffect(() => {
    setCurrentTicket(ticket);
    setTitle(ticket.title);
    setDescription(ticket.description || '');
    setEditingContent(false);
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [ticket, isOpen]);

  if (!isOpen || !user) return null;

  const isOwner = currentTicket.createdBy === user.id;
  const canEditContent = isOwner && currentTicket.status === 'open';

  // Available next status transitions for Admin
  const availableStatuses = ALLOWED_TRANSITIONS[currentTicket.status] || [];

  // Handle User Edit Content (Title / Description)
  const handleSaveContent = async () => {
    if (!title.trim() || title.trim().length < 3) {
      showToast('Title must be at least 3 characters', 'error');
      return;
    }

    setSavingContent(true);
    try {
      const response = await apiClient.patch(`/tickets/${currentTicket._id}`, {
        title: title.trim(),
        description: description.trim(),
      });
      const updated = response.data.data.ticket;
      setCurrentTicket(updated);
      onTicketUpdated(updated);
      setEditingContent(false);
      showToast('Ticket content updated successfully', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update ticket';
      showToast(msg, 'error');
    } finally {
      setSavingContent(false);
    }
  };

  // Handle Admin Status Update
  const handleStatusChange = async (nextStatus: TicketStatus) => {
    setUpdatingStatus(true);
    try {
      const response = await apiClient.patch(`/tickets/${currentTicket._id}/status`, {
        status: nextStatus,
      });
      const updated = response.data.data.ticket;
      setCurrentTicket(updated);
      onTicketUpdated(updated);
      showToast(`Status changed to ${nextStatus.replace('_', ' ')}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid status transition';
      showToast(msg, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Admin Mark as Reviewed
  const handleReviewTicket = async () => {
    setReviewing(true);
    try {
      const response = await apiClient.patch(`/tickets/${currentTicket._id}/review`, {});
      const updated = response.data.data.ticket;
      setCurrentTicket(updated);
      onTicketUpdated(updated);
      showToast('Ticket marked as reviewed', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to review ticket';
      showToast(msg, 'error');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1040,
            maxHeight: '90vh',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-modal)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAFAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusBadge status={currentTicket.status} />
              <PriorityBadge priority={currentTicket.priority} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                ID: {currentTicket._id}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content - Two Column Layout */}
          <div
            ref={modalScrollRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.1fr)',
              gap: 24,
              padding: 24,
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {/* Left Column: Ticket Info & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Title & Description */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 20,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: 'var(--accent-subtle)',
                        color: 'var(--accent-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    >
                      <Tag size={12} />
                      <span>{formatTicketId(currentTicket)}</span>
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Ticket Details
                    </span>
                  </div>
                  {canEditContent && !editingContent && (
                    <button
                      type="button"
                      onClick={() => setEditingContent(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit Content</span>
                    </button>
                  )}
                </div>

                {editingContent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: 14,
                          marginTop: 4,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: 14,
                          marginTop: 4,
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setTitle(currentTicket.title);
                          setDescription(currentTicket.description || '');
                          setEditingContent(false);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: '#FFFFFF',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveContent}
                        disabled={savingContent}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          backgroundColor: 'var(--accent-primary)',
                          color: '#FFFFFF',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Save size={14} />
                        <span>{savingContent ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: 8,
                        lineHeight: 1.35,
                      }}
                    >
                      {currentTicket.title}
                    </h2>
                    <p
                      style={{
                        fontSize: 14,
                        color: currentTicket.description ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {currentTicket.description || 'No description provided.'}
                    </p>
                  </div>
                )}

                {/* Metadata Row */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-light)',
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Tag size={13} color="var(--accent-primary)" />
                    <span>
                      Ticket ID:{' '}
                      <strong style={{ color: 'var(--text-primary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                        {formatTicketId(currentTicket)}
                      </strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} />
                    <span>Created: {new Date(currentTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <UserIcon size={13} color="var(--accent-primary)" />
                    <span>
                      Raised by:{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {currentTicket.createdByName || currentTicket.createdByEmail || `User ${currentTicket.createdBy.substring(0, 8)}`}
                      </strong>
                      {currentTicket.createdByEmail && ` (${currentTicket.createdByEmail})`}
                    </span>
                  </div>
                  {currentTicket.reviewedAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5856D6' }}>
                      <CheckCircle size={13} />
                      <span>Reviewed on {new Date(currentTicket.reviewedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Actions Panel */}
              {isAdmin && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 20,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 14,
                    }}
                  >
                    Administrator Controls
                  </span>

                  {/* Mark as Reviewed Button */}
                  {!currentTicket.reviewedBy && (
                    <button
                      type="button"
                      onClick={handleReviewTicket}
                      disabled={reviewing}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: '#5856D6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      <Shield size={16} />
                      <span>{reviewing ? 'Marking as reviewed...' : 'Mark as Reviewed'}</span>
                    </button>
                  )}

                  {/* Status Transition Control */}
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: 6,
                      }}
                    >
                      Change Status (Lifecycle Validated)
                    </label>

                    {availableStatuses.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {availableStatuses.map((next) => (
                          <button
                            key={next}
                            type="button"
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange(next)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--accent-primary)',
                              backgroundColor: 'var(--accent-subtle)',
                              color: 'var(--accent-primary)',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <span>Move to {next.replace('_', ' ')}</span>
                            <ArrowRight size={13} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        Current status ({currentTicket.status}) has no direct forward transitions.
                      </p>
                    )}
                  </div>

                  {/* Delete Action */}
                  <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255, 59, 48, 0.3)',
                        backgroundColor: 'var(--status-danger-bg)',
                        color: 'var(--status-danger)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Delete Ticket</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status Transition History */}
              {currentTicket.statusHistory && currentTicket.statusHistory.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 18,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 10,
                    }}
                  >
                    Status Transition History
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {currentTicket.statusHistory.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          padding: '6px 8px',
                          backgroundColor: '#F9F9FB',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {item.from}
                          </span>
                          <ArrowRight size={12} color="var(--text-tertiary)" />
                          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                            {item.to}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                          {new Date(item.changedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live Chat Thread */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <ChatThread ticket={currentTicket} currentUser={user} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal for Admin */}
      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          ticket={currentTicket}
          onTicketDeleted={() => {
            setShowDeleteModal(false);
            onClose();
            if (onTicketDeleted) {
              onTicketDeleted(currentTicket._id);
            }
          }}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
};
