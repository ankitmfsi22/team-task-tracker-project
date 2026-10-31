// Generates the Prisma client. `prisma generate` needs DATABASE_URL to be set because
// prisma.config.ts reads it, but generating never connects, so a placeholder is used when it is unset.
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
};
const r = spawnSync('pnpm exec prisma generate', { env, shell: true, stdio: 'inherit' });
process.exit(r.status ?? 1);
