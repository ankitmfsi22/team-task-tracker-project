import { Router } from 'express';
import {
  AddMemberRequestSchema,
  CreateProjectRequestSchema,
  MemberParamsSchema,
  ProjectIdParamsSchema,
  ProjectListQuerySchema,
  UpdateProjectRequestSchema,
} from '@team-task-tracker/shared';
import { createProjectsController } from '../controllers/projects.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { projectAccess } from '../middleware/project-access.js';
import { validate } from '../middleware/validate.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { ProjectsService } from '../services/projects.service.js';
import type { TokenSecrets } from '../services/token.service.js';

export function createProjectsRouter(
  service: ProjectsService,
  prisma: PrismaClient,
  secrets: TokenSecrets,
): Router {
  const controller = createProjectsController(service);
  const router = Router();
  const params = validate({ params: ProjectIdParamsSchema });
  router.use(authenticate(secrets));
  router.post('/', validate({ body: CreateProjectRequestSchema }), controller.create);
  router.get('/', validate({ query: ProjectListQuerySchema }), controller.list);
  router.get('/:projectId', params, projectAccess(prisma), controller.get);
  router.patch(
    '/:projectId',
    params,
    validate({ body: UpdateProjectRequestSchema }),
    projectAccess(prisma, { roles: ['OWNER'], write: true }),
    controller.update,
  );
  router.post(
    '/:projectId/archive',
    params,
    projectAccess(prisma, { roles: ['OWNER'], write: true }),
    controller.archive,
  );
  router.get('/:projectId/members', params, projectAccess(prisma), controller.listMembers);
  router.post(
    '/:projectId/members',
    params,
    validate({ body: AddMemberRequestSchema }),
    projectAccess(prisma, { roles: ['OWNER'], write: true }),
    controller.addMember,
  );
  router.delete(
    '/:projectId/members/:userId',
    validate({ params: MemberParamsSchema }),
    projectAccess(prisma, { roles: ['OWNER'], write: true }),
    controller.removeMember,
  );
  return router;
}
