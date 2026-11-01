import { describe, expect, it } from 'vitest';
import { PaginationMetaSchema, PaginationQuerySchema } from './index.js';

describe('PaginationQuerySchema', () => {
  it('Contracts reject invalid input: coerces query strings and applies defaults', () => {
    expect(PaginationQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({
      page: 2,
      pageSize: 50,
    });
    expect(PaginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('Contracts reject invalid input: page below 1 or non-integer', () => {
    expect(PaginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ page: '1.5' }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('Contracts reject invalid input: pageSize outside 1..100', () => {
    expect(PaginationQuerySchema.safeParse({ pageSize: '0' }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ pageSize: '100' }).success).toBe(true);
  });
});

describe('PaginationMetaSchema', () => {
  it('Contracts reject invalid input: requires integer meta fields', () => {
    expect(
      PaginationMetaSchema.safeParse({ page: 1, pageSize: 20, total: 3, totalPages: 1 }).success,
    ).toBe(true);
    expect(
      PaginationMetaSchema.safeParse({ page: 1, pageSize: 20, total: 3.5, totalPages: 1 }).success,
    ).toBe(false);
    expect(PaginationMetaSchema.safeParse({ page: 1, pageSize: 20 }).success).toBe(false);
  });
});
