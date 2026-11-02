# Build context is the repository root (see docker-compose.yml). No secrets are used at build time.
FROM node:22.23.3-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @team-task-tracker/frontend...
COPY packages/shared packages/shared
COPY frontend frontend
RUN pnpm --filter @team-task-tracker/frontend run build

# Static files served by nginx (non-root, port 8080); /api/ is proxied to the backend on the same origin.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080
