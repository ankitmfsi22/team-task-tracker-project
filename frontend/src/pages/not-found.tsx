import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page does not exist.</p>
      <Link to="/projects" className="mt-4 inline-block text-sm text-primary underline">
        Back to projects
      </Link>
    </main>
  );
}
