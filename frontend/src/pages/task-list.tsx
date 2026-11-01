import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  TaskPrioritySchema,
  TaskStatusSchema,
  type TaskResponse,
  type TaskSortBy,
} from '@team-task-tracker/shared';
import { Link, useParams, useSearchParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
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

  // First click sorts ascending, a second click on the same column descending.
  function toggleSort(field: TaskSortBy) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      const descending = params.sortBy === field && params.sortOrder === 'asc';
      next.set('sortBy', field);
      next.set('sortOrder', descending ? 'desc' : 'asc');
      next.delete('page');
      return next;
    });
  }

  function goToPage(page: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(page));
      return next;
    });
  }

  const filtered = FILTER_KEYS.some((key) => searchParams.has(key));
  const result = tasksQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <FilterBar params={params} members={members} onChange={setFilter} onClear={clearFilters} />
      {tasksQuery.isPending ? (
        <LoadingState label="Loading tasks…" />
      ) : tasksQuery.isError && !result ? (
        <ErrorState error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
      ) : result && result.data.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No tasks match these filters"
            action={
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState title="No tasks yet" />
        )
      ) : result ? (
        <>
          <TaskTable
            tasks={result.data}
            projectId={projectId}
            params={params}
            members={members}
            onSort={toggleSort}
          />
          <nav aria-label="Pagination" className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={result.meta.page <= 1}
              onClick={() => goToPage(result.meta.page - 1)}
            >
              Previous
            </Button>
            <span>
              Page {result.meta.page} of {result.meta.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={tasksQuery.isPlaceholderData || result.meta.page >= result.meta.totalPages}
              onClick={() => goToPage(result.meta.page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
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

const SORT_COLUMNS: { field: TaskSortBy; label: string }[] = [
  { field: 'status', label: 'Status' },
  { field: 'priority', label: 'Priority' },
  { field: 'assignee', label: 'Assignee' },
  { field: 'dueDate', label: 'Due date' },
];

function ariaSort(params: TaskListParams, field: TaskSortBy) {
  if (params.sortBy !== field) return 'none';
  return params.sortOrder === 'asc' ? 'ascending' : 'descending';
}

function TaskTable({
  tasks,
  projectId,
  params,
  members,
  onSort,
}: {
  tasks: TaskResponse[];
  projectId: string;
  params: TaskListParams;
  members: { userId: string; name: string }[];
  onSort: (field: TaskSortBy) => void;
}) {
  const assigneeName = (id: string | null) =>
    id === null ? 'Unassigned' : (members.find((m) => m.userId === id)?.name ?? 'Former member');
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="py-2">Title</th>
          {SORT_COLUMNS.map(({ field, label }) => (
            <th key={field} className="py-2" aria-sort={ariaSort(params, field)}>
              <button
                type="button"
                className="font-semibold hover:underline"
                onClick={() => onSort(field)}
              >
                {label}
              </button>
            </th>
          ))}
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
            <td className="py-2">{assigneeName(task.assigneeId)}</td>
            <td className="py-2">{task.dueDate ? task.dueDate.slice(0, 10) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
