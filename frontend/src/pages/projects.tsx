import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listProjects, projectKeys } from '@/lib/api/projects';

const PAGE_SIZE = 20;

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const parsedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const params = { page, pageSize: PAGE_SIZE, includeArchived };

  const query = useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => listProjects(params),
    placeholderData: keepPreviousData,
  });

  function update(next: { page?: number; includeArchived?: boolean }) {
    const merged = { page, includeArchived, ...next };
    const nextParams = new URLSearchParams();
    if (merged.page > 1) nextParams.set('page', String(merged.page));
    if (merged.includeArchived) nextParams.set('includeArchived', 'true');
    setSearchParams(nextParams);
  }

  const createAction = (
    <Button type="button" onClick={() => setCreating(true)}>
      Create project
    </Button>
  );

  let content;
  if (query.isPending) {
    content = <LoadingState label="Loading projects…" />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  } else if (query.data.data.length === 0) {
    content = (
      <EmptyState
        title="No projects yet"
        description="Create your first project to start tracking work."
        action={createAction}
      />
    );
  } else {
    const { data, meta } = query.data;
    content = (
      <>
        <ul className="divide-y divide-border rounded-md border border-border">
          {data.map((project) => (
            <li key={project.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link to={`/projects/${project.id}`} className="font-medium underline">
                  {project.name}
                </Link>
                {project.description ? (
                  <p className="truncate text-sm text-muted-foreground">{project.description}</p>
                ) : null}
              </div>
              {project.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
            </li>
          ))}
        </ul>
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => update({ page: meta.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {Math.max(meta.totalPages, 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => update({ page: meta.page + 1 })}
          >
            Next
          </Button>
        </nav>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          New project
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => update({ page: 1, includeArchived: event.target.checked })}
        />
        Include archived
      </label>
      {content}
      <CreateProjectDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
