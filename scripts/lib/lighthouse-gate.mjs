// Pure helpers for scripts/lighthouse.mjs: score evaluation and browser lookup (DEV-1011).
export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const toPercent = (score) => (typeof score === 'number' ? Math.round(score * 100) : 0);

// results: [{ page, scores: { performance, accessibility, 'best-practices', seo } }], scores are 0..1.
export function evaluateScores(results, threshold = 95) {
  const failures = [];
  const lines = [];
  for (const { page, scores } of results) {
    lines.push(page);
    for (const category of CATEGORIES) {
      const score = toPercent(scores[category]);
      const passed = score >= threshold;
      if (!passed) failures.push({ page, category, score });
      lines.push(
        `  ${category.padEnd(15)} ${String(score).padStart(3)} ${passed ? 'ok' : `FAIL (< ${threshold})`}`,
      );
    }
  }
  for (const { page, category, score } of failures) {
    lines.push(`Below ${threshold}: ${page} ${category} = ${score}`);
  }
  return { ok: failures.length === 0, failures, report: lines.join('\n') };
}

export function findBrowser({ env, candidates, exists }) {
  if (env.CHROME_PATH && exists(env.CHROME_PATH)) return env.CHROME_PATH;
  return candidates.find((candidate) => exists(candidate)) ?? null;
}

export function missingBrowserMessage() {
  return [
    'No Chrome or Edge installation was found, so Lighthouse cannot run.',
    'Install Google Chrome or Microsoft Edge, or set CHROME_PATH to the browser executable.',
  ].join('\n');
}
