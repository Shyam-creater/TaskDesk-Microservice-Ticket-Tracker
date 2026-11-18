import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket as TicketIcon, ShieldCheck, LogOut, CheckCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isTicketsActive = location.pathname === '/' || location.pathname === '/tickets';
  const isAdminActive = location.pathname === '/admin';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-light)',
        height: 60,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        {/* Left: Brand & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link
            to={isAdmin ? '/admin' : '/tickets'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <TicketIcon size={17} />
            </div>
            <span>TaskDesk</span>
          </Link>

          <nav style={{ display: 'flex', gap: 8 }}>
            {!isAdmin ? (
              <Link
                to="/tickets"
                style={{
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: isTicketsActive ? 600 : 500,
                  borderRadius: 'var(--radius-sm)',
                  color: isTicketsActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  backgroundColor: isTicketsActive ? 'var(--accent-subtle)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <TicketIcon size={16} />
                <span>My Tickets</span>
              </Link>
            ) : (
              <Link
                to="/admin"
                style={{
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: isAdminActive ? 600 : 500,
                  borderRadius: 'var(--radius-sm)',
                  color: isAdminActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  backgroundColor: isAdminActive ? 'var(--accent-subtle)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ShieldCheck size={16} />
                <span>Admin Console</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right: User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 12px 4px 6px',
              backgroundColor: '#F2F2F7',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: isAdmin ? 'var(--accent-primary)' : '#8E8E93',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {user.name.charAt(0)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                {user.role === 'admin' ? 'Administrator' : 'User'}
              </span>
            </div>
            {isAdmin && <CheckCircle size={14} color="var(--accent-primary)" style={{ marginLeft: 2 }} />}
          </div>

          <button
            onClick={logout}
            aria-label="Logout"
            title="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid var(--border-light)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--status-danger)';
              e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.3)';
              e.currentTarget.style.backgroundColor = 'var(--status-danger-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
