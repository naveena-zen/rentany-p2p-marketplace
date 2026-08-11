import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, roles: string[]) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rentany_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rentany_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!localStorage.getItem('rentany_token')) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('rentany_user', JSON.stringify(res.data));
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('rentany_token');
      localStorage.removeItem('rentany_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, accessToken } = res.data;
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('rentany_token', accessToken);
    localStorage.setItem('rentany_user', JSON.stringify(userData));
  };

  const register = async (name: string, email: string, password: string, roles: string[]) => {
    const res = await api.post('/auth/register', { name, email, password, roles });
    const { user: userData, accessToken } = res.data;
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('rentany_token', accessToken);
    localStorage.setItem('rentany_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rentany_token');
    localStorage.removeItem('rentany_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
