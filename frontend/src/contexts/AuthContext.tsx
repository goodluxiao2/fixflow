'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User } from '@/lib/api';
import { DEMO_USER, DEMO_ADMIN_USER } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  enterDemoMode: (asAdmin?: boolean) => void;
  exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_MODE_KEY = 'bounty_hunter_demo_mode';
const DEMO_ADMIN_KEY = 'bounty_hunter_demo_admin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const refreshUser = async () => {
    try {
      // Check for demo mode first
      if (typeof window !== 'undefined') {
        const demoMode = localStorage.getItem(DEMO_MODE_KEY);
        const demoAdmin = localStorage.getItem(DEMO_ADMIN_KEY);
        if (demoMode === 'true') {
          setIsDemo(true);
          setUser(demoAdmin === 'true' ? DEMO_ADMIN_USER : DEMO_USER);
          return;
        }
      }

      const token = api.getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      api.setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      await refreshUser();
      setLoading(false);
    };
    init();
  }, []);

  const login = async () => {
    try {
      const { authUrl } = await api.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      if (isDemo) {
        exitDemoMode();
        return;
      }
      await api.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const enterDemoMode = (asAdmin: boolean = false) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_MODE_KEY, 'true');
      localStorage.setItem(DEMO_ADMIN_KEY, asAdmin ? 'true' : 'false');
    }
    setIsDemo(true);
    setUser(asAdmin ? DEMO_ADMIN_USER : DEMO_USER);
  };

  const exitDemoMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_MODE_KEY);
      localStorage.removeItem(DEMO_ADMIN_KEY);
    }
    setIsDemo(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, login, logout, refreshUser, enterDemoMode, exitDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}