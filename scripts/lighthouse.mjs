// Lighthouse gate (DEV-1011): builds the frontend, serves the production build with `vite preview`
// against a stub API (no database), audits each page and exits 1 when any category is below 95.
// Usage: pnpm lighthouse   (needs Chrome or Edge; set CHROME_PATH to use another browser)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import {
  CATEGORIES,
  evaluateScores,
  findBrowser,
  missingBrowserMessage,
} from './lib/lighthouse-gate.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = resolve(repoRoot, 'frontend');
const PREVIEW_PORT = 4173;
const SESSION_HINT_KEY = 'ttt.session';

// seedSession: the page needs a signed-in session, so the session hint is set before the audit.
const PAGES = [
  { path: '/login', seedSession: false },
  { path: '/projects', seedSession: true },
  { path: '/projects/3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90/tasks', seedSession: true },
];

const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
];

const USER = { id: '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90', email: 'ada@example.com', name: 'Ada' };
const PROJECTS = Array.from({ length: 3 }, (_, i) => ({
  id: `3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a9${i}`,
  name: `Project ${i + 1}`,
  description: 'Fixture project served by the Lighthouse stub API.',
  archivedAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
}));

const TASK_PROJECT = PROJECTS[0];
const TASKS = Array.from({ length: 5 }, (_, i) => ({
  id: `5a2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a9${i}`,
  projectId: TASK_PROJECT.id,
  title: `Fixture task ${i + 1}`,
  description: 'Fixture task served by the Lighthouse stub API.',
  status: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'TODO'][i],
  priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'MEDIUM'][i],
  dueDate: '2026-12-31T00:00:00.000Z',
  assigneeId: USER.id,
  createdById: USER.id,
  archivedAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}));

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function startStubApi() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://stub');
    if (req.method === 'POST' && url.pathname === '/api/v1/auth/refresh') {
      return sendJson(res, 200, { accessToken: 'lighthouse-fixture-token' });
    }
    if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') return sendJson(res, 200, USER);
    if (req.method === 'GET' && url.pathname === '/api/v1/projects') {
      const meta = { page: 1, pageSize: 20, total: PROJECTS.length, totalPages: 1 };
      return sendJson(res, 200, { data: PROJECTS, meta });
    }
    if (req.method === 'GET' && url.pathname === `/api/v1/projects/${TASK_PROJECT.id}`) {
      return sendJson(res, 200, TASK_PROJECT);
    }
    if (req.method === 'GET' && url.pathname === `/api/v1/projects/${TASK_PROJECT.id}/members`) {
      const member = { userId: USER.id, email: USER.email, name: USER.name, role: 'OWNER' };
      return sendJson(res, 200, { data: [member] });
    }
    if (req.method === 'GET' && url.pathname === `/api/v1/projects/${TASK_PROJECT.id}/tasks`) {
      const meta = { page: 1, pageSize: 20, total: TASKS.length, totalPages: 1 };
      return sendJson(res, 200, { data: TASKS, meta });
    }
    return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
  return new Promise((resolveStart) => {
    server.listen(0, '127.0.0.1', () => resolveStart(server));
  });
}

function runBuild() {
  const result = spawnSync('pnpm --filter @team-task-tracker/frontend run build', {
    cwd: repoRoot,
    shell: true,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('Frontend build failed');
}

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`Server did not start: ${url}`);
}

function startPreview(backendUrl) {
  const requireFromFrontend = createRequire(resolve(frontendDir, 'package.json'));
  const viteBin = resolve(
    dirname(requireFromFrontend.resolve('vite/package.json')),
    'bin',
    'vite.js',
  );
  return spawn(
    process.execPath,
    [viteBin, 'preview', '--port', String(PREVIEW_PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: frontendDir, env: { ...process.env, BACKEND_URL: backendUrl }, stdio: 'ignore' },
  );
}

// Sets the session hint in the browser profile through the DevTools protocol, on an origin URL that
// does not load the app, so the audited page is still a cold load.
async function seedSessionHint(chromePort, origin) {
  const targets = await (await fetch(`http://127.0.0.1:${chromePort}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('No browser page available to seed the session');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    socket.onopen = r;
    socket.onerror = j;
  });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    pending.get(message.id)?.(message);
  };
  const call = (method, params) =>
    new Promise((r) => {
      nextId += 1;
      pending.set(nextId, r);
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  await call('Page.enable');
  await call('Page.navigate', { url: `${origin}/api/v1/lighthouse-seed` });
  await new Promise((r) => setTimeout(r, 500));
  await call('Runtime.evaluate', {
    expression: `localStorage.setItem(${JSON.stringify(SESSION_HINT_KEY)}, '1')`,
  });
  socket.close();
}

async function auditPage(chromePort, origin, { path, seedSession }) {
  if (seedSession) await seedSessionHint(chromePort, origin);
  const run = await lighthouse(
    `${origin}${path}`,
    {
      port: chromePort,
      output: 'json',
      logLevel: 'error',
      onlyCategories: CATEGORIES,
    },
    seedSession
      ? { extends: 'lighthouse:default', settings: { disableStorageReset: true } }
      : undefined,
  );
  const scores = {};
  for (const category of CATEGORIES)
    scores[category] = run?.lhr.categories[category]?.score ?? null;
  return { page: path, scores };
}

async function main() {
  const browser = findBrowser({
    env: process.env,
    candidates: BROWSER_CANDIDATES,
    exists: existsSync,
  });
  if (!browser) {
    console.error(missingBrowserMessage());
    return 1;
  }

  runBuild();
  const stub = await startStubApi();
  const preview = startPreview(`http://127.0.0.1:${stub.address().port}`);
  const origin = `http://127.0.0.1:${PREVIEW_PORT}`;
  let chrome;
  try {
    await waitForServer(origin);
    chrome = await launch({
      chromePath: browser,
      chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox'],
    });
    const results = [];
    for (const page of PAGES) results.push(await auditPage(chrome.port, origin, page));
    const { ok, report } = evaluateScores(results);
    console.log(report);
    return ok ? 0 : 1;
  } finally {
    await chrome?.kill();
    preview.kill();
    stub.close();
  }
}

process.exit(
  await main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }),
);
