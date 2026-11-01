import cookieParser from 'cookie-parser';
import express, { type Express, type Router } from 'express';
import { buildOpenApiDocument } from '@team-task-tracker/shared';
import type { AppConfig } from './config.js';
import { createPrismaClient, type PrismaClient } from './db.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createCommentsRouter } from './routes/comments.routes.js';
import { createProjectsRouter } from './routes/projects.routes.js';
import { createTasksRouter } from './routes/tasks.routes.js';
import { AuthService } from './services/auth.service.js';
import { CommentsService } from './services/comments.service.js';
import { ProjectsService } from './services/projects.service.js';
import { TasksService } from './services/tasks.service.js';

export interface AppOptions {
  // Registers extra routes under /api/v1, before the 404 handler.
  extraRoutes?: (router: Router) => void;
  // Defaults to a client for config.databaseUrl (created lazily; Prisma connects on first query).
  prisma?: PrismaClient;
}

export function createApp(config: AppConfig, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());

  const prisma = options.prisma ?? createPrismaClient(config.databaseUrl);
  const authService = new AuthService(prisma, config);

  const api = express.Router();
  api.get('/openapi.json', (_req, res) => {
    res.json(buildOpenApiDocument());
  });
  api.use('/auth', createAuthRouter(authService, config));
  api.use('/projects', createProjectsRouter(new ProjectsService(prisma), prisma, config));
  api.use(
    '/projects/:projectId/tasks',
    createTasksRouter(new TasksService(prisma), prisma, config),
  );
  api.use(
    '/projects/:projectId/tasks/:taskId',
    createCommentsRouter(new CommentsService(prisma), prisma, config),
  );
  options.extraRoutes?.(api);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
