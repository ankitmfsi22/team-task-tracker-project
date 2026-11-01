import { Router } from 'express';
import {
  AssignTaskRequestSchema,
  ChangeTaskStatusRequestSchema,
  CreateTaskRequestSchema,
  ProjectIdParamsSchema,
  TaskListQuerySchema,
  TaskParamsSchema,
  UpdateTaskRequestSchema,
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
    '/',
    auth,
    validate({ params: ProjectIdParamsSchema, query: TaskListQuerySchema }),
    projectAccess(prisma),
    controller.list,
  );
  router.get(
    '/:taskId',
    auth,
    validate({ params: TaskParamsSchema }),
    projectAccess(prisma),
    controller.get,
  );
  router.patch(
    '/:taskId',
    auth,
    validate({ params: TaskParamsSchema, body: UpdateTaskRequestSchema }),
    projectAccess(prisma, { write: true }),
    controller.update,
  );
  router.post(
    '/:taskId/status',
    auth,
    validate({ params: TaskParamsSchema, body: ChangeTaskStatusRequestSchema }),
    projectAccess(prisma, { write: true }),
    controller.changeStatus,
  );
  router.put(
    '/:taskId/assignee',
    auth,
    validate({ params: TaskParamsSchema, body: AssignTaskRequestSchema }),
    projectAccess(prisma, { write: true }),
    controller.assign,
  );
  router.post(
    '/:taskId/archive',
    auth,
    validate({ params: TaskParamsSchema }),
    projectAccess(prisma, { write: true }),
    controller.archive,
  );
  return router;
}
