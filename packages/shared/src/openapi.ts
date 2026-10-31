import { z } from 'zod';
import {
  AuthTokenResponseSchema,
  ErrorResponseSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  UserResponseSchema,
} from './auth.js';

type JsonObject = Record<string, unknown>;

const json = (schema: unknown): JsonObject => ({ 'application/json': { schema } });
const ref = (name: string): JsonObject => ({ $ref: `#/components/schemas/${name}` });
const errorResponse = (description: string): JsonObject => ({
  description,
  content: json(ref('ErrorResponse')),
});

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
    },
    components: {
      schemas: {
        UserResponse: z.toJSONSchema(UserResponseSchema),
        AuthTokenResponse: z.toJSONSchema(AuthTokenResponseSchema),
        ErrorResponse: z.toJSONSchema(ErrorResponseSchema),
      },
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
  };
}
