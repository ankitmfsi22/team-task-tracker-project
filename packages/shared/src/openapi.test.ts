import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildOpenApiDocument,
  ErrorResponseSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
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
      ].sort(),
    );
    expect(Object.keys(asRecord(paths['/api/v1/auth/register']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/login']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/refresh']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/logout']))).toEqual(['post']);
    expect(Object.keys(asRecord(paths['/api/v1/auth/me']))).toEqual(['get']);
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
