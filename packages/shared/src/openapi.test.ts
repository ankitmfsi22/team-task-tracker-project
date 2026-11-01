import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildOpenApiDocument,
  ErrorResponseSchema,
  AddMemberRequestSchema,
  CreateProjectRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  UpdateProjectRequestSchema,
  AssignTaskRequestSchema,
  ChangeTaskStatusRequestSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
} from './index.js';

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json {
  expect(value).toBeTypeOf('object');
  expect(value).not.toBeNull();
  return value as Json;
}

function operation(doc: Json, path: string, method: string): Json {
  const paths = asRecord(doc['paths']);
  return asRecord(asRecord(paths[path])[method]);
}

describe('buildOpenApiDocument', () => {
  const doc = asRecord(buildOpenApiDocument());

  it('Document matches the schemas: version, exact paths and methods', () => {
    expect(String(doc['openapi'])).toMatch(/^3\.1/);
    const paths = asRecord(doc['paths']);
    expect(Object.keys(paths).sort()).toEqual(
      [
        '/api/v1/auth/login',
        '/api/v1/auth/logout',
        '/api/v1/auth/me',
        '/api/v1/auth/refresh',
        '/api/v1/auth/register',
        '/api/v1/projects',
        '/api/v1/projects/{projectId}',
        '/api/v1/projects/{projectId}/archive',
        '/api/v1/projects/{projectId}/members',
        '/api/v1/projects/{projectId}/members/{userId}',
        '/api/v1/projects/{projectId}/tasks',
        '/api/v1/projects/{projectId}/tasks/{taskId}',
        '/api/v1/projects/{projectId}/tasks/{taskId}/archive',
        '/api/v1/projects/{projectId}/tasks/{taskId}/assignee',
        '/api/v1/projects/{projectId}/tasks/{taskId}/status',
      ].sort(),
    );
    expect(Object.keys(asRecord(paths['/api/v1/auth/register']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/login']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/refresh']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/logout']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/me']))).toEqual(['get']);
  });

  it('OpenAPI lists the project paths: methods per path', () => {
    const paths = asRecord(doc['paths']);
    const methods = (path: string): string[] => Object.keys(asRecord(paths[path])).sort();
    expect(methods('/api/v1/projects')).toEqual(['get', 'post']);
    expect(methods('/api/v1/projects/{projectId}')).toEqual(['get', 'patch']);
    expect(methods('/api/v1/projects/{projectId}/archive')).toEqual(['post']);
    expect(methods('/api/v1/projects/{projectId}/members')).toEqual(['get', 'post']);
    expect(methods('/api/v1/projects/{projectId}/members/{userId}')).toEqual(['delete']);
  });

  it('OpenAPI lists the project paths: request bodies equal JSON Schema of shared Zod schemas', () => {
    const bodySchema = (path: string, method: string): unknown =>
      asRecord(
        asRecord(asRecord(operation(doc, path, method)['requestBody'])['content'])[
          'application/json'
        ],
      )['schema'];
    expect(bodySchema('/api/v1/projects', 'post')).toEqual(
      z.toJSONSchema(CreateProjectRequestSchema, { io: 'input' }),
    );
    expect(bodySchema('/api/v1/projects/{projectId}', 'patch')).toEqual(
      z.toJSONSchema(UpdateProjectRequestSchema, { io: 'input' }),
    );
    expect(bodySchema('/api/v1/projects/{projectId}/members', 'post')).toEqual(
      z.toJSONSchema(AddMemberRequestSchema, { io: 'input' }),
    );
  });

  it('OpenAPI lists the project paths: response status codes per operation', () => {
    const codes = (path: string, method: string): string[] =>
      Object.keys(asRecord(operation(doc, path, method)['responses']));
    const p = '/api/v1/projects';
    const all: Array<[string, string]> = [
      [p, 'get'],
      [p, 'post'],
      [`${p}/{projectId}`, 'get'],
      [`${p}/{projectId}`, 'patch'],
      [`${p}/{projectId}/archive`, 'post'],
      [`${p}/{projectId}/members`, 'get'],
      [`${p}/{projectId}/members`, 'post'],
      [`${p}/{projectId}/members/{userId}`, 'delete'],
    ];
    for (const [path, method] of all) {
      expect(codes(path, method), `${method} ${path}`).toContain('401');
      if (path.includes('{projectId}')) {
        expect(codes(path, method), `${method} ${path}`).toContain('404');
      }
    }
    const guarded: Array<[string, string]> = [
      [`${p}/{projectId}`, 'patch'],
      [`${p}/{projectId}/archive`, 'post'],
      [`${p}/{projectId}/members`, 'post'],
      [`${p}/{projectId}/members/{userId}`, 'delete'],
    ];
    for (const [path, method] of guarded) {
      expect(codes(path, method), `${method} ${path}`).toEqual(
        expect.arrayContaining(['400', '403', '404', '409']),
      );
    }
    expect(codes(p, 'post')).toContain('201');
    expect(codes(`${p}/{projectId}/members/{userId}`, 'delete')).toContain('204');
  });

  it('OpenAPI describes the task routes: methods per path', () => {
    const paths = asRecord(doc['paths']);
    const methods = (path: string): string[] => Object.keys(asRecord(paths[path])).sort();
    const t = '/api/v1/projects/{projectId}/tasks';
    expect(methods(t)).toEqual(['get', 'post']);
    expect(methods(`${t}/{taskId}`)).toEqual(['get', 'patch']);
    expect(methods(`${t}/{taskId}/status`)).toEqual(['post']);
    expect(methods(`${t}/{taskId}/assignee`)).toEqual(['put']);
    expect(methods(`${t}/{taskId}/archive`)).toEqual(['post']);
  });

  it('OpenAPI describes the task routes: request bodies equal JSON Schema of shared Zod schemas', () => {
    const bodySchema = (path: string, method: string): unknown =>
      asRecord(
        asRecord(asRecord(operation(doc, path, method)['requestBody'])['content'])[
          'application/json'
        ],
      )['schema'];
    const t = '/api/v1/projects/{projectId}/tasks';
    expect(bodySchema(t, 'post')).toEqual(z.toJSONSchema(CreateTaskRequestSchema, { io: 'input' }));
    expect(bodySchema(`${t}/{taskId}`, 'patch')).toEqual(
      z.toJSONSchema(UpdateTaskRequestSchema, { io: 'input' }),
    );
    expect(bodySchema(`${t}/{taskId}/status`, 'post')).toEqual(
      z.toJSONSchema(ChangeTaskStatusRequestSchema, { io: 'input' }),
    );
    expect(bodySchema(`${t}/{taskId}/assignee`, 'put')).toEqual(
      z.toJSONSchema(AssignTaskRequestSchema, { io: 'input' }),
    );
  });

  it('OpenAPI describes the task routes: response status codes per operation', () => {
    const codes = (path: string, method: string): string[] =>
      Object.keys(asRecord(operation(doc, path, method)['responses']));
    const t = '/api/v1/projects/{projectId}/tasks';
    const all: Array<[string, string]> = [
      [t, 'post'],
      [`${t}/{taskId}`, 'get'],
      [`${t}/{taskId}`, 'patch'],
      [`${t}/{taskId}/status`, 'post'],
      [`${t}/{taskId}/assignee`, 'put'],
      [`${t}/{taskId}/archive`, 'post'],
    ];
    for (const [path, method] of all) {
      expect(codes(path, method), `${method} ${path}`).toEqual(
        expect.arrayContaining(['400', '401', '404']),
      );
      if (method !== 'get') {
        expect(codes(path, method), `${method} ${path}`).toContain('409');
      }
    }
    expect(codes(t, 'post')).toContain('201');
    expect(codes(`${t}/{taskId}`, 'get')).toContain('200');
  });

  it('Document matches the schemas: register request body equals JSON Schema of shared Zod schema', () => {
    const op = operation(doc, '/api/v1/auth/register', 'post');
    const body = asRecord(asRecord(asRecord(op['requestBody'])['content'])['application/json']);
    expect(body['schema']).toEqual(z.toJSONSchema(RegisterRequestSchema, { io: 'input' }));
  });

  it('Document matches the schemas: login request body equals JSON Schema of shared Zod schema', () => {
    const op = operation(doc, '/api/v1/auth/login', 'post');
    const body = asRecord(asRecord(asRecord(op['requestBody'])['content'])['application/json']);
    expect(body['schema']).toEqual(z.toJSONSchema(LoginRequestSchema, { io: 'input' }));
  });

  it('Document matches the schemas: response status codes per operation', () => {
    const codes = (path: string, method: string): string[] =>
      Object.keys(asRecord(operation(doc, path, method)['responses'])).sort();
    expect(codes('/api/v1/auth/register', 'post')).toEqual(['201', '400', '409']);
    expect(codes('/api/v1/auth/login', 'post')).toEqual(['200', '400', '401']);
    expect(codes('/api/v1/auth/refresh', 'post')).toEqual(['200', '401']);
    expect(codes('/api/v1/auth/logout', 'post')).toContain('204');
    expect(codes('/api/v1/auth/me', 'get')).toEqual(['200', '401']);
  });

  it('Document matches the schemas: me requires bearer security', () => {
    const op = operation(doc, '/api/v1/auth/me', 'get');
    expect(op['security']).toEqual([{ bearerAuth: [] }]);
  });

  it('Document matches the schemas: error responses reference ErrorResponse built from ErrorResponseSchema', () => {
    const components = asRecord(doc['components']);
    const schemas = asRecord(components['schemas']);
    expect(schemas['ErrorResponse']).toEqual(z.toJSONSchema(ErrorResponseSchema));

    const op = operation(doc, '/api/v1/auth/register', 'post');
    const responses = asRecord(op['responses']);
    for (const code of ['400', '409']) {
      const content = asRecord(asRecord(responses[code])['content']);
      const schema = asRecord(asRecord(content['application/json'])['schema']);
      expect(schema['$ref']).toBe('#/components/schemas/ErrorResponse');
    }
  });

  it('Document matches the schemas: document is JSON-serialisable', () => {
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
});

describe('buildOpenApiDocument task list route', () => {
  const doc = asRecord(buildOpenApiDocument());

  it('OpenAPI describes the list route', () => {
    const op = operation(doc, '/api/v1/projects/{projectId}/tasks', 'get');
    const parameters = (op['parameters'] as unknown[]).map((p) => asRecord(p));
    const query = parameters.filter((p) => p['in'] === 'query').map((p) => p['name']);
    expect(query).toEqual(
      expect.arrayContaining([
        'page',
        'pageSize',
        'status',
        'priority',
        'assigneeId',
        'dueFrom',
        'dueTo',
        'includeArchived',
        'sortBy',
        'sortOrder',
      ]),
    );
    const codes = Object.keys(asRecord(op['responses']));
    expect(codes).toEqual(expect.arrayContaining(['200', '400', '401', '404']));
  });
});
