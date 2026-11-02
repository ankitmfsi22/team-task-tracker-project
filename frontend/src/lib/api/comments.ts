import {
  CommentListResponseSchema,
  CommentResponseSchema,
  type CommentListResponse,
  type CommentResponse,
  type CreateCommentRequest,
  type UpdateCommentRequest,
} from '@team-task-tracker/shared';
import { z } from 'zod';
import { apiFetch } from './client';

const commentsPath = (projectId: string, taskId: string) =>
  `/api/v1/projects/${projectId}/tasks/${taskId}/comments`;

export function listComments(
  projectId: string,
  taskId: string,
  query: { page: number; pageSize: number },
): Promise<CommentListResponse> {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  }).toString();
  return apiFetch(`${commentsPath(projectId, taskId)}?${search}`, {
    schema: CommentListResponseSchema,
  });
}

export function createComment(
  projectId: string,
  taskId: string,
  body: CreateCommentRequest,
): Promise<CommentResponse> {
  return apiFetch(commentsPath(projectId, taskId), {
    method: 'POST',
    body,
    schema: CommentResponseSchema,
  });
}

export function updateComment(
  projectId: string,
  taskId: string,
  commentId: string,
  body: UpdateCommentRequest,
): Promise<CommentResponse> {
  return apiFetch(`${commentsPath(projectId, taskId)}/${commentId}`, {
    method: 'PATCH',
    body,
    schema: CommentResponseSchema,
  });
}

export function deleteComment(
  projectId: string,
  taskId: string,
  commentId: string,
): Promise<undefined> {
  return apiFetch(`${commentsPath(projectId, taskId)}/${commentId}`, {
    method: 'DELETE',
    schema: z.undefined(),
  });
}
