import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TaskPrioritySchema, TaskStatusSchema, type TaskResponse } from '@team-task-tracker/shared';
import { Link, useParams, useSearchParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/states';
import { listTaskMembers, listTasks } from '@/lib/api/tasks';
import { parseTaskListParams, toApiQuery, type TaskListParams } from '@/lib/api/task-list-params';

const SELECT_CLASS =
  'h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring';

const FILTER_KEYS = ['status', 'priority', 'assigneeId', 'dueFrom', 'dueTo', 'includeArchived'];

export function TaskListPage() {
  const { projectId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseTaskListParams(searchParams);

  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId, toApiQuery(params)],
    queryFn: () => listTasks(projectId, toApiQuery(params)),
    placeholderData: keepPreviousData,
  });
  const membersQuery = useQuery({
    queryKey: ['project', projectId, 'members'],
    queryFn: () => listTaskMembers(projectId),
  });
  const members = membersQuery.data?.data ?? [];

  // Changing a filter or sort always returns to page 1.
  function setFilter(key: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('page');
      return next;
    });
  }

  function clearFilters() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of [...FILTER_KEYS, 'page']) next.delete(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <FilterBar params={params} members={members} onChange={setFilter} onClear={clearFilters} />
      {tasksQuery.isPending ? (
        <LoadingState label="Loading tasks…" />
      ) : tasksQuery.data ? (
        <TaskTable tasks={tasksQuery.data.data} projectId={projectId} />
      ) : null}
    </div>
  );
}

function FilterBar({
  params,
  members,
  onChange,
  onClear,
}: {
  params: TaskListParams;
  members: { userId: string; name: string }[];
  onChange: (key: string, value: string | null) => void;
  onClear: () => void;
}) {
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      aria-label="Task filters"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-status">Status</Label>
        <select
          id="filter-status"
          className={SELECT_CLASS}
          value={params.status ?? ''}
          onChange={(event) => onChange('status', event.target.value)}
        >
          <option value="">All statuses</option>
          {TaskStatusSchema.options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-priority">Priority</Label>
        <select
          id="filter-priority"
          className={SELECT_CLASS}
          value={params.priority ?? ''}
          onChange={(event) => onChange('priority', event.target.value)}
        >
          <option value="">All priorities</option>
          {TaskPrioritySchema.options.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-assignee">Assignee</Label>
        <select
          id="filter-assignee"
          className={SELECT_CLASS}
          value={params.assigneeId ?? ''}
          onChange={(event) => onChange('assigneeId', event.target.value)}
        >
          <option value="">All assignees</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-due-from">Due from</Label>
        <Input
          id="filter-due-from"
          type="date"
          value={params.dueFrom ?? ''}
          onChange={(event) => onChange('dueFrom', event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-due-to">Due to</Label>
        <Input
          id="filter-due-to"
          type="date"
          value={params.dueTo ?? ''}
          onChange={(event) => onChange('dueTo', event.target.value)}
        />
      </div>
      <div className="flex h-9 items-center gap-2">
        <input
          id="filter-archived"
          type="checkbox"
          checked={params.includeArchived}
          onChange={(event) => onChange('includeArchived', event.target.checked ? 'true' : null)}
        />
        <Label htmlFor="filter-archived">Include archived</Label>
      </div>
      <Button type="button" variant="outline" onClick={onClear}>
        Clear filters
      </Button>
    </form>
  );
}

function TaskTable({ tasks, projectId }: { tasks: TaskResponse[]; projectId: string }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="py-2">Title</th>
          <th className="py-2">Status</th>
          <th className="py-2">Priority</th>
          <th className="py-2">Due date</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id} className="border-b border-border">
            <td className="py-2">
              <Link
                className="font-medium underline-offset-2 hover:underline"
                to={`/projects/${projectId}/tasks/${task.id}`}
              >
                {task.title}
              </Link>{' '}
              {task.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
            </td>
            <td className="py-2">{task.status}</td>
            <td className="py-2">{task.priority}</td>
            <td className="py-2">{task.dueDate ? task.dueDate.slice(0, 10) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
