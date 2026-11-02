import { useQueryClient } from '@tanstack/react-query';
import type { UserResponse } from '@team-task-tracker/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchCurrentUser, logoutRequest } from '../api/auth';
import { refreshSession, setSessionExpiredHandler } from '../api/client';
import { setAccessToken } from './token';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: UserResponse | null;
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SESSION_HINT_KEY = 'ttt.session';

// The hint is a non-secret flag (not a token) so an anonymous visitor does not trigger a failing refresh call.
function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function setSessionHint(on: boolean): void {
  try {
    if (on) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage unavailable: the session still works for this page load.
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasSessionHint() ? 'loading' : 'anonymous',
  );
  const [user, setUser] = useState<UserResponse | null>(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setSessionHint(false);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
      queryClient.clear();
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession, queryClient]);

  useEffect(() => {
    if (!hasSessionHint()) return;
    let cancelled = false;
    void (async () => {
      try {
        await refreshSession();
        const current = await fetchCurrentUser();
        if (cancelled) return;
        setUser(current);
        setStatus('authenticated');
      } catch {
        if (!cancelled) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const signIn = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    try {
      const current = await fetchCurrentUser();
      setSessionHint(true);
      setUser(current);
      setStatus('authenticated');
    } catch (error) {
      setAccessToken(null);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The local session is cleared even when the server cannot be reached.
    }
    clearSession();
    queryClient.clear();
  }, [clearSession, queryClient]);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
