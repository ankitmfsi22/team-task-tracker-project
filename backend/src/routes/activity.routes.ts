import { Router } from 'express';
import { ActivityListQuerySchema, ActivityParamsSchema } from '@team-task-tracker/shared';
import { createActivityController } from '../controllers/activity.controller.js';
import type { PrismaClient } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { projectAccess } from '../middleware/project-access.js';
import { validate } from '../middleware/validate.js';
import type { ActivityService } from '../services/activity.service.js';
import type { TokenSecrets } from '../services/token.service.js';

// Mounted at /projects/:projectId/tasks/:taskId. Read-only: there is no route that writes activity.
export function createActivityRouter(
  service: ActivityService,
  prisma: PrismaClient,
  secrets: TokenSecrets,
): Router {
  const controller = createActivityController(service);
  const router = Router({ mergeParams: true });
  router.get(
    '/activity',
    authenticate(secrets),
    validate({ params: ActivityParamsSchema, query: ActivityListQuerySchema }),
    projectAccess(prisma),
    controller.list,
  );
  return router;
}
