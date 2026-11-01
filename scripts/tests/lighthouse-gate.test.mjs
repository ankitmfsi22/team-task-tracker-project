// Spec: web-platform / "Lighthouse gate on the production build" and
// workspace-quality-gates / "Lighthouse is a real gate" (DEV-1011 task 1.4).
// Pure-function tests of scripts/lib/lighthouse-gate.mjs; no browser is launched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateScores,
  findBrowser,
  medianScores,
  missingBrowserMessage,
} from '../lib/lighthouse-gate.mjs';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const scores = (overrides = {}) => ({
  performance: 0.98,
  accessibility: 1,
  'best-practices': 0.96,
  seo: 0.95,
  ...overrides,
});

test('all categories >= 95 on every page: ok, no failures, report lists pages and categories', () => {
  const result = evaluateScores([
    { page: '/login', scores: scores() },
    { page: '/projects', scores: scores() },
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  for (const page of ['/login', '/projects']) {
    assert.ok(result.report.includes(page), `report missing ${page}`);
  }
  for (const c of CATEGORIES) {
    assert.ok(result.report.includes(c), `report missing ${c}`);
  }
});

test('a category below 95 fails the gate and names page and category', () => {
  const result = evaluateScores([
    { page: '/login', scores: scores() },
    { page: '/projects', scores: scores({ performance: 0.9 }) },
  ]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, [{ page: '/projects', category: 'performance', score: 90 }]);
  assert.ok(result.report.includes('/projects'));
  assert.ok(result.report.includes('performance'));
});

test('threshold edges: 0.95 and 0.949 pass, 0.944 fails', () => {
  const pass = evaluateScores([{ page: '/a', scores: scores({ seo: 0.95, performance: 0.949 }) }]);
  assert.equal(pass.ok, true);
  assert.deepEqual(pass.failures, []);

  const fail = evaluateScores([{ page: '/a', scores: scores({ seo: 0.944 }) }]);
  assert.equal(fail.ok, false);
  assert.deepEqual(fail.failures, [{ page: '/a', category: 'seo', score: 94 }]);
});

test('a null score counts as a failure with score 0', () => {
  const result = evaluateScores([{ page: '/login', scores: scores({ accessibility: null }) }]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, [{ page: '/login', category: 'accessibility', score: 0 }]);
});

test('no browser found: findBrowser returns null and the message mentions CHROME_PATH', () => {
  const found = findBrowser({ env: {}, candidates: ['/a/chrome', '/b/edge'], exists: () => false });
  assert.equal(found, null);
  const msg = missingBrowserMessage();
  assert.equal(typeof msg, 'string');
  assert.ok(msg.includes('CHROME_PATH'));
  assert.match(msg, /Chrome|Edge/);
});

test('CHROME_PATH set and existing wins over candidates', () => {
  const found = findBrowser({
    env: { CHROME_PATH: '/custom/chrome' },
    candidates: ['/a/chrome'],
    exists: () => true,
  });
  assert.equal(found, '/custom/chrome');
});

test('first existing candidate is used when CHROME_PATH is unset', () => {
  const found = findBrowser({
    env: {},
    candidates: ['/a/chrome', '/b/edge', '/c/chromium'],
    exists: (p) => p !== '/a/chrome',
  });
  assert.equal(found, '/b/edge');
});

test('medianScores takes the per-category median of the runs and counts null as 0', () => {
  const median = medianScores([
    scores({ performance: 0.5, seo: 1 }),
    scores({ performance: 0.97, seo: 1 }),
    scores({ performance: 0.99, seo: null }),
  ]);
  assert.equal(median.performance, 0.97);
  assert.equal(median.seo, 1);
  assert.equal(median.accessibility, 1);
});

test('medianScores of an even number of runs uses the lower middle score, never the higher', () => {
  const median = medianScores([scores({ performance: 0.9 }), scores({ performance: 1 })]);
  assert.equal(median.performance, 0.9);
});
