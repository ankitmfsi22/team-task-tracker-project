# Build context is the repository root (see docker-compose.yml). No secrets are used at build time.
FROM node:22.23.3-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

# Full dependencies and compiled output. Also the `migrate` target: the Prisma CLI is a dev dependency.
FROM base AS build
# The Prisma schema engine needs OpenSSL, which the slim image does not ship.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @team-task-tracker/backend...
COPY packages/shared packages/shared
COPY backend backend
RUN pnpm --filter @team-task-tracker/backend run build
# Fetch the Prisma schema engine now (as root) so the non-root migrate container needs no download.
RUN cd backend && DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder pnpm exec prisma --version
RUN chown -R node:node /app
WORKDIR /app/backend

FROM build AS migrate
USER node
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/seed-main.js"]

# Production dependencies and compiled output only.
FROM base AS runtime
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --ignore-scripts --prod --filter @team-task-tracker/backend...
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/backend/dist backend/dist
WORKDIR /app/backend
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
