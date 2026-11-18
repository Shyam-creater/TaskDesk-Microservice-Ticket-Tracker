import React, { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { AlertTriangle } from 'lucide-react';
import { Ticket } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onTicketDeleted: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onTicketDeleted,
}) => {
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  if (!ticket) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/tickets/${ticket._id}`);
      showToast('Ticket deleted permanently', 'success');
      onTicketDeleted();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete ticket';
      showToast(message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Ticket" maxWidth={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
              Are you sure you want to permanently delete this ticket?
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginTop: 6,
                backgroundColor: '#F5F5F7',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
              }}
            >
              <strong>{ticket.title}</strong>
            </p>
            <p style={{ fontSize: 12, color: 'var(--status-danger)', marginTop: 8 }}>
              This action cannot be undone. Only administrators can delete tickets.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#F2F2F7',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '9px 18px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-danger)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Ticket'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
