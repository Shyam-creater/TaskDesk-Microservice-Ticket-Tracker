import React, { useState } from 'react';
import { Modal } from './Modal';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { TicketPriority } from '../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onTicketCreated,
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const validate = () => {
    const newErrors: { title?: string } = {};
    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    } else if (title.trim().length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiClient.post('/tickets', {
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      showToast('Ticket created successfully', 'success');
      setTitle('');
      setDescription('');
      setPriority('medium');
      onTicketCreated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create ticket';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Ticket"
      subtitle="Report an issue or request assistance"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Title Input */}
        <div>
          <label
            htmlFor="ticket-title"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            Title <span style={{ color: 'var(--status-danger)' }}>*</span>
          </label>
          <input
            id="ticket-title"
            type="text"
            placeholder="e.g. Database connection latency spike"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors({});
            }}
            style={{
              width: '100%',
              height: 44,
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${errors.title ? 'var(--status-danger)' : 'var(--border-color)'}`,
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              boxShadow: errors.title ? '0 0 0 3px rgba(255, 59, 48, 0.15)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
            onFocus={(e) => {
              if (!errors.title) {
                e.target.style.borderColor = 'var(--accent-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 113, 227, 0.18)';
              }
            }}
            onBlur={(e) => {
              if (!errors.title) {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'none';
              }
            }}
          />
          {errors.title && (
            <p style={{ fontSize: 12, color: 'var(--status-danger)', marginTop: 4 }}>{errors.title}</p>
          )}
        </div>

        {/* Priority Selector */}
        <div>
          <label
            htmlFor="ticket-priority"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            Priority
          </label>
          <select
            id="ticket-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            style={{
              width: '100%',
              height: 44,
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
            }}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        {/* Description Input */}
        <div>
          <label
            htmlFor="ticket-desc"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            Description <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Optional)</span>
          </label>
          <textarea
            id="ticket-desc"
            rows={4}
            placeholder="Provide context, reproduction steps, or details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 18px',
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
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
