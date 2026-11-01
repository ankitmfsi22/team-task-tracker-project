import { z } from 'zod';
import { PaginationMetaSchema, PaginationQuerySchema } from './common.js';

// Trimmed, 1 to 2000 characters (FRS section 5).
const CommentBodySchema = z.string().trim().min(1).max(2000);

export const CreateCommentRequestSchema = z.strictObject({ body: CommentBodySchema });

export const UpdateCommentRequestSchema = z.strictObject({ body: CommentBodySchema });

export const CommentParamsSchema = z.object({
  projectId: z.uuid(),
  taskId: z.uuid(),
  commentId: z.uuid(),
});

export const CommentListQuerySchema = PaginationQuerySchema.strict();

export const CommentResponseSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  body: z.string(),
  author: z.object({ id: z.uuid(), name: z.string() }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CommentListResponseSchema = z.object({
  data: z.array(CommentResponseSchema),
  meta: PaginationMetaSchema,
});

export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;
export type UpdateCommentRequest = z.infer<typeof UpdateCommentRequestSchema>;
export type CommentParams = z.infer<typeof CommentParamsSchema>;
export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
export type CommentListResponse = z.infer<typeof CommentListResponseSchema>;
