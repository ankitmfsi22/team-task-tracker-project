import { TaskListQuerySchema } from '@team-task-tracker/shared';
import { describe, expect, it } from 'vitest';
import { parseTaskListParams, toApiQuery } from './task-list-params';

const UUID = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';

describe('parseTaskListParams', () => {
  it('restores filters from the URL', () => {
    const params = parseTaskListParams(
      new URLSearchParams(`priority=HIGH&assigneeId=${UUID}&includeArchived=true`),
    );
    expect(params.priority).toBe('HIGH');
    expect(params.assigneeId).toBe(UUID);
    expect(params.includeArchived).toBe(true);
  });

  it('returns defaults for an empty query string', () => {
    const params = parseTaskListParams(new URLSearchParams());
    expect(params.includeArchived).toBe(false);
    expect(params.sortOrder).toBe('asc');
    expect(params.page).toBe(1);
    expect(params.status).toBeUndefined();
    expect(params.sortBy).toBeUndefined();
  });

  it('ignores invalid values without throwing', () => {
    const params = parseTaskListParams(
      new URLSearchParams(
        'status=BOGUS&page=-3&assigneeId=nope&dueFrom=2026-13-45&sortBy=nope&includeArchived=yes',
      ),
    );
    expect(params.status).toBeUndefined();
    expect(params.page).toBe(1);
    expect(params.assigneeId).toBeUndefined();
    expect(params.dueFrom).toBeUndefined();
    expect(params.sortBy).toBeUndefined();
    expect(params.includeArchived).toBe(false);
  });

  it('falls back to page 1 for a non-numeric page', () => {
    expect(parseTaskListParams(new URLSearchParams('page=abc')).page).toBe(1);
  });
});

describe('toApiQuery', () => {
  it('maps the due range to UTC datetimes', () => {
    const query = toApiQuery(
      parseTaskListParams(new URLSearchParams('dueFrom=2026-12-01&dueTo=2026-12-31')),
    );
    expect(query.dueFrom).toBe('2026-12-01T00:00:00.000Z');
    expect(query.dueTo).toBe('2026-12-31T23:59:59.999Z');
    expect(TaskListQuerySchema.safeParse(query).success).toBe(true);
  });

  it('omits defaults and always sends page and pageSize', () => {
    const query = toApiQuery(parseTaskListParams(new URLSearchParams('status=BOGUS&page=-3')));
    expect(query).toEqual({ page: '1', pageSize: '20' });
    expect(TaskListQuerySchema.safeParse(query).success).toBe(true);
  });

  it('includes sort and archived flags only when set', () => {
    const query = toApiQuery(
      parseTaskListParams(
        new URLSearchParams(
          `status=DONE&sortBy=dueDate&sortOrder=desc&includeArchived=true&assigneeId=${UUID}&page=2`,
        ),
      ),
    );
    expect(query).toMatchObject({
      status: 'DONE',
      sortBy: 'dueDate',
      sortOrder: 'desc',
      includeArchived: 'true',
      assigneeId: UUID,
      page: '2',
      pageSize: '20',
    });
    expect(TaskListQuerySchema.safeParse(query).success).toBe(true);
  });
});
