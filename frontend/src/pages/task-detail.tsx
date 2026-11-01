import { useQuery } from '@tanstack/react-query';
import type { MemberResponse, TaskResponse } from '@team-task-tracker/shared';
import { Link, useParams } from 'react-router';
import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { getTask, listTaskMembers } from '@/lib/api/tasks';

// "IN_PROGRESS" -> "In progress"
function humanize(value: string): string {
  const text = value.toLowerCase().replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function assigneeName(task: TaskResponse, members: MemberResponse[]): string {
  if (task.assigneeId === null) return 'Unassigned';
  return members.find((member) => member.userId === task.assigneeId)?.name ?? 'Former member';
}

export function TaskDetailPage() {
  const { projectId = '', taskId = '' } = useParams();
  const taskQuery = useQuery({
    queryKey: ['task', projectId, taskId],
    queryFn: () => getTask(projectId, taskId),
  });
  const membersQuery = useQuery({
    queryKey: ['project', projectId, 'members'],
    queryFn: () => listTaskMembers(projectId),
  });

  if (taskQuery.isPending) return <LoadingState label="Loading task…" />;
  if (taskQuery.isError) {
    return <ErrorState error={taskQuery.error} onRetry={() => void taskQuery.refetch()} />;
  }

  const task = taskQuery.data;
  return (
    <div className="flex flex-col gap-4">
      <Link
        to={`/projects/${projectId}/tasks`}
        className="text-sm underline-offset-2 hover:underline"
      >
        Back to tasks
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{task.title}</h1>
        {task.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
      </div>
      <p className="text-sm text-muted-foreground">{task.description ?? 'No description'}</p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-medium">Status</dt>
        <dd>{humanize(task.status)}</dd>
        <dt className="font-medium">Priority</dt>
        <dd>{humanize(task.priority)}</dd>
        <dt className="font-medium">Assignee</dt>
        <dd>{assigneeName(task, membersQuery.data?.data ?? [])}</dd>
        <dt className="font-medium">Due date</dt>
        <dd>{task.dueDate ? task.dueDate.slice(0, 10) : 'No due date'}</dd>
      </dl>
    </div>
  );
}
