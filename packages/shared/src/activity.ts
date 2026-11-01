import { z } from 'zod';
import { PaginationMetaSchema, PaginationQuerySchema } from './common.js';
import { TaskPrioritySchema, TaskStatusSchema } from './tasks.js';

export const ActivityActionSchema = z.enum([
  'TASK_CREATED',
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_ARCHIVED',
]);

export type ActivityAction = z.infer<typeof ActivityActionSchema>;

// Metadata per action (FRS section 5); assignee ids are null when the task is unassigned.
export const ActivityMetadataSchemas = {
  TASK_CREATED: z.strictObject({
    title: z.string(),
    priority: TaskPrioritySchema,
    assigneeId: z.uuid().nullable(),
  }),
  TASK_ASSIGNED: z.strictObject({ from: z.uuid().nullable(), to: z.uuid().nullable() }),
  TASK_STATUS_CHANGED: z.strictObject({ from: TaskStatusSchema, to: TaskStatusSchema }),
  TASK_ARCHIVED: z.strictObject({}),
} as const;

const ActivityBaseSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  actor: z.object({ id: z.uuid(), name: z.string() }),
  createdAt: z.string(),
});

export const ActivityResponseSchema = z.discriminatedUnion('action', [
  ActivityBaseSchema.extend({
    action: z.literal('TASK_CREATED'),
    metadata: ActivityMetadataSchemas.TASK_CREATED,
  }),
  ActivityBaseSchema.extend({
    action: z.literal('TASK_ASSIGNED'),
    metadata: ActivityMetadataSchemas.TASK_ASSIGNED,
  }),
  ActivityBaseSchema.extend({
    action: z.literal('TASK_STATUS_CHANGED'),
    metadata: ActivityMetadataSchemas.TASK_STATUS_CHANGED,
  }),
  ActivityBaseSchema.extend({
    action: z.literal('TASK_ARCHIVED'),
    metadata: ActivityMetadataSchemas.TASK_ARCHIVED,
  }),
]);

export const ActivityParamsSchema = z.object({ projectId: z.uuid(), taskId: z.uuid() });

export const ActivityListQuerySchema = PaginationQuerySchema.strict();

export const ActivityListResponseSchema = z.object({
  data: z.array(ActivityResponseSchema),
  meta: PaginationMetaSchema,
});

export type ActivityParams = z.infer<typeof ActivityParamsSchema>;
export type ActivityListQuery = z.infer<typeof ActivityListQuerySchema>;
export type ActivityResponse = z.infer<typeof ActivityResponseSchema>;
export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
