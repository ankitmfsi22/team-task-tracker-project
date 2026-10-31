import { z } from 'zod';
import {
  AuthTokenResponseSchema,
  ErrorResponseSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  UserResponseSchema,
} from './auth.js';
import { PaginationMetaSchema } from './common.js';
import {
  AddMemberRequestSchema,
  CreateProjectRequestSchema,
  MemberListResponseSchema,
  MemberResponseSchema,
  ProjectDetailResponseSchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
  UpdateProjectRequestSchema,
} from './projects.js';

type JsonObject = Record<string, unknown>;

const json = (schema: unknown): JsonObject => ({ 'application/json': { schema } });
const ref = (name: string): JsonObject => ({ $ref: `#/components/schemas/${name}` });
const errorResponse = (description: string): JsonObject => ({
  description,
  content: json(ref('ErrorResponse')),
});

const bearer = [{ bearerAuth: [] }];
const uuidParam = (name: string): JsonObject => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
});
const projectIdParam = uuidParam('projectId');
const unauthenticated = errorResponse('Missing, invalid or expired access token');
const notFound = errorResponse('Project not found, or the caller is not a member');
const forbidden = errorResponse('The caller is a member but not an OWNER');
const archived = errorResponse('The project is archived and read-only');
const invalid = errorResponse('Validation error');

export function buildOpenApiDocument(): JsonObject {
  return {
    openapi: '3.1.0',
    info: { title: 'Team Task Tracker API', version: '1.0.0' },
    paths: {
      '/api/v1/auth/register': {
        post: {
          summary: 'Register a user',
          requestBody: {
            required: true,
            content: json(z.toJSONSchema(RegisterRequestSchema, { io: 'input' })),
          },
          responses: {
            '201': { description: 'User created', content: json(ref('UserResponse')) },
            '400': errorResponse('Validation error'),
            '409': errorResponse('Email already registered'),
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          summary: 'Log in and receive an access token and a refresh cookie',
          requestBody: {
            required: true,
            content: json(z.toJSONSchema(LoginRequestSchema, { io: 'input' })),
          },
          responses: {
            '200': { description: 'Logged in', content: json(ref('AuthTokenResponse')) },
            '400': errorResponse('Validation error'),
            '401': errorResponse('Invalid credentials'),
          },
        },
      },
      '/api/v1/auth/refresh': {
        post: {
          summary: 'Rotate the refresh cookie and receive a new access token',
          responses: {
            '200': { description: 'Token refreshed', content: json(ref('AuthTokenResponse')) },
            '401': errorResponse('Missing, invalid, expired or revoked refresh token'),
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          summary: 'Revoke the refresh token and clear the cookie',
          responses: { '204': { description: 'Logged out' } },
        },
      },
      '/api/v1/auth/me': {
        get: {
          summary: 'Return the authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Current user', content: json(ref('UserResponse')) },
            '401': errorResponse('Missing, invalid or expired access token'),
          },
        },
      },
      '/api/v1/projects': {
        post: {
          summary: 'Create a project; the caller becomes its OWNER',
          security: bearer,
          requestBody: {
            required: true,
            content: json(z.toJSONSchema(CreateProjectRequestSchema, { io: 'input' })),
          },
          responses: {
            '201': { description: 'Project created', content: json(ref('ProjectResponse')) },
            '400': invalid,
            '401': unauthenticated,
          },
        },
        get: {
          summary: "List the caller's projects (archived hidden unless includeArchived=true)",
          security: bearer,
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
            {
              name: 'includeArchived',
              in: 'query',
              schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
            },
          ],
          responses: {
            '200': { description: 'Projects', content: json(ref('ProjectListResponse')) },
            '400': invalid,
            '401': unauthenticated,
          },
        },
      },
      '/api/v1/projects/{projectId}': {
        get: {
          summary: 'View a project with the caller role',
          security: bearer,
          parameters: [projectIdParam],
          responses: {
            '200': { description: 'Project', content: json(ref('ProjectDetailResponse')) },
            '400': invalid,
            '401': unauthenticated,
            '404': notFound,
          },
        },
        patch: {
          summary: 'Update the project name or description (OWNER)',
          security: bearer,
          parameters: [projectIdParam],
          requestBody: {
            required: true,
            content: json(z.toJSONSchema(UpdateProjectRequestSchema, { io: 'input' })),
          },
          responses: {
            '200': { description: 'Project updated', content: json(ref('ProjectResponse')) },
            '400': invalid,
            '401': unauthenticated,
            '403': forbidden,
            '404': notFound,
            '409': archived,
          },
        },
      },
      '/api/v1/projects/{projectId}/archive': {
        post: {
          summary: 'Archive the project (OWNER)',
          security: bearer,
          parameters: [projectIdParam],
          responses: {
            '200': { description: 'Project archived', content: json(ref('ProjectResponse')) },
            '400': invalid,
            '401': unauthenticated,
            '403': forbidden,
            '404': notFound,
            '409': archived,
          },
        },
      },
      '/api/v1/projects/{projectId}/members': {
        get: {
          summary: 'List the project members',
          security: bearer,
          parameters: [projectIdParam],
          responses: {
            '200': { description: 'Members', content: json(ref('MemberListResponse')) },
            '400': invalid,
            '401': unauthenticated,
            '404': notFound,
          },
        },
        post: {
          summary: 'Add a registered user by email (OWNER)',
          security: bearer,
          parameters: [projectIdParam],
          requestBody: {
            required: true,
            content: json(z.toJSONSchema(AddMemberRequestSchema, { io: 'input' })),
          },
          responses: {
            '201': { description: 'Member added', content: json(ref('MemberResponse')) },
            '400': invalid,
            '401': unauthenticated,
            '403': forbidden,
            '404': errorResponse('Project not found, caller is not a member, or unknown email'),
            '409': errorResponse('Already a member, or the project is archived'),
          },
        },
      },
      '/api/v1/projects/{projectId}/members/{userId}': {
        delete: {
          summary: 'Remove a member (OWNER); the last owner cannot be removed',
          security: bearer,
          parameters: [projectIdParam, uuidParam('userId')],
          responses: {
            '204': { description: 'Member removed' },
            '400': invalid,
            '401': unauthenticated,
            '403': forbidden,
            '404': notFound,
            '409': errorResponse('Last owner, or the project is archived'),
          },
        },
      },
    },
    components: {
      schemas: {
        ProjectResponse: z.toJSONSchema(ProjectResponseSchema),
        ProjectDetailResponse: z.toJSONSchema(ProjectDetailResponseSchema),
        ProjectListResponse: z.toJSONSchema(ProjectListResponseSchema),
        PaginationMeta: z.toJSONSchema(PaginationMetaSchema),
        MemberResponse: z.toJSONSchema(MemberResponseSchema),
        MemberListResponse: z.toJSONSchema(MemberListResponseSchema),
        UserResponse: z.toJSONSchema(UserResponseSchema),
        AuthTokenResponse: z.toJSONSchema(AuthTokenResponseSchema),
        ErrorResponse: z.toJSONSchema(ErrorResponseSchema),
      },
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
  };
}
