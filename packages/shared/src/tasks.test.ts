import { describe, expect, it } from 'vitest';
import {
  AssignTaskRequestSchema,
  ChangeTaskStatusRequestSchema,
  CreateTaskRequestSchema,
  TASK_STATUS_TRANSITIONS,
  TaskParamsSchema,
  TaskPrioritySchema,
  TaskResponseSchema,
  TaskStatusSchema,
  UpdateTaskRequestSchema,
} from './tasks.js';
import * as shared from './index.js';
import { TaskListQuerySchema, TaskListResponseSchema } from './index.js';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const uuid2 = '223e4567-e89b-42d3-a456-426614174001';
const task = {
  id: uuid,
  projectId: uuid2,
  title: 'Write tests',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  assigneeId: null,
  createdById: uuid,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('package index', () => {
  it('Schemas accept valid input: task contracts are exported from the index', () => {
    expect(shared.CreateTaskRequestSchema).toBe(CreateTaskRequestSchema);
    expect(shared.TASK_STATUS_TRANSITIONS).toBe(TASK_STATUS_TRANSITIONS);
  });
});

describe('TaskStatusSchema and TaskPrioritySchema', () => {
  it('Schemas reject an unknown status', () => {
    for (const s of ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']) {
      expect(TaskStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(TaskStatusSchema.safeParse('BLOCKED').success).toBe(false);
  });

  it('Schemas reject an unknown priority', () => {
    for (const p of ['LOW', 'MEDIUM', 'HIGH', 'URGENT']) {
      expect(TaskPrioritySchema.safeParse(p).success).toBe(true);
    }
    expect(TaskPrioritySchema.safeParse('CRITICAL').success).toBe(false);
  });
});

describe('TASK_STATUS_TRANSITIONS', () => {
  it('Status transition table matches the spec', () => {
    expect(TASK_STATUS_TRANSITIONS).toEqual({
      TODO: ['IN_PROGRESS'],
      IN_PROGRESS: ['TODO', 'IN_REVIEW'],
      IN_REVIEW: ['IN_PROGRESS', 'DONE'],
      DONE: ['IN_PROGRESS'],
    });
  });
});

describe('CreateTaskRequestSchema', () => {
  it('Schemas accept a valid body, trim title, default priority to MEDIUM', () => {
    expect(CreateTaskRequestSchema.parse({ title: '  Do it ' })).toEqual({
      title: 'Do it',
      priority: 'MEDIUM',
    });
    const full = {
      title: 'T',
      description: 'd',
      priority: 'HIGH',
      dueDate: '2030-01-01T10:00:00Z',
      assigneeId: uuid,
    };
    expect(CreateTaskRequestSchema.parse(full)).toEqual(full);
  });

  it('Schemas reject an empty, blank or over-long title', () => {
    expect(CreateTaskRequestSchema.safeParse({ title: '' }).success).toBe(false);
    expect(CreateTaskRequestSchema.safeParse({ title: '   ' }).success).toBe(false);
    expect(CreateTaskRequestSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false);
    expect(CreateTaskRequestSchema.safeParse({}).success).toBe(false);
  });

  it('Schemas reject an over-long description', () => {
    expect(
      CreateTaskRequestSchema.safeParse({ title: 'T', description: 'x'.repeat(5001) }).success,
    ).toBe(false);
  });

  it('Schemas reject an unknown priority on create', () => {
    expect(CreateTaskRequestSchema.safeParse({ title: 'T', priority: 'CRITICAL' }).success).toBe(
      false,
    );
  });

  it('Schemas reject a dueDate that is not a UTC ISO 8601 timestamp', () => {
    for (const dueDate of ['2030-01-01', '2030-01-01T10:00:00+02:00', 'tomorrow']) {
      expect(CreateTaskRequestSchema.safeParse({ title: 'T', dueDate }).success, dueDate).toBe(
        false,
      );
    }
  });

  it('Schemas reject a create body with a status field', () => {
    expect(CreateTaskRequestSchema.safeParse({ title: 'T', status: 'DONE' }).success).toBe(false);
  });

  it('Schemas reject a non-UUID assigneeId on create', () => {
    expect(CreateTaskRequestSchema.safeParse({ title: 'T', assigneeId: 'nope' }).success).toBe(
      false,
    );
  });
});

describe('UpdateTaskRequestSchema', () => {
  it('Schemas accept a partial body, description and dueDate may be null', () => {
    expect(UpdateTaskRequestSchema.safeParse({ title: 'New' }).success).toBe(true);
    expect(UpdateTaskRequestSchema.safeParse({ description: null }).success).toBe(true);
    expect(UpdateTaskRequestSchema.safeParse({ dueDate: null }).success).toBe(true);
    expect(UpdateTaskRequestSchema.safeParse({ priority: 'LOW' }).success).toBe(true);
    expect(UpdateTaskRequestSchema.safeParse({ dueDate: '2030-01-01T10:00:00Z' }).success).toBe(
      true,
    );
  });

  it('Schemas reject an empty update body', () => {
    expect(UpdateTaskRequestSchema.safeParse({}).success).toBe(false);
  });

  it('Schemas reject an empty title, bad priority or bad dueDate on update', () => {
    expect(UpdateTaskRequestSchema.safeParse({ title: '' }).success).toBe(false);
    expect(UpdateTaskRequestSchema.safeParse({ priority: 'X' }).success).toBe(false);
    expect(UpdateTaskRequestSchema.safeParse({ dueDate: '2030-01-01' }).success).toBe(false);
    expect(
      UpdateTaskRequestSchema.safeParse({ dueDate: '2030-01-01T10:00:00+02:00' }).success,
    ).toBe(false);
  });

  it('Schemas reject status or assigneeId in an update body', () => {
    expect(UpdateTaskRequestSchema.safeParse({ title: 'T', status: 'DONE' }).success).toBe(false);
    expect(UpdateTaskRequestSchema.safeParse({ title: 'T', assigneeId: uuid }).success).toBe(false);
  });
});

describe('ChangeTaskStatusRequestSchema', () => {
  it('Schemas accept a valid status and reject unknown or missing', () => {
    expect(ChangeTaskStatusRequestSchema.safeParse({ status: 'DONE' }).success).toBe(true);
    expect(ChangeTaskStatusRequestSchema.safeParse({ status: 'BLOCKED' }).success).toBe(false);
    expect(ChangeTaskStatusRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('AssignTaskRequestSchema', () => {
  it('Schemas accept a uuid or null assigneeId', () => {
    expect(AssignTaskRequestSchema.safeParse({ assigneeId: uuid }).success).toBe(true);
    expect(AssignTaskRequestSchema.safeParse({ assigneeId: null }).success).toBe(true);
  });

  it('Schemas reject a missing or non-UUID assigneeId', () => {
    expect(AssignTaskRequestSchema.safeParse({}).success).toBe(false);
    expect(AssignTaskRequestSchema.safeParse({ assigneeId: 'nope' }).success).toBe(false);
  });
});

describe('TaskParamsSchema', () => {
  it('Schemas require both uuids', () => {
    expect(TaskParamsSchema.safeParse({ projectId: uuid, taskId: uuid2 }).success).toBe(true);
    expect(TaskParamsSchema.safeParse({ projectId: uuid, taskId: 'x' }).success).toBe(false);
    expect(TaskParamsSchema.safeParse({ projectId: uuid }).success).toBe(false);
  });
});

describe('TaskResponseSchema', () => {
  it('Schemas accept a valid task and reject invalid fields', () => {
    expect(TaskResponseSchema.safeParse(task).success).toBe(true);
    expect(
      TaskResponseSchema.safeParse({
        ...task,
        dueDate: '2030-01-01T10:00:00.000Z',
        assigneeId: uuid,
        archivedAt: '2026-02-01T00:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(TaskResponseSchema.safeParse({ ...task, id: 'nope' }).success).toBe(false);
    expect(TaskResponseSchema.safeParse({ ...task, status: 'X' }).success).toBe(false);
    expect(TaskResponseSchema.safeParse({ ...task, createdById: undefined }).success).toBe(false);
  });
});

describe('TaskListQuerySchema', () => {
  it('Query schema accepts valid and rejects invalid input', () => {
    expect(TaskListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      includeArchived: false,
      sortOrder: 'asc',
    });
    expect(
      TaskListQuerySchema.parse({
        page: '2',
        pageSize: '100',
        status: 'DONE',
        priority: 'HIGH',
        assigneeId: uuid,
        dueFrom: '2030-01-01T00:00:00.000Z',
        dueTo: '2030-02-01T00:00:00.000Z',
        includeArchived: 'true',
        sortBy: 'dueDate',
        sortOrder: 'desc',
      }),
    ).toMatchObject({ page: 2, pageSize: 100, includeArchived: true, sortBy: 'dueDate' });
    for (const sortBy of ['status', 'priority', 'assignee', 'dueDate']) {
      expect(TaskListQuerySchema.safeParse({ sortBy }).success).toBe(true);
    }

    const invalid = [
      { status: 'X' },
      { priority: 'X' },
      { assigneeId: 'nope' },
      { dueFrom: '2030-01-01' },
      { dueTo: 'nope' },
      { dueFrom: '2030-02-01T00:00:00.000Z', dueTo: '2030-01-01T00:00:00.000Z' },
      { includeArchived: 'yes' },
      { sortBy: 'title' },
      { sortOrder: 'up' },
      { pageSize: '101' },
      { page: '0' },
      { unknown: '1' },
    ];
    for (const q of invalid) {
      expect(TaskListQuerySchema.safeParse(q).success).toBe(false);
    }
    expect(
      TaskListQuerySchema.safeParse({
        dueFrom: '2030-01-01T00:00:00.000Z',
        dueTo: '2030-01-01T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});

describe('TaskListResponseSchema', () => {
  it('Query schema accepts valid and rejects invalid input: response envelope', () => {
    const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
    expect(TaskListResponseSchema.safeParse({ data: [task], meta }).success).toBe(true);
    expect(TaskListResponseSchema.safeParse({ data: [{ ...task, id: 'x' }], meta }).success).toBe(
      false,
    );
    expect(TaskListResponseSchema.safeParse({ data: [task] }).success).toBe(false);
  });
});
