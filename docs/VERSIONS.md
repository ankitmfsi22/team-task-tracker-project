# Pinned versions

Source of truth for every runtime, tool, library and image in the tech stack (DEV-1001). All versions are exact; a
floating version, range or `latest` tag is a defect. `scripts/check-pinning.mjs` (part of `pnpm lint`) rejects
floating versions, and `scripts/tests/versions-doc.test.mjs` fails if this table drifts from the manifests.

Registry and image tags were checked against the npm registry, GitHub and Docker Hub on 2026-10-31.

| Component          | Version               | Where pinned                                 |
| ------------------ | --------------------- | -------------------------------------------- |
| Node.js            | 22.23.3               | `.nvmrc` (`engines.node` is `22`)            |
| pnpm               | 12.11.2               | `package.json` `packageManager`              |
| TypeScript         | 6.0.3                 | `backend`, `frontend`, `packages/shared`     |
| ESLint             | 10.14.0               | root `package.json`                          |
| typescript-eslint  | 8.72.1                | root `package.json`                          |
| Prettier           | 3.9.10                | root `package.json`                          |
| Husky              | 9.1.7                 | root `package.json`                          |
| lint-staged        | 17.6.0                | root `package.json`                          |
| Vitest             | 5.0.5                 | `backend`, `frontend`, `packages/shared`     |
| Prisma             | 7.10.1                | `backend/package.json`                       |
| @prisma/client     | 7.10.1                | `backend/package.json`                       |
| @prisma/adapter-pg | 7.10.1                | `backend/package.json`                       |
| Zod                | 4.6.7                 | `packages/shared/package.json`               |
| @types/node        | 22.20.5               | `backend`, `frontend`, `packages/shared`     |
| OpenSpec CLI       | 1.16.0                | root `package.json` (`@fission-ai/openspec`) |
| PostgreSQL image   | postgres:16.15-alpine | `docker-compose.yml`                         |
| actions/checkout   | v7.0.1                | `.github/workflows/ci.yml`                   |
| actions/setup-node | v7.1.0                | `.github/workflows/ci.yml`                   |
| pnpm/action-setup  | v6.1.0                | `.github/workflows/ci.yml`                   |
| GitHub runner      | ubuntu-24.04          | `.github/workflows/ci.yml`                   |

## Prisma version rationale

Prisma 7.10.1 is pinned, the newest stable 7.x release. On 2026-10-31 the `latest` dist-tag of the `prisma` CLI
package pointed at `8.0.0-rc.29`, a release candidate (`@prisma/client` `latest` was `7.10.1`). A release candidate is
not acceptable for a pinned baseline, and Prisma 6 is older with no benefit, so the stable 7 line is used. Prisma 7
reads the connection string through `prisma.config.ts` from the `DATABASE_URL` environment variable, which matches
the rule that no default secret exists. Re-check when Prisma 8 reaches a stable release.

## TypeScript and ESLint supported ranges

TypeScript 7.0.2 and ESLint 10.14.0 were `latest` on 2026-10-31. TypeScript is held at 6.0.3 because
typescript-eslint 8.72.1 declares these peer ranges:

- `typescript`: `>=4.8.4 <6.1.0`
- `eslint`: `^8.57.0 || ^9.0.0 || ^10.0.0`

The pinned TypeScript 6.0.3 and ESLint 10.14.0 are inside both ranges, and the test above checks this against the
installed typescript-eslint package.

## Install scripts and release-age exceptions

- Install scripts are denied for `prisma` and `@prisma/engines` (`allowBuilds` in `pnpm-workspace.yaml`); validate and
  `db execute` work without them.
- `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` lists `eslint@10.14.0` and `@fission-ai/openspec@1.16.0`, which
  were newer than pnpm's default release-age policy when installed.
