import { z } from 'zod';
import { PaginationMetaSchema, PaginationQuerySchema } from './common.js';

export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

// Allowed status changes (FRS section 3); every other pair, including the same status, is a 409.
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'IN_REVIEW'],
  IN_REVIEW: ['IN_PROGRESS', 'DONE'],
  DONE: ['IN_PROGRESS'],
};

const TaskTitleSchema = z.string().trim().min(1).max(200);
const TaskDescriptionSchema = z.string().trim().max(5000);
// UTC ISO 8601 timestamp, for example 2026-12-31T17:00:00Z. The "not in the past" rule is in the service.
const DueDateSchema = z.iso.datetime();

// A new task always starts as TODO, so the create body has no status field (strict rejects it).
export const CreateTaskRequestSchema = z.strictObject({
  title: TaskTitleSchema,
  description: TaskDescriptionSchema.optional(),
  priority: TaskPrioritySchema.default('MEDIUM'),
  dueDate: DueDateSchema.optional(),
  assigneeId: z.uuid().optional(),
});

// Status and assignee change only through their own routes (strict rejects them here).
export const UpdateTaskRequestSchema = z
  .strictObject({
    title: TaskTitleSchema.optional(),
    description: TaskDescriptionSchema.nullable().optional(),
    priority: TaskPrioritySchema.optional(),
    dueDate: DueDateSchema.nullable().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export const ChangeTaskStatusRequestSchema = z.strictObject({ status: TaskStatusSchema });

export const AssignTaskRequestSchema = z.strictObject({ assigneeId: z.uuid().nullable() });

export const TaskParamsSchema = z.object({ projectId: z.uuid(), taskId: z.uuid() });

export const TaskResponseSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: z.string().nullable(),
  assigneeId: z.uuid().nullable(),
  createdById: z.uuid(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type ChangeTaskStatusRequest = z.infer<typeof ChangeTaskStatusRequestSchema>;
export type AssignTaskRequest = z.infer<typeof AssignTaskRequestSchema>;
export type TaskParams = z.infer<typeof TaskParamsSchema>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;

export const TaskSortBySchema = z.enum(['status', 'priority', 'assignee', 'dueDate']);

// List filters, sorting and pagination (FRS section 4). Strict: unknown parameters are a 400.
// includeArchived is an enum plus transform because z.coerce.boolean() turns "false" into true.
export const TaskListQuerySchema = PaginationQuerySchema.extend({
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: z.uuid().optional(),
  dueFrom: DueDateSchema.optional(),
  dueTo: DueDateSchema.optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  sortBy: TaskSortBySchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})
  .strict()
  .refine(
    (query) =>
      query.dueFrom === undefined ||
      query.dueTo === undefined ||
      new Date(query.dueFrom).getTime() <= new Date(query.dueTo).getTime(),
    { message: 'dueFrom must not be later than dueTo', path: ['dueFrom'] },
  );

export const TaskListResponseSchema = z.object({
  data: z.array(TaskResponseSchema),
  meta: PaginationMetaSchema,
});

export type TaskSortBy = z.infer<typeof TaskSortBySchema>;
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
