# db-change-checker: task 2.1 (DEV-1006)

Reviewed: `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261031000000_init/migration.sql`. Result: no blocking findings.

| Severity     | Where               | Issue                                                                                               | Disposition                                           |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| non-blocking | schema.prisma:11,20 | `id` is `@db.Uuid` with a client-side `uuid()` default; no DB default for raw SQL inserts           | Accepted: Prisma convention, matches SDS UUID ids     |
| non-blocking | schema.prisma:24-25 | `expiresAt` not indexed                                                                             | Accepted: add with a purge job, not needed for auth   |
| non-blocking | schema.prisma:28    | revoke-all-for-user may want `(userId, revokedAt)`                                                  | Accepted: single-column index is enough at this scale |
| non-blocking | schema.prisma:12    | `email` uniqueness is case-sensitive in the DB; lowercasing is in the Zod schema                    | Accepted: service lowercases before lookup and create |
| non-blocking | schema.prisma:22    | `onDelete: Cascade` on `RefreshToken.userId`; later FKs should use Restrict (soft delete)           | Accepted: no user deletion in scope                   |
| info         | migration.sql       | Empty-database create: no data loss, no lock risk; lookup paths by email, tokenHash, userId indexed | None                                                  |

The migration was also applied with `prisma migrate deploy` to a throwaway Compose database (project `ttt-dev1006-mig`, removed afterwards); status was "Database schema is up to date". `prisma generate` and `migrate deploy` work under D-002, so `allowBuilds` is unchanged.
