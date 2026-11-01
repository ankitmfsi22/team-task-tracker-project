import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingState } from '@/components/states';
import { useAuth } from '@/lib/auth/auth-context';

// Routes that need a session: anonymous visitors go to the login page and come back afterwards.
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Login and register: signed-in users go straight to the project list.
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState />;
  if (status === 'authenticated') {
    return <Navigate to={requestedLocation(location.state) ?? '/projects'} replace />;
  }
  return <Outlet />;
}

// ProtectedRoute stores the page the visitor originally asked for in the router state.
function requestedLocation(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('from' in state)) return null;
  const { from } = state;
  if (typeof from !== 'object' || from === null || !('pathname' in from)) return null;
  const { pathname } = from;
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null;
  const search = 'search' in from && typeof from.search === 'string' ? from.search : '';
  return `${pathname}${search}`;
}
