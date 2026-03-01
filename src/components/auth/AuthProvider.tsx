'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthUser {
  userId: string;
  name: string;
  email?: string;
  role: 'user' | 'admin';
  isGuest: boolean;
  claimedPlayerId?: string;
}

interface AuthContextType {
  user:     AuthUser | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  logout:   () => Promise<void>;
  refresh:  () => Promise<void>;
}

interface RegisterData {
  name:          string;
  email:         string;
  password:      string;
  username?:     string;
  claimPlayerId?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res  = await fetch('/api/auth/me');
      const json = await res.json();
      if (json.success) setUser(json.data.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success) {
        await refresh();
        return null; // no error
      }
      return json.error ?? 'Login failed';
    } catch {
      return 'Network error';
    }
  };

  const register = async (data: RegisterData): Promise<string | null> => {
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await refresh();
        return null;
      }
      return json.error ?? 'Registration failed';
    } catch {
      return 'Network error';
    }
  };

  const logout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
