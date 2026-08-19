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

function parseJwtUser(token: string): User {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      id: parsed.id || 'usr_2026',
      googleId: parsed.googleId || null,
      email: parsed.email || 'ravisankarkilari@gmail.com',
      name: parsed.name || 'Ravi Sankar Kilari',
      avatar: parsed.avatar || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      id: 'usr_2026',
      googleId: null,
      email: 'ravisankarkilari@gmail.com',
      name: 'Ravi Sankar Kilari',
      avatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('reachinbox_token');
      if (savedToken) {
        setToken(savedToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        
        try {
          const response = await api.get('/auth/me');
          if (response.data && response.data.user) {
            setUser(response.data.user);
          } else {
            setUser(parseJwtUser(savedToken));
          }
        } catch {
          setUser(parseJwtUser(savedToken));
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

      try {
        const response = await api.get('/auth/me');
        if (response.data && response.data.user) {
          setUser(response.data.user);
        } else {
          setUser(parseJwtUser(newToken));
        }
      } catch {
        setUser(parseJwtUser(newToken));
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
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
