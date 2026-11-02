// Pinning check (DEV-1001): rejects version ranges, `latest`/`next` tags, floating Docker image
// tags (compose files and Dockerfiles) and GitHub Actions not pinned to a commit SHA. Usage: node scripts/check-pinning.mjs [rootDir]
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const SKIP_DIRS = new Set(['node_modules', '.git']);
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const EXACT_IMAGE_TAG = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.]+)*$/;
// In-repo workspace links are pinned by the workspace itself (DEV-1006).
const WORKSPACE_LINK = /^workspace:\*$/;
// Actions are pinned to an immutable full commit SHA (DEV-1018, D-009); the version goes in a comment.
const ACTION_SHA_REF = /^[0-9a-f]{40}$/;

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
const isDockerfile = (file) => /(^|[\\/])Dockerfile(\.[\w-]+)?$/.test(file);
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
      if (!EXACT_VERSION.test(spec) && !WORKSPACE_LINK.test(spec)) {
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

const checkDockerfile = (file, text, violations) => {
  const stages = new Set();
  for (const line of text.replace(/\\\r?\n/g, ' ').split(/\r?\n/)) {
    const match = /^\s*FROM\s+(?:--\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i.exec(line);
    if (!match) continue;
    const image = match[1];
    if (image !== 'scratch' && !stages.has(image)) {
      const lastSegment = image.split('@')[0].split('/').pop() ?? image;
      const tag = lastSegment.includes(':') ? lastSegment.split(':').pop() : undefined;
      if (tag === undefined || !EXACT_IMAGE_TAG.test(tag)) {
        violations.push(`${file}: image "${image}" is not pinned to an exact tag`);
      }
    }
    if (match[2]) stages.add(match[2]);
  }
};

const checkWorkflow = (file, text, violations) => {
  for (const line of text.split(/\r?\n/)) {
    const runsOn = /^\s*runs-on:\s*(.+)$/.exec(line);
    if (runsOn) {
      for (const label of stripYamlValue(runsOn[1]).split(/[\s,[\]'"]+/)) {
        if (/-latest$/.test(label)) {
          violations.push(`${file}: runner label "${label}" is floating; use an exact image label`);
        }
      }
      continue;
    }
    const match = /^\s*(?:-\s*)?uses:\s*(.+)$/.exec(line);
    if (!match) continue;
    const ref = stripYamlValue(match[1]);
    if (ref.startsWith('./') || ref.startsWith('docker://')) continue;
    const [action, version] = ref.split('@');
    if (version === undefined || !ACTION_SHA_REF.test(version)) {
      violations.push(
        `${file}: action "${action}" ref "${version ?? ''}" is not a full commit SHA`,
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
    else if (isDockerfile(path)) checkDockerfile(file, readFileSync(path, 'utf8'), violations);
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
