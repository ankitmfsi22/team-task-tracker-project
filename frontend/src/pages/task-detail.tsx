import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TASK_STATUS_TRANSITIONS,
  type MemberResponse,
  type ProjectResponse,
  type TaskResponse,
  type TaskStatus,
} from '@team-task-tracker/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorState, LoadingState } from '@/components/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import {
  archiveTask,
  assignTask,
  changeTaskStatus,
  getTask,
  getTaskProject,
  listTaskMembers,
} from '@/lib/api/tasks';

// "IN_PROGRESS" -> "In progress"
function humanize(value: string): string {
  const text = value.toLowerCase().replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function assigneeName(task: TaskResponse, members: MemberResponse[]): string {
  if (task.assigneeId === null) return 'Unassigned';
  return members.find((member) => member.userId === task.assigneeId)?.name ?? 'Former member';
}

// Both roles may update, assign and archive (SDS section 6), so only archived state removes the
// actions; the backend stays authoritative and a 403 or 409 is shown inline.
function canModify(project: ProjectResponse | undefined, task: TaskResponse): boolean {
  return project !== undefined && project.archivedAt === null && task.archivedAt === null;
}

function describeActionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You do not have permission';
    if (error.status === 409) return 'Status conflict: the task has changed. It was reloaded.';
    if (error.status === 404) return 'Not found';
  }
  return 'Something went wrong';
}

export function TaskDetailPage() {
  const { projectId = '', taskId = '' } = useParams();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const taskQuery = useQuery({
    queryKey: ['task', projectId, taskId],
    queryFn: () => getTask(projectId, taskId),
  });
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getTaskProject(projectId),
  });
  const membersQuery = useQuery({
    queryKey: ['project', projectId, 'members'],
    queryFn: () => listTaskMembers(projectId),
  });

  const mutation = useMutation({
    mutationFn: (action: () => Promise<TaskResponse>) => action(),
    onMutate: () => setActionError(null),
    onError: (error) => setActionError(describeActionError(error)),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', projectId, taskId] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
      ]);
    },
  });

  if (taskQuery.isPending) return <LoadingState label="Loading task…" />;
  if (taskQuery.isError) {
    return <ErrorState error={taskQuery.error} onRetry={() => void taskQuery.refetch()} />;
  }

  const task = taskQuery.data;
  const members = membersQuery.data?.data ?? [];
  const project = projectQuery.data;
  const editable = canModify(project, task);
  const archivedNotice = task.archivedAt
    ? 'Archived: this task is read-only.'
    : project?.archivedAt
      ? 'Archived: this project is read-only.'
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={`/projects/${projectId}/tasks`}
        className="text-sm underline-offset-2 hover:underline"
      >
        Back to tasks
      </Link>
      <h1 className="text-xl font-semibold">{task.title}</h1>
      <p className="text-sm text-muted-foreground">{task.description ?? 'No description'}</p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-medium">Status</dt>
        <dd>{humanize(task.status)}</dd>
        <dt className="font-medium">Priority</dt>
        <dd>{humanize(task.priority)}</dd>
        <dt className="font-medium">Assignee</dt>
        <dd>{assigneeName(task, members)}</dd>
        <dt className="font-medium">Due date</dt>
        <dd>{task.dueDate ? task.dueDate.slice(0, 10) : 'No due date'}</dd>
      </dl>
      {actionError ? <Alert variant="destructive">{actionError}</Alert> : null}
      {archivedNotice ? <p className="text-sm font-medium">{archivedNotice}</p> : null}
      {editable ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {TASK_STATUS_TRANSITIONS[task.status].map((status: TaskStatus) => (
              <Button
                key={status}
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(() => changeTaskStatus(projectId, taskId, status))}
              >
                Move to {humanize(status)}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="assign-to">Assign to</Label>
            <select
              id="assign-to"
              className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
              value={task.assigneeId ?? ''}
              disabled={mutation.isPending}
              onChange={(event) => {
                // Read the value now: the mutation runs later, after React resets the control.
                const assigneeId = event.target.value === '' ? null : event.target.value;
                mutation.mutate(() => assignTask(projectId, taskId, assigneeId));
              }}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => setConfirmingArchive(true)}
            >
              Archive
            </Button>
          </div>
          <Dialog open={confirmingArchive} onOpenChange={setConfirmingArchive}>
            <DialogContent>
              <DialogTitle>Archive this task?</DialogTitle>
              <DialogDescription>
                An archived task is read-only and hidden from the default task list.
              </DialogDescription>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmingArchive(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setConfirmingArchive(false);
                    mutation.mutate(() => archiveTask(projectId, taskId));
                  }}
                >
                  Confirm archive
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </div>
  );
}
