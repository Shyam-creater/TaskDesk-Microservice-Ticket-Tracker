import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';
import { Message, Ticket, User } from '../types';
import { useToast } from '../context/ToastContext';
import { Send, Shield, User as UserIcon, Lock, RefreshCw } from 'lucide-react';

interface ChatThreadProps {
  ticket: Ticket;
  currentUser: User;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ ticket, currentUser }) => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const isClosed = ticket.status === 'closed';
  const isUserBlocked = isClosed && currentUser.role !== 'admin';

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const response = await apiClient.get(`/tickets/${ticket._id}/messages`);
      const fetched: Message[] = response.data.data.messages || [];
      setMessages(fetched);
    } catch (err: unknown) {
      if (!silent) {
        const msg = err instanceof Error ? err.message : 'Failed to load messages';
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [ticket._id, showToast]);

  // Initial fetch and 5s polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending || isUserBlocked) return;

    const text = inputText.trim();
    setSending(true);
    try {
      const response = await apiClient.post(`/tickets/${ticket._id}/messages`, {
        body: text,
      });
      const newMsg: Message = response.data.data.message;
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 450,
        maxHeight: 600,
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(249, 249, 251, 0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Conversation History
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#E5E5EA',
              color: '#3A3A3C',
            }}
          >
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Live (5s poll)</span>
          <button
            type="button"
            onClick={() => fetchMessages(false)}
            disabled={isRefreshing}
            title="Refresh conversation"
            style={{
              border: 'none',
              background: 'transparent',
              padding: 4,
              borderRadius: 4,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={messageListRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#FBFBFD',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              padding: '30px 10px',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>No messages yet</p>
            <p style={{ fontSize: 12 }}>Send a message below to start the support conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUserMsg = msg.senderRole === 'user';
            const isMyMessage = msg.senderId === currentUser.id;

            return (
              <div
                key={msg._id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMyMessage ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Sender Tag */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    marginBottom: 3,
                    padding: '0 4px',
                  }}
                >
                  {isUserMsg ? (
                    <UserIcon size={12} color="var(--accent-primary)" />
                  ) : (
                    <Shield size={12} color="#5856D6" />
                  )}
                  <span>{isUserMsg ? (isMyMessage ? 'You' : 'User') : 'Support Admin'}</span>
                </div>

                {/* Bubble - iMessage styling */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: isMyMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: isUserMsg ? '#0071E3' : '#E9E9EB',
                    color: isUserMsg ? '#FFFFFF' : '#1C1C1E',
                    fontSize: 14,
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    boxShadow: isUserMsg
                      ? '0 2px 6px rgba(0, 113, 227, 0.25)'
                      : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {msg.body}
                </div>

                {/* Timestamp */}
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    marginTop: 3,
                    padding: '0 6px',
                  }}
                >
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input or Closed Notice */}
      {isUserBlocked ? (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#F2F2F7',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          <Lock size={16} color="var(--text-tertiary)" />
          <span>This ticket is closed. An administrator must reopen it to resume conversation.</span>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            gap: 8,
            backgroundColor: '#FFFFFF',
          }}
        >
          <input
            type="text"
            placeholder={
              currentUser.role === 'admin'
                ? 'Reply as support administrator...'
                : 'Type a message to support...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            maxLength={1000}
            style={{
              flex: 1,
              height: 40,
              padding: '0 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#F2F2F7',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: inputText.trim() && !sending ? 'var(--accent-primary)' : '#E5E5EA',
              color: inputText.trim() && !sending ? '#FFFFFF' : '#8E8E93',
              border: 'none',
              cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
};
