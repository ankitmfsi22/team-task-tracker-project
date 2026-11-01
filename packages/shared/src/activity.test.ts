import { describe, expect, it } from 'vitest';
import {
  ActivityActionSchema,
  ActivityListQuerySchema,
  ActivityListResponseSchema,
  ActivityMetadataSchemas,
  ActivityParamsSchema,
  ActivityResponseSchema,
} from './activity.js';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const uuid2 = '223e4567-e89b-42d3-a456-426614174001';
const uuid3 = '323e4567-e89b-42d3-a456-426614174002';
const base = {
  id: uuid,
  taskId: uuid2,
  actor: { id: uuid3, name: 'Ann' },
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ActivityActionSchema', () => {
  it('Action schema accepts the four actions and rejects others', () => {
    for (const a of ['TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_ARCHIVED']) {
      expect(ActivityActionSchema.safeParse(a).success).toBe(true);
    }
    expect(ActivityActionSchema.safeParse('TASK_DELETED').success).toBe(false);
  });
});

describe('ActivityMetadataSchemas', () => {
  it('Metadata schema accepts TASK_STATUS_CHANGED with valid statuses', () => {
    const m = { from: 'TODO', to: 'IN_PROGRESS' };
    expect(ActivityMetadataSchemas.TASK_STATUS_CHANGED.parse(m)).toEqual(m);
  });

  it('Metadata schema accepts TASK_ASSIGNED with from null and to uuid', () => {
    const m = { from: null, to: uuid };
    expect(ActivityMetadataSchemas.TASK_ASSIGNED.parse(m)).toEqual(m);
  });

  it('Metadata schema accepts TASK_ARCHIVED with {}', () => {
    expect(ActivityMetadataSchemas.TASK_ARCHIVED.parse({})).toEqual({});
  });

  it('Metadata schema accepts TASK_CREATED', () => {
    const m = { title: 'T', priority: 'HIGH', assigneeId: null };
    expect(ActivityMetadataSchemas.TASK_CREATED.parse(m)).toEqual(m);
  });

  it('Metadata schema has no entry for an unknown action', () => {
    const schemas: Record<string, unknown> = ActivityMetadataSchemas;
    expect(schemas['TASK_DELETED']).toBeUndefined();
  });

  it('Metadata schema rejects TASK_STATUS_CHANGED with to BLOCKED', () => {
    expect(
      ActivityMetadataSchemas.TASK_STATUS_CHANGED.safeParse({ from: 'TODO', to: 'BLOCKED' })
        .success,
    ).toBe(false);
  });

  it('Metadata schema rejects extra keys on TASK_ARCHIVED', () => {
    expect(ActivityMetadataSchemas.TASK_ARCHIVED.safeParse({ x: 1 }).success).toBe(false);
  });
});

describe('ActivityResponseSchema', () => {
  it('Response accepts a valid entry', () => {
    const entry = {
      ...base,
      action: 'TASK_STATUS_CHANGED',
      metadata: { from: 'TODO', to: 'IN_PROGRESS' },
    };
    expect(ActivityResponseSchema.parse(entry)).toEqual(entry);
  });

  it('Response rejects metadata that does not match the action, and unknown actions', () => {
    expect(
      ActivityResponseSchema.safeParse({
        ...base,
        action: 'TASK_STATUS_CHANGED',
        metadata: { from: 'TODO', to: 'BLOCKED' },
      }).success,
    ).toBe(false);
    expect(
      ActivityResponseSchema.safeParse({ ...base, action: 'TASK_DELETED', metadata: {} }).success,
    ).toBe(false);
  });

  it('List response accepts data and meta', () => {
    const list = {
      data: [{ ...base, action: 'TASK_ARCHIVED', metadata: {} }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    expect(ActivityListResponseSchema.parse(list)).toEqual(list);
  });
});

describe('ActivityParamsSchema', () => {
  it('Params accept uuids and reject non-uuids', () => {
    const ok = { projectId: uuid, taskId: uuid2 };
    expect(ActivityParamsSchema.parse(ok)).toEqual(ok);
    expect(ActivityParamsSchema.safeParse({ ...ok, taskId: 'nope' }).success).toBe(false);
  });
});

describe('ActivityListQuerySchema', () => {
  it('List query applies defaults', () => {
    expect(ActivityListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('List query rejects pageSize 101', () => {
    expect(ActivityListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });

  it('List query rejects page 0', () => {
    expect(ActivityListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('List query rejects an unknown parameter', () => {
    expect(ActivityListQuerySchema.safeParse({ foo: 'bar' }).success).toBe(false);
  });
});
