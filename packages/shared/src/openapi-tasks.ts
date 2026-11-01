import { z } from 'zod';
import {
  AssignTaskRequestSchema,
  ChangeTaskStatusRequestSchema,
  CreateTaskRequestSchema,
  TaskListQuerySchema,
  TaskListResponseSchema,
  TaskResponseSchema,
  UpdateTaskRequestSchema,
} from './tasks.js';

type JsonObject = Record<string, unknown>;

const json = (schema: unknown): JsonObject => ({ 'application/json': { schema } });
const errorResponse = (description: string): JsonObject => ({
  description,
  content: json({ $ref: '#/components/schemas/ErrorResponse' }),
});
const taskBody = (schema: z.ZodType): JsonObject => ({
  required: true,
  content: json(z.toJSONSchema(schema, { io: 'input' })),
});
const taskOk = (description: string): JsonObject => ({
  description,
  content: json({ $ref: '#/components/schemas/TaskResponse' }),
});
const uuidParam = (name: string): JsonObject => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
});

// One query parameter per property of the strict list query schema (input side, so defaults stay optional).
const queryParams = (schema: z.ZodType): JsonObject[] => {
  const { properties = {} } = z.toJSONSchema(schema, { io: 'input' }) as {
    properties?: Record<string, unknown>;
  };
  return Object.entries(properties).map(([name, paramSchema]) => ({
    name,
    in: 'query',
    required: false,
    schema: paramSchema,
  }));
};

const bearer = [{ bearerAuth: [] }];
const params = [uuidParam('projectId'), uuidParam('taskId')];
const invalid = errorResponse('Validation error');
const unauthenticated = errorResponse('Missing, invalid or expired access token');
const projectNotFound = errorResponse('Project not found, or the caller is not a member');
const taskNotFound = errorResponse(
  'Project not found, the caller is not a member, or the task does not exist in the project',
);
const projectArchived = errorResponse('The project is archived and read-only');
const taskArchived = errorResponse('The project or the task is archived and read-only');

// Task paths and component schemas for buildOpenApiDocument (kept apart from the project paths).
export function buildTaskPaths(): JsonObject {
  const base = '/api/v1/projects/{projectId}/tasks';
  return {
    [base]: {
      get: {
        summary: 'List tasks with filters, sorting and pagination (any member)',
        security: bearer,
        parameters: [uuidParam('projectId'), ...queryParams(TaskListQuerySchema)],
        responses: {
          '200': {
            description: 'A page of tasks with pagination metadata',
            content: json({ $ref: '#/components/schemas/TaskListResponse' }),
          },
          '400': invalid,
          '401': unauthenticated,
          '404': projectNotFound,
        },
      },
      post: {
        summary: 'Create a task with status TODO (any member)',
        security: bearer,
        parameters: [uuidParam('projectId')],
        requestBody: taskBody(CreateTaskRequestSchema),
        responses: {
          '201': taskOk('Task created'),
          '400': errorResponse('Validation error, past due date, or assignee is not a member'),
          '401': unauthenticated,
          '404': projectNotFound,
          '409': projectArchived,
        },
      },
    },
    [`${base}/{taskId}`]: {
      get: {
        summary: 'View a task, archived or not (any member)',
        security: bearer,
        parameters: params,
        responses: {
          '200': taskOk('Task'),
          '400': invalid,
          '401': unauthenticated,
          '404': taskNotFound,
        },
      },
      patch: {
        summary: 'Update title, description, priority or due date (any member)',
        security: bearer,
        parameters: params,
        requestBody: taskBody(UpdateTaskRequestSchema),
        responses: {
          '200': taskOk('Task updated'),
          '400': errorResponse('Validation error or past due date'),
          '401': unauthenticated,
          '404': taskNotFound,
          '409': taskArchived,
        },
      },
    },
    [`${base}/{taskId}/status`]: {
      post: {
        summary: 'Change the status along an allowed transition (any member)',
        security: bearer,
        parameters: params,
        requestBody: taskBody(ChangeTaskStatusRequestSchema),
        responses: {
          '200': taskOk('Status changed'),
          '400': invalid,
          '401': unauthenticated,
          '404': taskNotFound,
          '409': errorResponse('Invalid transition, or the project or task is archived'),
        },
      },
    },
    [`${base}/{taskId}/assignee`]: {
      put: {
        summary: 'Assign the task to a project member, or unassign with null (any member)',
        security: bearer,
        parameters: params,
        requestBody: taskBody(AssignTaskRequestSchema),
        responses: {
          '200': taskOk('Assignee set'),
          '400': errorResponse('Validation error, or the assignee is not a project member'),
          '401': unauthenticated,
          '404': taskNotFound,
          '409': taskArchived,
        },
      },
    },
    [`${base}/{taskId}/archive`]: {
      post: {
        summary: 'Archive (soft delete) the task (any member)',
        security: bearer,
        parameters: params,
        responses: {
          '200': taskOk('Task archived'),
          '400': invalid,
          '401': unauthenticated,
          '404': taskNotFound,
          '409': taskArchived,
        },
      },
    },
  };
}

export function buildTaskComponentSchemas(): JsonObject {
  return {
    TaskResponse: z.toJSONSchema(TaskResponseSchema),
    TaskListResponse: z.toJSONSchema(TaskListResponseSchema),
  };
}
