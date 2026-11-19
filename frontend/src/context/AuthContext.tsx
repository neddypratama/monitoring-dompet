import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiRequest } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dompetku_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dompetku_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem('dompetku_token'));
      const saved = localStorage.getItem('dompetku_user');
      setUser(saved ? JSON.parse(saved) : null);
    };

    window.addEventListener('auth_change', handleAuthChange);
    return () => window.removeEventListener('auth_change', handleAuthChange);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem('dompetku_token');
      if (storedToken) {
        try {
          const userData = await apiRequest<User>('/auth/me');
          setUser(userData);
          localStorage.setItem('dompetku_user', JSON.stringify(userData));
        } catch {
          setToken(null);
          setUser(null);
          localStorage.removeItem('dompetku_token');
          localStorage.removeItem('dompetku_user');
        }
      }
      setIsLoading(false);
    }
    checkAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('dompetku_token', newToken);
    localStorage.setItem('dompetku_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('dompetku_token');
    localStorage.removeItem('dompetku_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
