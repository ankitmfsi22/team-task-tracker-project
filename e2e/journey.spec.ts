import { expect, test } from '@playwright/test';

test('user journey', async ({ page, request }) => {
  const run = Date.now();
  const password = 'password-e2e-1';
  const emailA = `e2e-${run}-a@example.com`;
  const emailB = `e2e-${run}-b@example.com`;
  const projectName = `E2E project ${run}`;

  // User B is set up through the API so that A can add B as a member.
  const registerB = await request.post('/api/v1/auth/register', {
    data: { email: emailB, name: 'Bob E2E', password },
  });
  expect(registerB.ok()).toBe(true);

  // User A registers through the UI and lands on the project list.
  await page.goto('/register');
  await page.getByLabel('Email').fill(emailA);
  await page.getByLabel('Name').fill('Alice E2E');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  // Create a project.
  await page.getByRole('button', { name: 'New project' }).first().click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByLabel('Name').fill(projectName);
  await projectDialog.getByRole('button', { name: 'Create project' }).click();
  await page.getByRole('link', { name: projectName }).click();
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

  // Add B as a member.
  await page.getByLabel('Email').fill(emailB);
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByText(emailB)).toBeVisible();

  // The project page has no link to the task list, so open it by URL.
  const projectId = new URL(page.url()).pathname.split('/')[2];
  await page.goto(`/projects/${projectId}/tasks`);
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();

  // Create two tasks with different priorities.
  const taskTitle = `Urgent task ${run}`;
  const otherTitle = `Low task ${run}`;
  for (const [title, priority] of [
    [taskTitle, 'URGENT'],
    [otherTitle, 'LOW'],
  ] as const) {
    await page.getByRole('button', { name: 'New task' }).click();
    const taskDialog = page.getByRole('dialog', { name: 'New task' });
    await taskDialog.getByLabel('Title').fill(title);
    await taskDialog.getByLabel('Priority').selectOption(priority);
    await taskDialog.getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  }

  // Filter by priority.
  await page.getByLabel('Priority', { exact: true }).selectOption('URGENT');
  await expect(page.getByRole('link', { name: otherTitle })).toBeHidden();
  await expect(page.getByRole('link', { name: taskTitle })).toBeVisible();

  // Open the task and comment.
  await page.getByRole('link', { name: taskTitle }).click();
  await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();
  const comment = `E2E comment ${run}`;
  await page.getByLabel('Add a comment').fill(comment);
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText(comment)).toBeVisible();

  // The activity feed shows the creation entry.
  const activity = page.getByRole('region', { name: 'Activity' });
  await expect(activity.getByText(`created the task "${taskTitle}"`)).toBeVisible();
});
