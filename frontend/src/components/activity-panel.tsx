import { useQuery } from '@tanstack/react-query';
import type { ActivityResponse, MemberResponse } from '@team-task-tracker/shared';
import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { listActivity } from '@/lib/api/activity';
import { formatTimestamp, humanize } from '@/lib/humanize';

const PAGE_SIZE = 20;

function memberName(id: string | null, members: MemberResponse[]): string {
  if (id === null) return 'Unassigned';
  return members.find((member) => member.userId === id)?.name ?? 'Former member';
}

export function describeActivity(entry: ActivityResponse, members: MemberResponse[]): string {
  switch (entry.action) {
    case 'TASK_CREATED':
      return `created the task "${entry.metadata.title}"`;
    case 'TASK_STATUS_CHANGED':
      return `changed status from ${humanize(entry.metadata.from)} to ${humanize(entry.metadata.to)}`;
    case 'TASK_ASSIGNED':
      return `changed assignee from ${memberName(entry.metadata.from, members)} to ${memberName(entry.metadata.to, members)}`;
    case 'TASK_ARCHIVED':
      return 'archived the task';
  }
}

export function ActivityPanel({
  projectId,
  taskId,
  members,
}: {
  projectId: string;
  taskId: string;
  members: MemberResponse[];
}) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['activity', projectId, taskId, page],
    queryFn: () => listActivity(projectId, taskId, { page, pageSize: PAGE_SIZE }),
  });

  const totalPages = query.data?.meta.totalPages ?? 0;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-lg font-semibold">
        Activity
      </h2>
      {/* Reserves the list height so the panel below does not jump when the list loads. */}
      <div className="min-h-44">
        {query.isPending ? <LoadingState label="Loading activity…" /> : null}
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : null}
        {query.isSuccess && query.data.data.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : null}
        {query.isSuccess && query.data.data.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {query.data.data.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium">{entry.actor.name}</span>{' '}
                  {describeActivity(entry, members)}
                </p>
                <time dateTime={entry.createdAt} className="text-muted-foreground">
                  {formatTimestamp(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}
