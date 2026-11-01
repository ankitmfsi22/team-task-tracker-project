import type { RequestHandler } from 'express';
import {
  CommentListQuerySchema,
  type CommentParams,
  type CreateCommentRequest,
  type ProjectRole,
  type UpdateCommentRequest,
} from '@team-task-tracker/shared';
import type { CommentsService } from '../services/comments.service.js';

export function createCommentsController(
  service: CommentsService,
): Record<'create' | 'list' | 'update' | 'remove', RequestHandler> {
  return {
    create: async (req, res) => {
      const { projectId, taskId } = req.params as unknown as CommentParams;
      const { body } = req.body as CreateCommentRequest;
      const comment = await service.create(projectId, taskId, res.locals['userId'] as string, body);
      res.status(201).json(comment);
    },
    list: async (req, res) => {
      // validate only checks req.query, so the typed query with defaults is parsed here.
      const query = CommentListQuerySchema.parse(req.query);
      const { projectId, taskId } = req.params as unknown as CommentParams;
      res.status(200).json(await service.list(projectId, taskId, query));
    },
    update: async (req, res) => {
      const { projectId, taskId, commentId } = req.params as unknown as CommentParams;
      const { body } = req.body as UpdateCommentRequest;
      const userId = res.locals['userId'] as string;
      res.status(200).json(await service.update(projectId, taskId, commentId, userId, body));
    },
    remove: async (req, res) => {
      const { projectId, taskId, commentId } = req.params as unknown as CommentParams;
      const { role } = res.locals['membership'] as { role: ProjectRole };
      await service.remove(projectId, taskId, commentId, res.locals['userId'] as string, role);
      res.status(204).end();
    },
  };
}
