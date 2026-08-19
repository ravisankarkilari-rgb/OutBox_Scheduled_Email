import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('reachinbox_token');
      if (savedToken) {
        try {
          setToken(savedToken);
          // Configure global auth header before loading user profile
          api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('[AuthContext] Failed to retrieve profile with cached token:', error);
          localStorage.removeItem('reachinbox_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (newToken: string) => {
    setLoading(true);
    try {
      localStorage.setItem('reachinbox_token', newToken);
      setToken(newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('[AuthContext] Login validation failed:', error);
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Optional: inform backend of logout
      await api.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.removeItem('reachinbox_token');
      setToken(null);
      setUser(null);
      setLoading(false);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
