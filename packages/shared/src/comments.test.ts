import { describe, expect, it } from 'vitest';
import {
  CommentListQuerySchema,
  CommentListResponseSchema,
  CommentParamsSchema,
  CommentResponseSchema,
  CreateCommentRequestSchema,
  UpdateCommentRequestSchema,
} from './comments.js';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const uuid2 = '223e4567-e89b-42d3-a456-426614174001';
const uuid3 = '323e4567-e89b-42d3-a456-426614174002';
const comment = {
  id: uuid,
  taskId: uuid2,
  body: 'Looks good',
  author: { id: uuid3, name: 'Ann' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe.each([
  ['CreateCommentRequestSchema', CreateCommentRequestSchema],
  ['UpdateCommentRequestSchema', UpdateCommentRequestSchema],
])('%s', (_name, schema) => {
  it('Schemas accept a valid body and trim it', () => {
    expect(schema.parse({ body: '  Looks good  ' })).toEqual({ body: 'Looks good' });
    expect(schema.safeParse({ body: 'x'.repeat(2000) }).success).toBe(true);
  });

  it('Schemas reject an empty body', () => {
    expect(schema.safeParse({ body: '' }).success).toBe(false);
  });

  it('Schemas reject a whitespace-only body', () => {
    expect(schema.safeParse({ body: '   \n\t ' }).success).toBe(false);
  });

  it('Schemas reject a 2001-character body', () => {
    expect(schema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('Schemas reject a missing body', () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('Schemas reject an unknown field', () => {
    expect(schema.safeParse({ body: 'ok', extra: 1 }).success).toBe(false);
  });
});

describe('CommentParamsSchema', () => {
  it('Params accept uuids and reject non-uuids', () => {
    const ok = { projectId: uuid, taskId: uuid2, commentId: uuid3 };
    expect(CommentParamsSchema.parse(ok)).toEqual(ok);
    expect(CommentParamsSchema.safeParse({ ...ok, commentId: 'nope' }).success).toBe(false);
  });
});

describe('CommentResponseSchema and CommentListResponseSchema', () => {
  it('Response schemas accept a comment and a list', () => {
    expect(CommentResponseSchema.parse(comment)).toEqual(comment);
    const list = { data: [comment], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };
    expect(CommentListResponseSchema.parse(list)).toEqual(list);
  });
});

describe('CommentListQuerySchema', () => {
  it('List query applies defaults', () => {
    expect(CommentListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('List query rejects pageSize 101', () => {
    expect(CommentListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });

  it('List query rejects page 0', () => {
    expect(CommentListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('List query rejects an unknown parameter', () => {
    expect(CommentListQuerySchema.safeParse({ foo: 'bar' }).success).toBe(false);
  });
});
