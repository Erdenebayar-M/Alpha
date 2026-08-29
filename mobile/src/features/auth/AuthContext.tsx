import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authApi from '@/src/api/auth';
import type { Parent } from '@/src/api/auth';
import { clearToken, getToken, setToken as persistToken } from '@/src/lib/secureStore';
import { onUnauthorized } from '@/src/lib/authEvents';
import { queryClient } from '@/src/lib/queryClient';

interface AuthContextValue {
  parent: Parent | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setParent(me);
      } catch {
        await clearToken();
        setParent(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // A 401 from any request (client.ts) clears the token, but only this can
  // clear the React state that (app)/_layout.tsx actually gates on — without
  // it the app stays on an authenticated screen with an empty keychain,
  // re-401ing on every subsequent request.
  useEffect(() => {
    return onUnauthorized(() => {
      setParent(null);
      queryClient.clear();
    });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    await persistToken(response.token);
    setParent({ id: response.id, email: response.email, name: response.name });
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authApi.register({ name, email, password });
    await persistToken(response.token);
    setParent({ id: response.id, email: response.email, name: response.name });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // local logout should still proceed even if the network call fails
    }
    await clearToken();
    setParent(null);
    queryClient.clear();
  };

  const value = useMemo<AuthContextValue>(
    () => ({ parent, isLoading, isAuthenticated: parent !== null, login, register, logout }),
    [parent, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
