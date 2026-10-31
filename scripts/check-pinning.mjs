// Pinning check (DEV-1001): rejects version ranges, `latest`/`next` tags, floating Docker image
// tags and floating GitHub Actions refs. Usage: node scripts/check-pinning.mjs [rootDir]
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const SKIP_DIRS = new Set(['node_modules', '.git']);
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const EXACT_IMAGE_TAG = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.]+)*$/;
const EXACT_ACTION_REF = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
};

const isPackageJson = (file) =>
  file.endsWith('package.json') && /(^|[\\/])package\.json$/.test(file);
const isCompose = (file) => /(^|[\\/])(docker-)?compose(\.[\w-]+)?\.ya?ml$/.test(file);
const isWorkflow = (file) => /[\\/]\.github[\\/]workflows[\\/][^\\/]+\.ya?ml$/.test(file);

const stripYamlValue = (raw) =>
  raw
    .replace(/\s+#.*$/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

const checkPackageJson = (file, text, violations) => {
  const pkg = JSON.parse(text);
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (!EXACT_VERSION.test(spec)) {
        violations.push(`${file}: ${field}.${name} has non-exact version "${spec}"`);
      }
    }
  }
};

const checkCompose = (file, text, violations) => {
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*image:\s*(.+)$/.exec(line);
    if (!match) continue;
    const image = stripYamlValue(match[1]);
    const lastSegment = image.split('/').pop() ?? image;
    const tag = lastSegment.includes(':') ? lastSegment.split(':').pop() : undefined;
    if (tag === undefined || !EXACT_IMAGE_TAG.test(tag)) {
      violations.push(`${file}: image "${image}" is not pinned to an exact tag`);
    }
  }
};

const checkWorkflow = (file, text, violations) => {
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:-\s*)?uses:\s*(.+)$/.exec(line);
    if (!match) continue;
    const ref = stripYamlValue(match[1]);
    if (ref.startsWith('./') || ref.startsWith('docker://')) continue;
    const [action, version] = ref.split('@');
    if (version === undefined || !EXACT_ACTION_REF.test(version)) {
      violations.push(
        `${file}: action "${action}" ref "${version ?? ''}" is not an exact version tag`,
      );
    }
  }
};

export const checkPinning = (rootDir) => {
  const root = resolve(rootDir);
  const violations = [];
  for (const path of walk(root)) {
    const file = relative(root, path);
    if (isPackageJson(path)) checkPackageJson(file, readFileSync(path, 'utf8'), violations);
    else if (isCompose(path)) checkCompose(file, readFileSync(path, 'utf8'), violations);
    else if (isWorkflow(path)) checkWorkflow(file, readFileSync(path, 'utf8'), violations);
  }
  return violations;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const violations = checkPinning(process.argv[2] ?? defaultRoot);
  if (violations.length > 0) {
    console.error(`Pinning check failed (${violations.length}):`);
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }
  console.log('Pinning check passed.');
}
