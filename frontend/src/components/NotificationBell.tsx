import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiClient.get('/notifications');
      const data = response.data.data;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  // Initial load and periodic polling every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      setLoading(true);
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await apiClient.patch('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      await apiClient.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await handleMarkAsRead(notif._id);
    }
    setIsOpen(false);

    if (notif.ticketId || notif.customId) {
      const targetTicket = notif.ticketId || notif.customId;
      const targetPath = isAdmin ? `/admin?ticket=${targetTicket}` : `/tickets?ticket=${targetTicket}`;
      navigate(targetPath);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderIcon = (type: Notification['type']) => {
    switch (type) {
      case 'ticket_created':
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(0, 113, 227, 0.1)',
              color: '#0071E3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} />
          </div>
        );
      case 'status_updated':
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(52, 199, 89, 0.12)',
              color: '#34C759',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={15} />
          </div>
        );
      case 'ticket_reviewed':
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(175, 82, 222, 0.12)',
              color: '#AF52DE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={16} />
          </div>
        );
      case 'message_received':
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(90, 200, 250, 0.15)',
              color: '#0071E3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageSquare size={15} />
          </div>
        );
      default:
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#F2F2F7',
              color: '#8E8E93',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={15} />
          </div>
        );
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-light)',
          backgroundColor: isOpen ? '#F2F2F7' : 'transparent',
          color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F2F2F7';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)';
          }
        }}
      >
        <Bell size={17} />

        {/* Unread Badge Indicator */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxShadow: '0 2px 4px rgba(255, 59, 48, 0.4)',
              border: '1.5px solid #FFFFFF',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Apple-Styled Notification Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 360,
            maxHeight: 480,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            borderRadius: 16,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(250, 250, 252, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(0, 113, 227, 0.1)',
                    color: '#0071E3',
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0071E3',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 6px',
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 113, 227, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <CheckCheck size={13} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: 380,
              padding: '4px 0',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#F2F2F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8E8E93',
                  }}
                >
                  <CheckCircle2 size={22} color="#34C759" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    All caught up!
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    No notifications at this time
                  </div>
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    cursor: 'pointer',
                    backgroundColor: notif.read ? 'transparent' : 'rgba(0, 113, 227, 0.035)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                    transition: 'background-color 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F7')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = notif.read
                      ? 'transparent'
                      : 'rgba(0, 113, 227, 0.035)')
                  }
                >
                  {/* Left Icon Badge */}
                  {renderIcon(notif.type)}

                  {/* Body Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: notif.read ? 600 : 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {notif.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-tertiary)',
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        margin: 0,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {notif.message}
                    </p>

                    {notif.customId && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          padding: '1px 5px',
                          borderRadius: 4,
                          backgroundColor: '#E5E5EA',
                          color: '#3A3A3C',
                        }}
                      >
                        {notif.customId}
                      </span>
                    )}
                  </div>

                  {/* Action: Unread Dot or Delete */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      alignSelf: 'center',
                    }}
                  >
                    {!notif.read && (
                      <div
                        title="Unread"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#0071E3',
                        }}
                      />
                    )}
                    <button
                      onClick={(e) => handleDelete(notif._id, e)}
                      title="Delete notification"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: 4,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.color = 'var(--status-danger)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.6';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
