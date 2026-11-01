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
  if (status === 'loading') return <LoadingState />;
  if (status === 'authenticated') return <Navigate to="/projects" replace />;
  return <Outlet />;
}
