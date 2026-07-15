'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, setTokens, getTokens, clearTokens } from '@/lib/api/client';
import type { UserRole } from '@/models/User';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  societyId: string | null;
  unitId: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    const tokens = getTokens();
    if (tokens.accessToken) {
      const storedUser = localStorage.getItem('societyos_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          clearTokens();
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    setTokens(result.data.accessToken, result.data.refreshToken);
    setUser(result.data.user);
    localStorage.setItem('societyos_user', JSON.stringify(result.data.user));
    return { success: true };
  }, []);

  const signup = useCallback(async (data: Record<string, unknown>) => {
    const result = await apiClient('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await apiClient('/api/auth/logout', { method: 'POST' });
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
