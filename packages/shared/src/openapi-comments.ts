import { z } from 'zod';
import {
  ActivityListQuerySchema,
  ActivityListResponseSchema,
  ActivityResponseSchema,
} from './activity.js';
import {
  CommentListQuerySchema,
  CommentListResponseSchema,
  CommentResponseSchema,
  CreateCommentRequestSchema,
  UpdateCommentRequestSchema,
} from './comments.js';
import {
  bearer,
  errorResponse,
  invalid,
  json,
  queryParams,
  unauthenticated,
  uuidParam,
  type JsonObject,
} from './openapi-tasks.js';

const body = (schema: z.ZodType): JsonObject => ({
  required: true,
  content: json(z.toJSONSchema(schema, { io: 'input' })),
});
const ok = (description: string, name: string): JsonObject => ({
  description,
  content: json({ $ref: `#/components/schemas/${name}` }),
});
const taskParams = [uuidParam('projectId'), uuidParam('taskId')];
const commentParams = [...taskParams, uuidParam('commentId')];
const taskNotFound = errorResponse(
  'Project not found, the caller is not a member, or the task does not exist in the project',
);
const commentNotFound = errorResponse(
  'Project not found, the caller is not a member, or the task or comment does not exist',
);
const forbidden = errorResponse(
  'Only the comment author may edit; the author or a project OWNER may delete',
);
const archived = errorResponse('The project or the task is archived and read-only');

// Comment and activity paths for buildOpenApiDocument (kept apart from the task paths).
export function buildCommentPaths(): JsonObject {
  const base = '/api/v1/projects/{projectId}/tasks/{taskId}';
  return {
    [`${base}/comments`]: {
      get: {
        summary: 'List the comments of a task, oldest first (any member)',
        security: bearer,
        parameters: [...taskParams, ...queryParams(CommentListQuerySchema)],
        responses: {
          '200': ok('A page of comments with pagination metadata', 'CommentListResponse'),
          '400': invalid,
          '401': unauthenticated,
          '404': taskNotFound,
        },
      },
      post: {
        summary: 'Add a comment to a task (any member)',
        security: bearer,
        parameters: taskParams,
        requestBody: body(CreateCommentRequestSchema),
        responses: {
          '201': ok('Comment added', 'CommentResponse'),
          '400': errorResponse('Validation error, for example an empty comment'),
          '401': unauthenticated,
          '404': taskNotFound,
          '409': archived,
        },
      },
    },
    [`${base}/comments/{commentId}`]: {
      patch: {
        summary: 'Edit a comment (author only)',
        security: bearer,
        parameters: commentParams,
        requestBody: body(UpdateCommentRequestSchema),
        responses: {
          '200': ok('Comment updated', 'CommentResponse'),
          '400': invalid,
          '401': unauthenticated,
          '403': forbidden,
          '404': commentNotFound,
          '409': archived,
        },
      },
      delete: {
        summary: 'Delete a comment permanently (author, or a project OWNER for any comment)',
        security: bearer,
        parameters: commentParams,
        responses: {
          '204': { description: 'Comment deleted' },
          '400': invalid,
          '401': unauthenticated,
          '403': forbidden,
          '404': commentNotFound,
          '409': archived,
        },
      },
    },
    [`${base}/activity`]: {
      get: {
        summary: 'List the activity history of a task, newest first (any member)',
        security: bearer,
        parameters: [...taskParams, ...queryParams(ActivityListQuerySchema)],
        responses: {
          '200': ok('A page of activity entries with pagination metadata', 'ActivityListResponse'),
          '400': invalid,
          '401': unauthenticated,
          '404': taskNotFound,
        },
      },
    },
  };
}

export function buildCommentComponentSchemas(): JsonObject {
  return {
    CommentResponse: z.toJSONSchema(CommentResponseSchema),
    CommentListResponse: z.toJSONSchema(CommentListResponseSchema),
    ActivityResponse: z.toJSONSchema(ActivityResponseSchema),
    ActivityListResponse: z.toJSONSchema(ActivityListResponseSchema),
  };
}
