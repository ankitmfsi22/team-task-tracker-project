// Spec: web-tasks / "Task detail in the Lighthouse gate" > "Task detail audited" (DEV-1013 task 4.1).
// Pure tests of scripts/lib/lighthouse-pages.mjs (page list and stub API routes); no browser is launched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, stubRoute } from '../lib/lighthouse-pages.mjs';

const PROJECT_ID = '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90';
const TASK_ID = '5a2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90';
const TASK_PATH = `/projects/${PROJECT_ID}/tasks/${TASK_ID}`;
const API = `/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}`;

test('the audited pages include the task detail, with a seeded session', () => {
  const page = PAGES.find((p) => p.path === TASK_PATH);
  assert.ok(page, 'task detail page is audited');
  assert.equal(page.seedSession, true);
});

test('the stub API serves the task, its comments and its activity for the task detail', () => {
  const task = stubRoute('GET', API);
  assert.equal(task?.status, 200);
  assert.equal(task.body.id, TASK_ID);
  assert.equal(task.body.projectId, PROJECT_ID);

  for (const name of ['comments', 'activity']) {
    const list = stubRoute('GET', `${API}/${name}`);
    assert.equal(list?.status, 200, name);
    assert.ok(Array.isArray(list.body.data) && list.body.data.length > 0, `${name} has items`);
    assert.equal(list.body.meta.page, 1, name);
    assert.equal(list.body.meta.total, list.body.data.length, name);
    for (const item of list.body.data) assert.equal(item.taskId, TASK_ID, name);
  }
});
