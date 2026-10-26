import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api, getAuthToken, saveTokens, clearTokens } from '../services/api.js';
import { initSocket, disconnectSocket } from '../services/socket.js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reloadUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      initSocket();
    } catch {
      setUser(null);
      clearTokens();
      disconnectSocket();
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      reloadUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    const handleLogoutEvent = () => {
      setUser(null);
      disconnectSocket();
    };

    window.addEventListener('bharat_chat_logout', handleLogoutEvent);
    return () => window.removeEventListener('bharat_chat_logout', handleLogoutEvent);
  }, []);

  const login = async (phone: string, pass: string) => {
    const res = await api.login({ phone, password: pass });
    saveTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    initSocket();
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    saveTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    initSocket();
    return res;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    } finally {
      clearTokens();
      setUser(null);
      disconnectSocket();
    }
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
