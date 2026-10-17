import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  role: 'USER' | 'ADMIN';
  status: 'active' | 'suspended';
  apiKey: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (login: string, pass: string) => Promise<User>;
  register: (username: string, email: string, pass: string) => Promise<User>;
  loginWithGoogle: (payload: { email?: string; name?: string; credential?: string }) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  toasts: ToastMessage[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('digitalsmm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToasts((prev) => {
      // Avoid duplicate consecutive notifications
      if (prev.length > 0 && prev[prev.length - 1].message === message) {
        return prev;
      }
      const id = Math.random().toString(36).substring(2, 9);
      const next = [...prev, { id, message, type }];
      return next.slice(-3);
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.message !== message));
    }, 4000);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const data = await api.auth.getProfile();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      // If unauthorized, clear token
      if (token) {
        logout();
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await refreshProfile();
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (loginStr: string, pass: string): Promise<User> => {
    const data = await api.auth.login(loginStr, pass);
    if (data.token && data.user) {
      localStorage.setItem('digitalsmm_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Welcome back, ${data.user.username}!`, 'success');
      return data.user;
    }
    throw new Error('Authentication failed: Missing user session');
  };

  const register = async (username: string, email: string, pass: string): Promise<User> => {
    const data = await api.auth.register(username, email, pass);
    if (data.token && data.user) {
      localStorage.setItem('digitalsmm_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast('Registration successful! Welcome to DigitalSMM.', 'success');
      return data.user;
    }
    throw new Error('Registration failed: Missing user session');
  };

  const loginWithGoogle = async (payload: { email?: string; name?: string; credential?: string }): Promise<User> => {
    const data = await api.auth.googleLogin(payload);
    if (data.token && data.user) {
      localStorage.setItem('digitalsmm_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Welcome ${data.user.username}! Signed in with Google.`, 'success');
      return data.user;
    }
    throw new Error('Google authentication failed: Missing user session');
  };

  const logout = () => {
    localStorage.removeItem('digitalsmm_token');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        loginWithGoogle,
        logout,
        refreshProfile,
        showToast,
        removeToast,
        toasts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
