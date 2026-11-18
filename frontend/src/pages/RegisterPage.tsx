import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Ticket as TicketIcon, ArrowRight, User as UserIcon, Lock, Mail, Shield } from 'lucide-react';
import { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, role);
      showToast('Account created successfully', 'success');
      navigate('/tickets');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)',
          }}
        >
          <TicketIcon size={26} />
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Create your Account
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>
          Join TaskDesk support ticket tracking
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)',
          padding: '32px 28px',
        }}
      >
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 20,
              border: '1px solid rgba(255, 59, 48, 0.2)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Full Name */}
          <div>
            <label
              htmlFor="reg-name"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-name"
                type="text"
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px 0 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
              <UserIcon
                size={16}
                color="var(--text-tertiary)"
                style={{ position: 'absolute', left: 12, top: 14 }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="reg-email"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-email"
                type="email"
                placeholder="sarah@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px 0 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
              <Mail
                size={16}
                color="var(--text-tertiary)"
                style={{ position: 'absolute', left: 12, top: 14 }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="reg-pass"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-pass"
                type="password"
                placeholder="At least 8 chars (uppercase, lowercase, number)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px 0 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
              <Lock
                size={16}
                color="var(--text-tertiary)"
                style={{ position: 'absolute', left: 12, top: 14 }}
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Must contain uppercase, lowercase, and a number
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              Account Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${role === 'user' ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                  backgroundColor: role === 'user' ? 'var(--accent-subtle)' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={role === 'user'}
                  onChange={() => setRole('user')}
                  style={{ display: 'none' }}
                />
                <UserIcon size={16} color={role === 'user' ? 'var(--accent-primary)' : 'var(--text-tertiary)'} />
                <div>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Standard User
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>View & edit own tickets</span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${role === 'admin' ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                  backgroundColor: role === 'admin' ? 'var(--accent-subtle)' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  style={{ display: 'none' }}
                />
                <Shield size={16} color={role === 'admin' ? 'var(--accent-primary)' : 'var(--text-tertiary)'} />
                <div>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Administrator
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>View all & delete tickets</span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 6,
              opacity: submitting ? 0.75 : 1,
            }}
          >
            <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginTop: 20,
          }}
        >
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
