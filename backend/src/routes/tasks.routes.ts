import { Router } from 'express';
import {
  CreateTaskRequestSchema,
  ProjectIdParamsSchema,
  TaskParamsSchema,
} from '@team-task-tracker/shared';
import { createTasksController } from '../controllers/tasks.controller.js';
import type { PrismaClient } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { projectAccess } from '../middleware/project-access.js';
import { validate } from '../middleware/validate.js';
import type { TasksService } from '../services/tasks.service.js';
import type { TokenSecrets } from '../services/token.service.js';

// Mounted at /projects/:projectId/tasks.
export function createTasksRouter(
  service: TasksService,
  prisma: PrismaClient,
  secrets: TokenSecrets,
): Router {
  const controller = createTasksController(service);
  const router = Router({ mergeParams: true });
  const auth = authenticate(secrets);
  router.post(
    '/',
    auth,
    validate({ params: ProjectIdParamsSchema, body: CreateTaskRequestSchema }),
    projectAccess(prisma, { write: true }),
    controller.create,
  );
  router.get(
    '/:taskId',
    auth,
    validate({ params: TaskParamsSchema }),
    projectAccess(prisma),
    controller.get,
  );
  return router;
}
