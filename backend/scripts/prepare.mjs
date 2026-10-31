// Prepares the backend for build, typecheck and test: builds packages/shared (consumed through its
// dist output) and generates the Prisma client. `prisma generate` needs DATABASE_URL because
// prisma.config.ts reads it, but generating never connects, so a placeholder is used when unset.
import { spawnSync } from 'node:child_process';

const placeholderUrl = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? placeholderUrl };

for (const command of [
  'pnpm --filter @team-task-tracker/shared run build',
  'pnpm exec prisma generate',
]) {
  const r = spawnSync(command, { env, shell: true, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
