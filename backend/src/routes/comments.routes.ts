import { Router } from 'express';
import {
  ActivityParamsSchema,
  CommentListQuerySchema,
  CommentParamsSchema,
  CreateCommentRequestSchema,
  UpdateCommentRequestSchema,
} from '@team-task-tracker/shared';
import { createCommentsController } from '../controllers/comments.controller.js';
import type { PrismaClient } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { projectAccess } from '../middleware/project-access.js';
import { validate } from '../middleware/validate.js';
import type { CommentsService } from '../services/comments.service.js';
import type { TokenSecrets } from '../services/token.service.js';

// Mounted at /projects/:projectId/tasks/:taskId.
export function createCommentsRouter(
  service: CommentsService,
  prisma: PrismaClient,
  secrets: TokenSecrets,
): Router {
  const controller = createCommentsController(service);
  const router = Router({ mergeParams: true });
  const auth = authenticate(secrets);
  router.post(
    '/comments',
    auth,
    validate({ params: ActivityParamsSchema, body: CreateCommentRequestSchema }),
    projectAccess(prisma, { write: true }),
    controller.create,
  );
  router.get(
    '/comments',
    auth,
    validate({ params: ActivityParamsSchema, query: CommentListQuerySchema }),
    projectAccess(prisma),
    controller.list,
  );
  router.patch(
    '/comments/:commentId',
    auth,
    validate({ params: CommentParamsSchema, body: UpdateCommentRequestSchema }),
    projectAccess(prisma, { write: true }),
    controller.update,
  );
  router.delete(
    '/comments/:commentId',
    auth,
    validate({ params: CommentParamsSchema }),
    projectAccess(prisma, { write: true }),
    controller.remove,
  );
  return router;
}
