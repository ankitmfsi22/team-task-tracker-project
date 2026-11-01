import { Link, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

export function AppLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <nav aria-label="Main" className="flex items-center gap-6">
            <Link to="/projects" className="text-base font-semibold">
              Team Task Tracker
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? <span className="text-sm text-muted-foreground">{user.name}</span> : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
