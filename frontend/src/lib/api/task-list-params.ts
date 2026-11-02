import {
  TaskPrioritySchema,
  TaskSortBySchema,
  TaskStatusSchema,
  type TaskPriority,
  type TaskSortBy,
  type TaskStatus,
} from '@team-task-tracker/shared';
import { z } from 'zod';

export const TASK_PAGE_SIZE = 20;

export interface TaskListParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueFrom?: string;
  dueTo?: string;
  includeArchived: boolean;
  sortBy?: TaskSortBy;
  sortOrder: 'asc' | 'desc';
  page: number;
}

const DateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// A date input value that is a real calendar day (rejects 2026-13-45 and 2026-02-30).
function readDate(value: string | null): string | undefined {
  if (value === null || !DateInputSchema.safeParse(value).success) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

function readEnum<T>(schema: z.ZodType<T>, value: string | null): T | undefined {
  if (value === null) return undefined;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

// The URL is the source of truth, so every value is validated and invalid ones fall back to the
// defaults instead of reaching the API as a 400.
export function parseTaskListParams(searchParams: URLSearchParams): TaskListParams {
  const assigneeId = z.uuid().safeParse(searchParams.get('assigneeId'));
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .safeParse(searchParams.get('page') ?? '1');
  return {
    status: readEnum(TaskStatusSchema, searchParams.get('status')),
    priority: readEnum(TaskPrioritySchema, searchParams.get('priority')),
    assigneeId: assigneeId.success ? assigneeId.data : undefined,
    dueFrom: readDate(searchParams.get('dueFrom')),
    dueTo: readDate(searchParams.get('dueTo')),
    includeArchived: searchParams.get('includeArchived') === 'true',
    sortBy: readEnum(TaskSortBySchema, searchParams.get('sortBy')),
    sortOrder: searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc',
    page: page.success ? page.data : 1,
  };
}

// Date inputs are UTC days: the range starts at 00:00:00.000Z and ends at 23:59:59.999Z.
export function toApiQuery(params: TaskListParams): Record<string, string> {
  const query: Record<string, string> = {
    page: String(params.page),
    pageSize: String(TASK_PAGE_SIZE),
  };
  if (params.status) query.status = params.status;
  if (params.priority) query.priority = params.priority;
  if (params.assigneeId) query.assigneeId = params.assigneeId;
  if (params.dueFrom) query.dueFrom = `${params.dueFrom}T00:00:00.000Z`;
  if (params.dueTo) query.dueTo = `${params.dueTo}T23:59:59.999Z`;
  if (params.includeArchived) query.includeArchived = 'true';
  if (params.sortBy) {
    query.sortBy = params.sortBy;
    query.sortOrder = params.sortOrder;
  }
  return query;
}
