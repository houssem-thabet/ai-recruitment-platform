'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setStoredToken } from '@/lib/api-client';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
  candidateProfileId?: string | null;
  recruiterProfileId?: string | null;
  companyId?: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  unreadNotifications: number;
  unreadMessages: number;
  refreshAuth: () => Promise<void>;
  setSessionAfterAuth: (token: string, user: SessionUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  unreadNotifications: 0,
  unreadMessages: 0,
  refreshAuth: async () => {},
  setSessionAfterAuth: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const router = useRouter();

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiFetch('/api/auth/me');
      setUser(data.user);
      setUnreadNotifications(data.unreadNotifications || 0);
      setUnreadMessages(data.unreadMessages || 0);
    } catch {
      setUser(null);
      setUnreadNotifications(0);
      setUnreadMessages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const setSessionAfterAuth = (token: string, nextUser: SessionUser) => {
    setStoredToken(token);
    setUser(nextUser);
    setLoading(false);
    refreshAuth();
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadNotifications,
        unreadMessages,
        refreshAuth,
        setSessionAfterAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
