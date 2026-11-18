import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('taskdesk_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('taskdesk_token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Validate existing token with /auth/me on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('taskdesk_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        const currentUser = response.data.data.user;
        setUser(currentUser);
        localStorage.setItem('taskdesk_user', JSON.stringify(currentUser));
      } catch {
        // If token invalid, clear
        localStorage.removeItem('taskdesk_token');
        localStorage.removeItem('taskdesk_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = response.data.data;

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('taskdesk_token', receivedToken);
    localStorage.setItem('taskdesk_user', JSON.stringify(receivedUser));
    return receivedUser;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<User> => {
      const response = await apiClient.post('/auth/register', { name, email, password });
      const { token: receivedToken, user: receivedUser } = response.data.data;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('taskdesk_token', receivedToken);
      localStorage.setItem('taskdesk_user', JSON.stringify(receivedUser));
      return receivedUser;
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('taskdesk_token');
    localStorage.removeItem('taskdesk_user');
  }, []);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
