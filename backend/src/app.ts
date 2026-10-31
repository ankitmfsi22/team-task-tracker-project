import cookieParser from 'cookie-parser';
import express, { type Express, type Router } from 'express';
import { buildOpenApiDocument } from '@team-task-tracker/shared';
import type { AppConfig } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export interface AppOptions {
  // Registers extra routes under /api/v1, before the 404 handler.
  extraRoutes?: (router: Router) => void;
}

export function createApp(_config: AppConfig, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());

  const api = express.Router();
  api.get('/openapi.json', (_req, res) => {
    res.json(buildOpenApiDocument());
  });
  options.extraRoutes?.(api);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
