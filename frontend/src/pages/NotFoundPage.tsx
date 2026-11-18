import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'var(--bg-primary)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#E5E5EA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          marginBottom: 16,
        }}
      >
        <HelpCircle size={28} />
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginTop: 6,
          marginBottom: 24,
          maxWidth: 360,
        }}
      >
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/tickets"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--accent-primary)',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Tickets</span>
      </Link>
    </div>
  );
};
